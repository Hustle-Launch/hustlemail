/**
 * SMTP Server Configuration.
 * All values can be overridden via environment variables.
 */

/** Configuration interface for the SMTP server. */
export interface Config {
  /** Server port number. */
  port: number;
  /** Server host address. */
  host: string;
  /** Whether to use TLS. */
  secure: boolean;
  
  /** Path to TLS private key file. */
  tlsKeyPath?: string;
  /** Path to TLS certificate file. */
  tlsCertPath?: string;
  
  /** Convex deployment URL. */
  convexUrl: string;
  /** Shared secret for SMTP <-> Convex authentication. */
  smtpSharedSecret: string;
  
  /** OpenRouter API key for spam detection. */
  openrouterApiKey: string;
  /** AI model to use for spam evaluation. */
  spamModel: string;
  
  /** Maximum message size in bytes. */
  maxMessageSize: number;
  /** Maximum attachment size for inline storage in bytes. */
  maxAttachmentSize: number;
  /** Connection timeout in milliseconds. */
  connectionTimeout: number;
  
  /** Logging level. */
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  /**
   * When true, hard-reject messages where BOTH SPF and DKIM fail.
   * When false (default), auth failures increase spam score but do not block.
   * Set SMTP_REJECT_AUTH_FAIL=true to enable strict mode.
   */
  rejectAuthFail: boolean;

  /**
   * Our MTA hostname, reported in Authentication-Results headers.
   * Defaults to SMTP_HOST or the system hostname.
   */
  mtaHostname: string;
}

/**
 * Gets an environment variable with optional fallback.
 * @param name - The environment variable name.
 * @param fallback - Optional fallback value if not set.
 * @returns The environment variable value or fallback.
 */
function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value && fallback === undefined) {
    console.warn(`Warning: Missing environment variable: ${name}`);
    return '';
  }
  return value || fallback || '';
}

/**
 * Loads and returns the server configuration from environment variables.
 * @returns The complete server configuration.
 */
export function loadConfig(): Config {
  // Demo mode - just start the server without Convex
  const demoMode = process.env.DEMO_MODE === 'true' || !process.env.CONVEX_URL;
  
  if (demoMode) {
    console.log('Starting SMTP server in DEMO MODE (no Convex backend)');
  }
  
  return {
    // Server
    port: parseInt(process.env.SMTP_PORT || '25', 10),
    host: process.env.SMTP_HOST || '0.0.0.0',
    secure: process.env.SMTP_SECURE === 'true',
    
    // TLS
    tlsKeyPath: process.env.TLS_KEY_PATH,
    tlsCertPath: process.env.TLS_CERT_PATH,
    
    // Convex - optional for demo mode
    convexUrl: getEnv('CONVEX_URL', 'demo'),
    smtpSharedSecret: getEnv('SMTP_SHARED_SECRET', 'demo'),
    
    // Spam evaluation - optional
    openrouterApiKey: getEnv('OPENROUTER_API_KEY', ''),
    spamModel: process.env.SPAM_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
    
    // Limits
    maxMessageSize: parseInt(process.env.MAX_MESSAGE_SIZE || String(25 * 1024 * 1024), 10), // 25MB
    maxAttachmentSize: parseInt(process.env.MAX_ATTACHMENT_SIZE || String(1024 * 1024), 10), // 1MB inline
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '300000', 10), // 5 min
    
    // Logging
    logLevel: (process.env.LOG_LEVEL || 'info') as Config['logLevel'],

    // SPF/DKIM enforcement
    rejectAuthFail: process.env.SMTP_REJECT_AUTH_FAIL === 'true',
    mtaHostname: process.env.MTA_HOSTNAME || process.env.SMTP_HOST || 'mail.codemail.dev',
  };
}
