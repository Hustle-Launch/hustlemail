/**
 * Simple structured JSON logger for SMTP server.
 * Outputs logs in JSON format with timestamp, level, message, and context.
 */

/** Log level type. */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Numeric values for log levels for comparison. */
const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Current minimum log level. */
let currentLevel: LogLevel = 'info';

/**
 * Sets the minimum log level for output.
 * @param level - The minimum level to output.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Formats a log message as JSON.
 * @param level - The log level.
 * @param message - The log message.
 * @param data - Optional additional data.
 * @returns JSON string for output.
 */
function formatMessage(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const base = {
    timestamp,
    level,
    message,
    ...data,
  };
  return JSON.stringify(base);
}

/**
 * Logs a message at the specified level.
 * @param level - The log level.
 * @param message - The log message.
 * @param data - Optional additional context data.
 */
function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  if (LEVELS[level] < LEVELS[currentLevel]) {
    return;
  }
  
  const output = formatMessage(level, message, data);
  
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

/** Logger object with level-specific methods. */
export const logger = {
  /**
   * Logs a debug message.
   * @param message - The message to log.
   * @param data - Optional context data.
   */
  debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
  
  /**
   * Logs an info message.
   * @param message - The message to log.
   * @param data - Optional context data.
   */
  info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
  
  /**
   * Logs a warning message.
   * @param message - The message to log.
   * @param data - Optional context data.
   */
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
  
  /**
   * Logs an error message.
   * @param message - The message to log.
   * @param data - Optional context data.
   */
  error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
};
