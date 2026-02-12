/**
 * Convex API Client
 * 
 * Communicates with Convex backend via HTTP actions.
 */

import type { Config } from './config.js';
import { logger } from './logger.js';
import type { SpamResult } from './spam.js';
import type { AddressObject, Attachment } from 'mailparser';

export interface MessageInput {
  domainId: string;
  mailboxId: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  from: { name?: string; address: string };
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  replyTo?: { name?: string; address: string };
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    storageId?: string;
    externalUrl?: string;
  }>;
  date: number;
  isSpam: boolean;
  spamScore?: number;
  spamReason?: string;
}

export interface MailboxInfo {
  _id: string;
  domainId: string;
  name: string;
  type: 'personal' | 'shared' | 'alias';
  forwardTo?: string[];
}

export interface DomainInfo {
  _id: string;
  name: string;
  status: string;
  config: {
    spamThreshold: number;
    largeFileStrategy: 'store' | 'bounce' | 'byo';
    maxAttachmentSize: number;
    catchAllMailbox?: string;
  };
}

export class ConvexClient {
  private baseUrl: string;
  private deployKey: string;
  private demoMode: boolean;

  constructor(config: Config) {
    // Check if we're in demo mode (no real Convex configured)
    this.demoMode = !config.convexUrl || config.convexUrl === 'demo';
    
    if (this.demoMode) {
      console.log('ConvexClient running in DEMO MODE - no backend storage');
      this.baseUrl = '';
      this.deployKey = '';
    } else {
      // Convex URL format: https://xxx.convex.cloud
      // HTTP action format: https://xxx.convex.site
      this.baseUrl = config.convexUrl.replace('.convex.cloud', '.convex.site');
      this.deployKey = config.convexDeployKey;
    }
  }

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
        'Authorization': `Bearer ${this.deployKey}`,
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

  /**
   * Look up domain by name
   */
  async getDomain(domainName: string): Promise<DomainInfo | null> {
    try {
      const result = await this.request<DomainInfo | null>('/smtp/getDomain', {
        name: domainName,
      });
      return result;
    } catch (error) {
      logger.error('Failed to get domain', { domainName, error });
      return null;
    }
  }

  /**
   * Look up mailbox by domain and name
   */
  async getMailbox(domainId: string, mailboxName: string): Promise<MailboxInfo | null> {
    try {
      const result = await this.request<MailboxInfo | null>('/smtp/getMailbox', {
        domainId,
        name: mailboxName,
      });
      return result;
    } catch (error) {
      logger.error('Failed to get mailbox', { domainId, mailboxName, error });
      return null;
    }
  }

  /**
   * Validate that a recipient mailbox exists
   */
  async validateRecipient(email: string): Promise<{
    valid: boolean;
    domainId?: string;
    mailboxId?: string;
    domain?: DomainInfo;
  }> {
    // Demo mode - accept all recipients
    if (this.demoMode) {
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
          return {
            valid: true,
            domainId: domain._id,
            mailboxId: catchAll._id,
            domain,
          };
        }
      }
      logger.info('Mailbox not found', { mailboxName, domainName });
      return { valid: false };
    }

    return {
      valid: true,
      domainId: domain._id,
      mailboxId: mailbox._id,
      domain,
    };
  }

  /**
   * Upload attachment to Convex storage
   */
  async uploadAttachment(
    attachment: Attachment,
    domainId: string
  ): Promise<string> {
    // Demo mode - return fake storage ID
    if (this.demoMode) {
      const fakeId = `demo-attachment-${Date.now()}-${Math.random().toString(36)}`;
      logger.info('Demo mode: fake attachment upload', { filename: attachment.filename, fakeId });
      return fakeId;
    }
    
    // Get upload URL
    const { uploadUrl } = await this.request<{ uploadUrl: string }>(
      '/smtp/getUploadUrl',
      { domainId }
    );

    // Upload the file
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': attachment.contentType || 'application/octet-stream',
      },
      body: attachment.content,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload attachment: ${response.status}`);
    }

    const { storageId } = await response.json() as { storageId: string };
    return storageId;
  }

  /**
   * Store a message in Convex
   */
  async storeMessage(message: MessageInput): Promise<string> {
    // Demo mode - just log the message
    if (this.demoMode) {
      const fakeId = `demo-msg-${Date.now()}-${Math.random().toString(36)}`;
      logger.info('Demo mode: message received', {
        id: fakeId,
        from: message.from.address,
        to: message.to.map(t => t.address),
        subject: message.subject,
      });
      return fakeId;
    }
    
    const result = await this.request<{ messageId: string }>(
      '/smtp/storeMessage',
      message as unknown as Record<string, unknown>
    );
    return result.messageId;
  }

  /**
   * Log spam evaluation result
   */
  async logSpamEvaluation(
    messageId: string,
    result: SpamResult
  ): Promise<void> {
    // Demo mode - just log
    if (this.demoMode) {
      logger.info('Demo mode: spam evaluation', { messageId, ...result });
      return;
    }
    
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
 * Parse mailparser address format to our format
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
 * Parse single address
 */
export function parseSingleAddress(
  addr: AddressObject | AddressObject[] | undefined
): { name?: string; address: string } | undefined {
  const parsed = parseAddress(addr);
  return parsed[0];
}
