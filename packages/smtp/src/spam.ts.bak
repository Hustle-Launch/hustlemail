/**
 * Spam Evaluation Module.
 * Two-stage spam detection:
 * 1. Fast path: Blocklist lookup
 * 2. AI evaluation: OpenRouter LLM for contextual analysis
 */

import type { Config } from './config.js';
import { logger } from './logger.js';

/** Result of spam evaluation. */
export interface SpamResult {
  /** Whether the email was classified as spam. */
  isSpam: boolean;
  /** Spam score from 0-100, higher = more likely spam. */
  score: number;
  /** Category of the classification. */
  category: 'ham' | 'spam' | 'phishing' | 'scam' | 'unknown';
  /** Human-readable reason for the classification. */
  reason: string;
  /** The AI model used for evaluation (if any). */
  model?: string;
}

/** Email content for spam evaluation. */
export interface EmailContent {
  /** Sender email address. */
  from: string;
  /** Recipient email addresses. */
  to: string[];
  /** Email subject. */
  subject: string;
  /** Plain text body. */
  bodyText?: string;
  /** HTML body. */
  bodyHtml?: string;
}

/** Known spam email addresses. */
const BLOCKLIST = new Set([
  'spam@spam.com',
  'noreply@scammer.xyz',
  'prince@nigeria.gov.ng.fake',
]);

/** Known spam domains. */
const BLOCKLIST_DOMAINS = new Set([
  'spam.com',
  'scammer.xyz',
  'malware.ru',
  'phishing.net',
]);

/**
 * Checks if a sender is on the blocklist.
 * @param from - The sender email address.
 * @returns True if the sender is blocklisted.
 */
export async function checkBlocklist(from: string): Promise<boolean> {
  const normalized = from.toLowerCase().trim();
  
  // Check exact match
  if (BLOCKLIST.has(normalized)) {
    return true;
  }
  
  // Check domain
  const domain = normalized.split('@')[1];
  if (domain && BLOCKLIST_DOMAINS.has(domain)) {
    return true;
  }
  
  return false;
}

/**
 * Evaluates spam using OpenRouter AI.
 * @param email - The email content to evaluate.
 * @param config - Server configuration.
 * @returns Spam evaluation result.
 */
async function evaluateWithAI(
  email: EmailContent,
  config: Config
): Promise<SpamResult> {
  const emailSummary = `
From: ${email.from}
To: ${email.to.join(', ')}
Subject: ${email.subject}

Body:
${(email.bodyText || email.bodyHtml || '').slice(0, 2000)}
`.trim();

  const prompt = `You are an email spam classifier. Analyze this email and classify it.

${emailSummary}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "classification": "ham" | "spam" | "phishing" | "scam",
  "confidence": 0-100,
  "reason": "brief explanation"
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://codemail.dev',
        'X-Title': 'CodeMail Spam Filter',
      },
      body: JSON.stringify({
        model: config.spamModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('OpenRouter API error', { status: response.status, error });
      // Default to allowing message on API failure
      return {
        isSpam: false,
        score: 0,
        category: 'unknown',
        reason: 'AI evaluation failed, allowing message',
        model: config.spamModel,
      };
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    
    const content = data.choices[0]?.message?.content || '';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('Could not parse AI response', { content });
      return {
        isSpam: false,
        score: 0,
        category: 'unknown',
        reason: 'Could not parse AI response',
        model: config.spamModel,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      classification: string;
      confidence: number;
      reason: string;
    };

    const isSpam = ['spam', 'phishing', 'scam'].includes(parsed.classification);
    
    return {
      isSpam,
      score: isSpam ? parsed.confidence : 100 - parsed.confidence,
      category: parsed.classification as SpamResult['category'],
      reason: parsed.reason,
      model: config.spamModel,
    };
  } catch (error) {
    logger.error('AI spam evaluation failed', { error });
    // Default to allowing message on error
    return {
      isSpam: false,
      score: 0,
      category: 'unknown',
      reason: 'AI evaluation error, allowing message',
      model: config.spamModel,
    };
  }
}

/**
 * Main spam evaluation function.
 * Two-stage: blocklist check (fast), then AI evaluation.
 * @param email - The email content to evaluate.
 * @param config - Server configuration.
 * @returns Spam evaluation result.
 */
export async function evaluateSpam(
  email: EmailContent,
  config: Config
): Promise<SpamResult> {
  logger.debug('Evaluating spam', { from: email.from, subject: email.subject });

  // Stage 1: Blocklist check
  const blocklisted = await checkBlocklist(email.from);
  if (blocklisted) {
    logger.info('Sender blocklisted', { from: email.from });
    return {
      isSpam: true,
      score: 100,
      category: 'spam',
      reason: 'Sender is on blocklist',
    };
  }

  // Skip AI evaluation if no API key configured
  if (!config.openrouterApiKey) {
    logger.info('No OpenRouter API key, skipping AI spam evaluation');
    return {
      isSpam: false,
      score: 0,
      category: 'ham',
      reason: 'AI evaluation disabled (no API key)',
    };
  }

  // Stage 2: AI evaluation
  const aiResult = await evaluateWithAI(email, config);
  
  logger.info('Spam evaluation complete', {
    from: email.from,
    isSpam: aiResult.isSpam,
    score: aiResult.score,
    category: aiResult.category,
  });

  return aiResult;
}
