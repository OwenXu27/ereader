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

export class LLMError extends Error {
  readonly statusCode?: number;
  readonly isRetryable: boolean;

  constructor(message: string, statusCode?: number, isRetryable: boolean = false) {
    super(message);
    this.name = 'LLMError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

/**
 * Create LLM client
 */
export const createLLMClient = (config: LLMConfig, apiKey?: string) => {
  const normalizeApiUrl = (url: string): string => {
    const raw = url.trim();
    const trimmed = raw.replace(/\/+$/, '');
    if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
    if (!trimmed.includes('/chat/completions')) return `${trimmed}/chat/completions`;
    return trimmed;
  };

  const endpoint = normalizeApiUrl(config.apiUrl);
  const isAbsolute = /^https?:\/\//i.test(endpoint);

  const buildHeaders = () => ({
    'Content-Type': 'application/json',
    ...(isAbsolute && apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  });

  const validateAuth = () => {
    if (isAbsolute && !apiKey) {
      throw new LLMError('API Key is required for external API', undefined, false);
    }
  };

  const handleErrorResponse = async (response: Response) => {
    const rawText = await response.text().catch(() => '');
    const isRetryable = response.status === 429 || (response.status >= 500 && response.status < 600);
    throw new LLMError(
      `API error: ${response.status}${rawText ? ` - ${rawText}` : ''}`,
      response.status,
      isRetryable
    );
  };

  const chatCompletion = async (
    messages: ChatMessage[],
    options?: { temperature?: number }
  ): Promise<string> => {
    validateAuth();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options?.temperature ?? config.temperature,
        stream: false,
      }),
    });

    if (!response.ok) await handleErrorResponse(response);

    const data: ChatResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new LLMError('Empty response from API', undefined, false);
    }

    return content;
  };

  const chatCompletionStream = async (
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: { temperature?: number; signal?: AbortSignal }
  ): Promise<string> => {
    validateAuth();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options?.temperature ?? config.temperature,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!response.ok) await handleErrorResponse(response);

    const reader = response.body?.getReader();
    if (!reader) throw new LLMError('No response body for streaming', undefined, false);

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onChunk(fullContent);
          }
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

    if (!fullContent) {
      throw new LLMError('Empty response from streaming API', undefined, false);
    }

    return fullContent;
  };

  return { chatCompletion, chatCompletionStream };
};
