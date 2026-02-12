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

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value && fallback === undefined) {
    console.warn(`Warning: Missing environment variable: ${name}`);
    return '';
  }
  return value || fallback || '';
}

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
    convexDeployKey: getEnv('CONVEX_DEPLOY_KEY', 'demo'),
    
    // Spam evaluation - optional
    openrouterApiKey: getEnv('OPENROUTER_API_KEY', ''),
    spamModel: process.env.SPAM_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
    
    // Limits
    maxMessageSize: parseInt(process.env.MAX_MESSAGE_SIZE || String(25 * 1024 * 1024), 10), // 25MB
    maxAttachmentSize: parseInt(process.env.MAX_ATTACHMENT_SIZE || String(1024 * 1024), 10), // 1MB inline
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '300000', 10), // 5 min
    
    // Logging
    logLevel: (process.env.LOG_LEVEL || 'info') as Config['logLevel'],
  };
}
