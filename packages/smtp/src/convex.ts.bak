/**
 * Convex API Client.
 * Communicates with Convex backend via HTTP actions.
 */

import type { Config } from './config.js';
import { logger } from './logger.js';
import type { SpamResult } from './spam.js';
import type { AddressObject, Attachment } from 'mailparser';

/** Input data for storing a message. */
export interface MessageInput {
  /** Domain ID. */
  domainId: string;
  /** Mailbox ID. */
  mailboxId: string;
  /** RFC 5322 Message-ID. */
  messageId: string;
  /** In-Reply-To header. */
  inReplyTo?: string;
  /** References header values. */
  references?: string[];
  /** Sender address. */
  from: { name?: string; address: string };
  /** Recipient addresses. */
  to: Array<{ name?: string; address: string }>;
  /** CC addresses. */
  cc?: Array<{ name?: string; address: string }>;
  /** Reply-To address. */
  replyTo?: { name?: string; address: string };
  /** Email subject. */
  subject: string;
  /** Plain text body. */
  bodyText?: string;
  /** HTML body. */
  bodyHtml?: string;
  /** Attachment metadata. */
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    storageId?: string;
    externalUrl?: string;
  }>;
  /** Email date timestamp. */
  date: number;
  /** Whether classified as spam. */
  isSpam: boolean;
  /** Spam score. */
  spamScore?: number;
  /** Spam classification reason. */
  spamReason?: string;
  /** SPF verification result: "pass" | "fail" | "softfail" | "neutral" | "none" | "temperror" | "permerror" */
  spfResult?: string;
  /** DKIM verification result: "pass" | "fail" | "none" (best result across all signatures) */
  dkimResult?: string;
  /** Raw Authentication-Results header for audit trail */
  authHeaders?: string;
}

/** Mailbox information from Convex. */
export interface MailboxInfo {
  /** Mailbox ID. */
  _id: string;
  /** Domain ID. */
  domainId: string;
  /** Mailbox name (local part). */
  name: string;
  /** Mailbox type. */
  type: 'personal' | 'shared' | 'alias';
  /** Forwarding addresses for aliases. */
  forwardTo?: string[];
}

/** Domain information from Convex. */
export interface DomainInfo {
  /** Domain ID. */
  _id: string;
  /** Domain name. */
  name: string;
  /** Domain status. */
  status: string;
  /** Domain configuration. */
  config: {
    spamThreshold: number;
    largeFileStrategy: 'store' | 'bounce' | 'byo';
    maxAttachmentSize: number;
    catchAllMailbox?: string;
  };
}

/** Recipient validation result. */
export interface RecipientValidation {
  valid: boolean;
  domainId?: string;
  mailboxId?: string;
  domain?: DomainInfo;
}

/** Interface for Convex client operations. */
export interface IConvexClient {
  getDomain(domainName: string): Promise<DomainInfo | null>;
  getMailbox(domainId: string, mailboxName: string): Promise<MailboxInfo | null>;
  validateRecipient(email: string): Promise<RecipientValidation>;
  uploadAttachment(attachment: Attachment, domainId: string): Promise<string>;
  storeMessage(message: MessageInput): Promise<string>;
  logSpamEvaluation(messageId: string, result: SpamResult): Promise<void>;
}

/**
 * Demo client that accepts all operations without a backend.
 * Used when no Convex URL is configured.
 */
class DemoConvexClient implements IConvexClient {
  constructor() {
    console.log('ConvexClient running in DEMO MODE - no backend storage');
  }

  async getDomain(domainName: string): Promise<DomainInfo | null> {
    return {
      _id: `demo-domain-${domainName}`,
      name: domainName,
      status: 'active',
      config: {
        spamThreshold: 50,
        largeFileStrategy: 'bounce',
        maxAttachmentSize: 1024 * 1024,
      },
    };
  }

  async getMailbox(domainId: string, mailboxName: string): Promise<MailboxInfo | null> {
    return {
      _id: `demo-mailbox-${mailboxName}`,
      domainId,
      name: mailboxName,
      type: 'personal',
    };
  }

  async validateRecipient(email: string): Promise<RecipientValidation> {
    const [mailboxName, domainName] = email.toLowerCase().split('@');
    logger.info('Demo mode: accepting recipient', { email });
    return {
      valid: true,
      domainId: `demo-domain-${domainName}`,
      mailboxId: `demo-mailbox-${mailboxName}`,
      domain: {
        _id: `demo-domain-${domainName}`,
        name: domainName || 'demo.local',
        status: 'active',
        config: {
          spamThreshold: 50,
          largeFileStrategy: 'bounce',
          maxAttachmentSize: 1024 * 1024,
        },
      },
    };
  }

  async uploadAttachment(attachment: Attachment): Promise<string> {
    const fakeId = `demo-attachment-${Date.now()}-${Math.random().toString(36)}`;
    logger.info('Demo mode: fake attachment upload', { filename: attachment.filename, fakeId });
    return fakeId;
  }

  async storeMessage(message: MessageInput): Promise<string> {
    const fakeId = `demo-msg-${Date.now()}-${Math.random().toString(36)}`;
    logger.info('Demo mode: message received', {
      id: fakeId,
      from: message.from.address,
      to: message.to.map(t => t.address),
      subject: message.subject,
    });
    return fakeId;
  }

  async logSpamEvaluation(messageId: string, result: SpamResult): Promise<void> {
    logger.info('Demo mode: spam evaluation', { messageId, ...result });
  }
}

/** Client for interacting with Convex backend. */
class LiveConvexClient implements IConvexClient {
  /** Base URL for HTTP actions. */
  private baseUrl: string;
  /** Shared secret for SMTP <-> Convex auth. */
  private sharedSecret: string;

  constructor(config: Config) {
    this.baseUrl = config.convexUrl.replace('.convex.cloud', '.convex.site');
    this.sharedSecret = config.smtpSharedSecret;
  }

  /**
   * Makes an HTTP request to a Convex HTTP action.
   */
  private async request<T>(
    path: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    logger.debug('Convex request', { path, body: JSON.stringify(body).slice(0, 200) });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.sharedSecret}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Convex request failed', { path, status: response.status, error });
      throw new Error(`Convex request failed: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getDomain(domainName: string): Promise<DomainInfo | null> {
    try {
      return await this.request<DomainInfo | null>('/smtp/getDomain', { name: domainName });
    } catch (error) {
      logger.error('Failed to get domain', { domainName, error });
      return null;
    }
  }

  async getMailbox(domainId: string, mailboxName: string): Promise<MailboxInfo | null> {
    try {
      return await this.request<MailboxInfo | null>('/smtp/getMailbox', { domainId, name: mailboxName });
    } catch (error) {
      logger.error('Failed to get mailbox', { domainId, mailboxName, error });
      return null;
    }
  }

  async validateRecipient(email: string): Promise<RecipientValidation> {
    const [mailboxName, domainName] = email.toLowerCase().split('@');

    if (!mailboxName || !domainName) {
      return { valid: false };
    }

    const domain = await this.getDomain(domainName);
    if (!domain || domain.status !== 'active') {
      logger.info('Domain not found or inactive', { domainName });
      return { valid: false };
    }

    const mailbox = await this.getMailbox(domain._id, mailboxName);
    if (!mailbox) {
      // Check for catch-all mailbox
      if (domain.config.catchAllMailbox) {
        const catchAll = await this.getMailbox(domain._id, domain.config.catchAllMailbox);
        if (catchAll) {
          return { valid: true, domainId: domain._id, mailboxId: catchAll._id, domain };
        }
      }
      logger.info('Mailbox not found', { mailboxName, domainName });
      return { valid: false };
    }

    return { valid: true, domainId: domain._id, mailboxId: mailbox._id, domain };
  }

  async uploadAttachment(attachment: Attachment, domainId: string): Promise<string> {
    const { uploadUrl } = await this.request<{ uploadUrl: string }>(
      '/smtp/getUploadUrl',
      { domainId }
    );

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': attachment.contentType || 'application/octet-stream' },
      body: attachment.content,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload attachment: ${response.status}`);
    }

    const { storageId } = await response.json() as { storageId: string };
    return storageId;
  }

  async storeMessage(message: MessageInput): Promise<string> {
    const result = await this.request<{ messageId: string }>(
      '/smtp/storeMessage',
      message as unknown as Record<string, unknown>
    );
    return result.messageId;
  }

  async logSpamEvaluation(messageId: string, result: SpamResult): Promise<void> {
    await this.request('/smtp/logSpamEvaluation', {
      messageId,
      isSpam: result.isSpam,
      score: result.score,
      category: result.category,
      reason: result.reason,
      model: result.model || 'blocklist',
    });
  }
}

/**
 * Factory: creates the appropriate ConvexClient based on config.
 * Returns a DemoConvexClient when no Convex URL is configured,
 * otherwise returns a LiveConvexClient.
 */
export function createConvexClient(config: Config): IConvexClient {
  const isDemoMode = !config.convexUrl || config.convexUrl === 'demo';
  return isDemoMode ? new DemoConvexClient() : new LiveConvexClient(config);
}

// Re-export as ConvexClient for backward compat (factory usage preferred)
export { type IConvexClient as ConvexClient };

/**
 * Parses mailparser address format to our format.
 */
export function parseAddress(
  addr: AddressObject | AddressObject[] | undefined
): Array<{ name?: string; address: string }> {
  if (!addr) return [];

  const addresses = Array.isArray(addr) ? addr : [addr];

  return addresses.flatMap((a) =>
    a.value.map((v) => ({
      name: v.name || undefined,
      address: v.address || '',
    }))
  );
}

/**
 * Parses a single address from mailparser format.
 */
export function parseSingleAddress(
  addr: AddressObject | AddressObject[] | undefined
): { name?: string; address: string } | undefined {
  const parsed = parseAddress(addr);
  return parsed[0];
}
