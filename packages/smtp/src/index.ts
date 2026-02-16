/**
 * CodeMail SMTP Ingress Server.
 * Receives inbound email via SMTP protocol:
 * 1. Validates recipient mailbox exists in Convex
 * 2. Parses email content with mailparser
 * 3. Evaluates spam (blocklist + AI)
 * 4. Stores message in Convex
 * 5. Handles attachments (inline or offload to storage)
 */

import { SMTPServer, type SMTPServerOptions } from 'smtp-server';
import type { SMTPServerAddress, SMTPServerSession } from 'smtp-server';
import { simpleParser } from 'mailparser';
import type { ParsedMail, Attachment } from 'mailparser';
import * as fs from 'fs';
import type { Readable } from 'stream';

import { loadConfig, type Config } from './config.js';
import { logger, setLogLevel } from './logger.js';
import { evaluateSpam } from './spam.js';
import {
  ConvexClient,
  parseAddress,
  parseSingleAddress,
  type MessageInput,
} from './convex.js';

/** Session data stored during SMTP transaction. */
interface SessionData {
  /** Domain ID for the first recipient. */
  domainId?: string;
  /** Mailbox ID for the first recipient. */
  mailboxId?: string;
  /** Domain configuration. */
  domain?: {
    config: {
      spamThreshold: number;
      largeFileStrategy: 'store' | 'bounce' | 'byo';
      maxAttachmentSize: number;
    };
  };
  /** Validated recipients for this session. */
  recipients: Array<{
    address: string;
    domainId: string;
    mailboxId: string;
  }>;
}

// Extend session type to include our data
declare module 'smtp-server' {
  interface SMTPServerSession {
    data?: SessionData;
  }
}

/** Server configuration. */
let config: Config;
/** Convex client instance. */
let convex: ConvexClient;

/**
 * Handles RCPT TO command - validates that recipient mailbox exists.
 * @param address - The recipient address from SMTP.
 * @param session - The SMTP session.
 * @param callback - Callback to signal success/failure.
 */
async function onRcptTo(
  address: SMTPServerAddress,
  session: SMTPServerSession,
  callback: (err?: Error | null) => void
): Promise<void> {
  const recipient = address.address.toLowerCase();
  
  logger.info('RCPT TO', { recipient, sessionId: session.id });

  try {
    const result = await convex.validateRecipient(recipient);
    
    if (!result.valid) {
      logger.warn('Recipient not found', { recipient });
      callback(new Error('550 5.1.1 User not found'));
      return;
    }

    // Initialize session data if needed
    if (!session.data) {
      session.data = { recipients: [] };
    }

    // Store validated recipient info
    session.data.recipients.push({
      address: recipient,
      domainId: result.domainId!,
      mailboxId: result.mailboxId!,
    });
    
    // Store domain info (use first recipient's domain for config)
    if (!session.data.domain && result.domain) {
      session.data.domain = result.domain;
    }

    logger.debug('Recipient validated', {
      recipient,
      domainId: result.domainId,
      mailboxId: result.mailboxId,
    });

    callback();
  } catch (error) {
    logger.error('Error validating recipient', { recipient, error });
    callback(new Error('451 4.3.0 Temporary error, try again later'));
  }
}

/**
 * Processes attachments - stores small ones inline, handles large ones per strategy.
 * @param attachments - Array of attachments from parsed email.
 * @param domainId - Domain ID for storage context.
 * @param maxInlineSize - Maximum size for inline storage.
 * @param strategy - Strategy for large files (store, bounce, byo).
 * @returns Array of processed attachment metadata.
 */
async function processAttachments(
  attachments: Attachment[],
  domainId: string,
  maxInlineSize: number,
  strategy: 'store' | 'bounce' | 'byo'
): Promise<MessageInput['attachments']> {
  const processed: MessageInput['attachments'] = [];

  for (const attachment of attachments) {
    const size = attachment.size || attachment.content?.length || 0;
    
    if (size <= maxInlineSize) {
      // Small attachment - upload to storage
      try {
        const storageId = await convex.uploadAttachment(attachment, domainId);
        processed.push({
          filename: attachment.filename || 'attachment',
          contentType: attachment.contentType || 'application/octet-stream',
          size,
          storageId,
        });
      } catch (error) {
        logger.error('Failed to upload attachment', { filename: attachment.filename, error });
        // Continue without this attachment
      }
    } else {
      // Large attachment
      switch (strategy) {
        case 'store':
          // Upload to storage anyway
          try {
            const storageId = await convex.uploadAttachment(attachment, domainId);
            processed.push({
              filename: attachment.filename || 'attachment',
              contentType: attachment.contentType || 'application/octet-stream',
              size,
              storageId,
            });
          } catch (error) {
            logger.error('Failed to upload large attachment', { filename: attachment.filename, error });
          }
          break;
        
        case 'bounce':
          // Skip large attachments
          logger.warn('Skipping large attachment (bounce strategy)', {
            filename: attachment.filename,
            size,
          });
          break;
        
        case 'byo':
          // Customer handles their own storage - just record metadata
          processed.push({
            filename: attachment.filename || 'attachment',
            contentType: attachment.contentType || 'application/octet-stream',
            size,
            externalUrl: undefined, // Customer would handle this
          });
          break;
      }
    }
  }

  return processed;
}

/**
 * Handles DATA command - receives and processes the email content.
 * @param stream - The email data stream.
 * @param session - The SMTP session.
 * @param callback - Callback to signal success/failure.
 */
async function onData(
  stream: Readable,
  session: SMTPServerSession,
  callback: (err?: Error | null) => void
): Promise<void> {
  logger.info('Receiving message data', { sessionId: session.id });

  try {
    // Parse the email
    const parsed: ParsedMail = await simpleParser(stream as Readable);
    
    logger.debug('Email parsed', {
      messageId: parsed.messageId,
      from: parsed.from?.text,
      subject: parsed.subject,
      attachmentCount: parsed.attachments?.length || 0,
    });

    // Get session data
    const sessionData = session.data;
    if (!sessionData || sessionData.recipients.length === 0) {
      callback(new Error('503 5.5.1 No valid recipients'));
      return;
    }

    // Get from address
    const fromAddr = parseSingleAddress(parsed.from);
    if (!fromAddr) {
      callback(new Error('550 5.1.7 Invalid sender'));
      return;
    }

    // Evaluate spam
    const spamResult = await evaluateSpam(
      {
        from: fromAddr.address,
        to: sessionData.recipients.map((r) => r.address),
        subject: parsed.subject || '',
        bodyText: parsed.text,
        bodyHtml: parsed.html || undefined,
      },
      config
    );

    // Check if spam score exceeds threshold
    const spamThreshold = sessionData.domain?.config.spamThreshold ?? 50;
    const shouldReject = spamResult.isSpam && spamResult.score >= spamThreshold;

    if (shouldReject) {
      logger.info('Message rejected as spam', {
        from: fromAddr.address,
        score: spamResult.score,
        reason: spamResult.reason,
      });
      callback(new Error('550 5.7.1 Message rejected as spam'));
      return;
    }

    // Process each recipient
    for (const recipient of sessionData.recipients) {
      try {
        // Process attachments
        const attachments = await processAttachments(
          parsed.attachments || [],
          recipient.domainId,
          sessionData.domain?.config.maxAttachmentSize || 1024 * 1024,
          sessionData.domain?.config.largeFileStrategy || 'bounce'
        );

        // Build message input
        const messageInput: MessageInput = {
          domainId: recipient.domainId,
          mailboxId: recipient.mailboxId,
          messageId: parsed.messageId || `<${Date.now()}.${Math.random().toString(36)}@codemail.dev>`,
          inReplyTo: parsed.inReplyTo?.toString(),
          references: parsed.references
            ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references])
            : undefined,
          from: fromAddr,
          to: parseAddress(parsed.to),
          cc: parseAddress(parsed.cc),
          replyTo: parseSingleAddress(parsed.replyTo),
          subject: parsed.subject || '(no subject)',
          bodyText: parsed.text,
          bodyHtml: parsed.html || undefined,
          attachments,
          date: parsed.date?.getTime() || Date.now(),
          isSpam: spamResult.isSpam,
          spamScore: spamResult.score,
          spamReason: spamResult.reason,
        };

        // Store in Convex
        const storedMessageId = await convex.storeMessage(messageInput);
        
        logger.info('Message stored', {
          recipient: recipient.address,
          messageId: messageInput.messageId,
          storedId: storedMessageId,
          isSpam: spamResult.isSpam,
        });

        // Log spam evaluation
        await convex.logSpamEvaluation(storedMessageId, spamResult);
      } catch (error) {
        logger.error('Failed to process message for recipient', {
          recipient: recipient.address,
          error,
        });
        // Continue with other recipients
      }
    }

    callback();
  } catch (error) {
    logger.error('Error processing message', { error });
    callback(new Error('451 4.3.0 Error processing message'));
  }
}

/**
 * Creates and configures the SMTP server.
 * @returns The configured SMTP server instance.
 */
function createServer(): SMTPServer {
  const serverOptions: SMTPServerOptions = {
    // Server identification
    name: 'codemail-smtp',
    banner: 'CodeMail SMTP Ingress',
    
    // Size limit
    size: config.maxMessageSize,
    
    // Timeouts
    socketTimeout: config.connectionTimeout,
    closeTimeout: 30000,
    
    // Authentication (optional for inbound)
    authOptional: true,
    disabledCommands: ['AUTH'],
    
    // Handlers
    onRcptTo,
    onData,
    
    // Connection handler
    onConnect(session, callback) {
      logger.info('New connection', {
        sessionId: session.id,
        remoteAddress: session.remoteAddress,
      });
      callback();
    },
    
    // Close handler
    onClose(session) {
      logger.debug('Connection closed', { sessionId: session.id });
    },
    
    // Logging
    logger: config.logLevel === 'debug',
  };

  // Add TLS if configured
  if (config.secure && config.tlsKeyPath && config.tlsCertPath) {
    serverOptions.secure = true;
    serverOptions.key = fs.readFileSync(config.tlsKeyPath);
    serverOptions.cert = fs.readFileSync(config.tlsCertPath);
  }

  const server = new SMTPServer(serverOptions);
  
  // Error handler
  server.on('error', (err: Error) => {
    logger.error('SMTP server error', { error: err.message });
  });

  return server;
}

/**
 * Main entry point - starts the SMTP server.
 */
async function main(): Promise<void> {
  console.log('[SMTP] Starting main()...');
  
  // Load configuration
  console.log('[SMTP] Loading config...');
  config = loadConfig();
  console.log('[SMTP] Config loaded, setting log level...');
  setLogLevel(config.logLevel);
  
  logger.info('Starting CodeMail SMTP server', {
    port: config.port,
    host: config.host,
    secure: config.secure,
  });

  // Initialize Convex client
  console.log('[SMTP] Initializing Convex client...');
  convex = new ConvexClient(config);
  console.log('[SMTP] Convex client initialized');

  // Create and start server
  const server = createServer();

  server.listen(config.port, config.host, () => {
    logger.info('SMTP server listening', {
      port: config.port,
      host: config.host,
    });
  });

  // Graceful shutdown
  const shutdown = (): void => {
    logger.info('Shutting down SMTP server...');
    server.close(() => {
      logger.info('SMTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Run
main().catch((error) => {
  // Error objects don't serialize to JSON properly
  const errorDetails = error instanceof Error 
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;
  logger.error('Fatal error', { error: errorDetails });
  console.error('Fatal error:', error);
  process.exit(1);
});
