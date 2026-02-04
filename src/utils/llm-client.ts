import { TranslationError } from '../services/llm';

export interface LLMConfig {
  apiUrl: string;
  model: string;
  temperature: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatChoice {
  message: {
    content: string;
  };
  index: number;
  finish_reason: string;
}

interface ChatResponse {
  choices: ChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface RequestOptions {
  temperature?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RequestOptions> = {
  temperature: 0.3,
  maxRetries: 2,
  retryDelayMs: 1000,
};

const MAX_TEXT_LENGTH = 6000;

/**
 * Normalize API URL to chat completions endpoint
 */
const normalizeApiUrl = (url: string): string => {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
  if (!trimmed.includes('/chat/completions')) return `${trimmed}/chat/completions`;
  return trimmed;
};

/**
 * Check if error is retryable based on status code
 */
const isRetryableError = (status: number): boolean => {
  return status === 429 || (status >= 500 && status < 600);
};

/**
 * Delay execution
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create LLM client with config
 */
export const createLLMClient = (config: LLMConfig, apiKey: string) => {
  const endpoint = normalizeApiUrl(config.apiUrl);
  const isAbsolute = /^https?:\/\//i.test(endpoint);

  return {
    async chatCompletion(
      messages: ChatMessage[],
      options: RequestOptions = {}
    ): Promise<string> {
      const opts = { ...DEFAULT_OPTIONS, ...options };

      if (isAbsolute && !apiKey) {
        throw new TranslationError('API Key is required', undefined, false);
      }

      // Truncate long messages
      const safeMessages = messages.map(m => ({
        ...m,
        content: m.content.length > MAX_TEXT_LENGTH
          ? m.content.slice(0, MAX_TEXT_LENGTH)
          : m.content,
      }));

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(isAbsolute ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({
              model: config.model,
              messages: safeMessages,
              temperature: opts.temperature,
              stream: false,
            }),
          });

          if (!response.ok) {
            const rawText = await response.text().catch(() => '');
            const isRetryable = isRetryableError(response.status);
            throw new TranslationError(
              `API error: ${response.status}${rawText ? ` - ${rawText}` : ''}`,
              response.status,
              isRetryable
            );
          }

          const data: ChatResponse = await response.json();
          const content = data.choices[0]?.message?.content;

          if (!content) {
            throw new TranslationError('Empty response from API', undefined, false);
          }

          return content;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          const isRetryable = error instanceof TranslationError && error.isRetryable;
          const hasRetriesLeft = attempt < opts.maxRetries;

          if (isRetryable && hasRetriesLeft) {
            const waitTime = opts.retryDelayMs * Math.pow(2, attempt);
            console.warn(`Request attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`);
            await delay(waitTime);
            continue;
          }

          break;
        }
      }

      throw lastError ?? new TranslationError('Unknown error');
    },
  };
};

export type LLMClient = ReturnType<typeof createLLMClient>;
