/**
 * SMTP Server Configuration
 * 
 * All values can be overridden via environment variables.
 */

export interface Config {
  // Server
  port: number;
  host: string;
  secure: boolean;
  
  // TLS (optional for port 25, required for 465)
  tlsKeyPath?: string;
  tlsCertPath?: string;
  
  // Convex
  convexUrl: string;
  convexDeployKey: string;
  
  // Spam evaluation
  openrouterApiKey: string;
  spamModel: string;
  
  // Limits
  maxMessageSize: number; // bytes
  maxAttachmentSize: number; // bytes for inline storage
  connectionTimeout: number; // ms
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    // Server
    port: parseInt(process.env.SMTP_PORT || '25', 10),
    host: process.env.SMTP_HOST || '0.0.0.0',
    secure: process.env.SMTP_SECURE === 'true',
    
    // TLS
    tlsKeyPath: process.env.TLS_KEY_PATH,
    tlsCertPath: process.env.TLS_CERT_PATH,
    
    // Convex
    convexUrl: requireEnv('CONVEX_URL'),
    convexDeployKey: requireEnv('CONVEX_DEPLOY_KEY'),
    
    // Spam evaluation
    openrouterApiKey: requireEnv('OPENROUTER_API_KEY'),
    spamModel: process.env.SPAM_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
    
    // Limits
    maxMessageSize: parseInt(process.env.MAX_MESSAGE_SIZE || String(25 * 1024 * 1024), 10), // 25MB
    maxAttachmentSize: parseInt(process.env.MAX_ATTACHMENT_SIZE || String(1024 * 1024), 10), // 1MB inline
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '300000', 10), // 5 min
    
    // Logging
    logLevel: (process.env.LOG_LEVEL || 'info') as Config['logLevel'],
  };
}
