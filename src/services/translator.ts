// Default configuration from environment variables
const DEFAULT_API_URL =
  (import.meta as any).env?.VITE_MOONSHOT_CHAT_COMPLETIONS_URL || '/api/chat/completions';

const MODEL =
  (import.meta as any).env?.VITE_MOONSHOT_MODEL || 'kimi-k2';

/**
 * Normalize API URL to chat completions endpoint
 * Accepts:
 * - full endpoint: https://.../v1/chat/completions
 * - base url: https://.../v1 (or .../v1/)
 * - empty string: uses default
 */
const normalizeApiUrl = (url: string): string => {
  const raw = url.trim() || DEFAULT_API_URL;
  const trimmed = raw.replace(/\/+$/, '');
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
  if (!trimmed.includes('/chat/completions')) return `${trimmed}/chat/completions`;
  return trimmed;
};

const TEMPERATURE = (() => {
  const v = (import.meta as any).env?.VITE_MOONSHOT_TEMPERATURE;
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0.3;
})();

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const MAX_TEXT_LENGTH = 6000;

// Types
interface ChatMessage {
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

export class TranslationError extends Error {
  readonly statusCode?: number;
  readonly isRetryable: boolean;

  constructor(message: string, statusCode?: number, isRetryable: boolean = false) {
    super(message);
    this.name = 'TranslationError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

const SYSTEM_PROMPT = `你是一位资深书籍翻译专家。将英文翻译为流畅、地道的中文，让读者感觉不到这是译作。

## 翻译原则
- 消除翻译腔：避免「进行了」「被...所」「的的不休」等欧化表达
- 被动语态转主动：It is considered → 普遍认为
- 长句拆分：超过 40 字需断句，保持阅读节奏

## 排版规范（必须遵守）
- 引号：使用直角引号「」『』，禁用 "" ''
- 中英混排：中文与英文/数字之间加空格（如：使用 AI 技术、共 3 个）
- 专有名词首次出现：中文译名（Original Term），如：冒名顶替综合症（Imposter Syndrome）
- 省略号：……  破折号：——

仅输出译文，不要解释。`;

/**
 * Delay execution for specified milliseconds
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Determine if an error is retryable based on status code
 */
const isRetryableError = (status: number): boolean => {
  // Retry on rate limit (429), server errors (5xx), or network issues
  return status === 429 || (status >= 500 && status < 600);
};

/**
 * Make a single translation API call
 */
const makeTranslationRequest = async (
  text: string,
  apiUrl: string,
  apiKey: string
): Promise<string> => {
  const endpoint = normalizeApiUrl(apiUrl);
  const isAbsolute = /^https?:\/\//i.test(endpoint);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(isAbsolute ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ] as ChatMessage[],
      temperature: TEMPERATURE,
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
};

/**
 * Translate text with automatic retry on transient failures
 * @param text - Text to translate
 * @param apiUrl - API endpoint URL (empty string uses default/proxy)
 * @param apiKey - API key for authentication
 */
export const translateText = async (
  text: string,
  apiUrl: string,
  apiKey: string
): Promise<string> => {
  const endpoint = normalizeApiUrl(apiUrl);
  const isAbsolute = /^https?:\/\//i.test(endpoint);
  
  if (isAbsolute && !apiKey) {
    throw new TranslationError('API Key is required', undefined, false);
  }

  // Truncate extremely long text to avoid context limit errors
  const safeText = text.length > MAX_TEXT_LENGTH 
    ? text.slice(0, MAX_TEXT_LENGTH) 
    : text;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await makeTranslationRequest(safeText, apiUrl, apiKey);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable =
        error instanceof TranslationError && error.isRetryable;
      const hasRetriesLeft = attempt < MAX_RETRIES;

      if (isRetryable && hasRetriesLeft) {
        const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
        console.warn(
          `Translation attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`
        );
        await delay(waitTime);
        continue;
      }

      // Non-retryable error or out of retries
      break;
    }
  }

  console.error('Translation failed after retries:', lastError);
  throw lastError ?? new TranslationError('Unknown translation error');
};
