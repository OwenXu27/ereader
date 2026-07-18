export interface LLMConfig {
  apiUrl: string;
  model: string;
  temperature: number;
  /** 显式开关 thinking（仅部分模型支持，如 kimi-k2.6 关闭 thinking 后即 K2.6 非思考路由） */
  thinking?: { type: 'enabled' | 'disabled' };
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

  const deriveResponsesUrl = (url: string): string => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (trimmed.endsWith('/chat/completions')) return trimmed.replace(/\/chat\/completions$/, '/responses');
    if (trimmed.endsWith('/v1')) return `${trimmed}/responses`;
    return `${trimmed}/responses`;
  };

  const responsesEndpoint = deriveResponsesUrl(config.apiUrl);

  // 绝对地址：浏览器直连上游，用标准 Authorization 头（需要上游放行 CORS）。
  // 相对地址（同源代理）：改用 X-API-Key 头，由本地 dev server / Vercel
  // Function 读取并转发，避免误把用户 key 发给非同源目标。
  const buildHeaders = () => ({
    'Content-Type': 'application/json',
    ...(apiKey
      ? isAbsolute
        ? { Authorization: `Bearer ${apiKey}` }
        : { 'X-API-Key': apiKey }
      : {}),
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

  // Models that reject the chat/completions route (e.g. KTH gpt-5.x / codex)
  const isUnsupportedRouteError = (error: unknown): boolean =>
    error instanceof LLMError && error.message.includes('does not support route chat_completions');

  // OpenAI Responses API (streaming) — fallback for models without chat/completions.
  // KTH's /responses route only returns content when stream=true, so always stream.
  const responsesCompletion = async (
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: { signal?: AbortSignal }
  ): Promise<string> => {
    validateAuth();

    const instructions = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const input = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

    const response = await fetch(responsesEndpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        model: config.model,
        store: false,
        stream: true,
        ...(instructions ? { instructions } : {}),
        input,
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
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.type === 'response.output_text.delta' && typeof parsed.delta === 'string') {
            fullContent += parsed.delta;
            onChunk(fullContent);
          } else if (parsed.type === 'response.failed') {
            throw new LLMError(parsed.response?.error?.message || 'Responses API request failed');
          }
        } catch (e) {
          if (e instanceof LLMError) throw e;
          // Skip malformed SSE chunks
        }
      }
    }

    if (!fullContent) {
      throw new LLMError('Empty response from API', undefined, false);
    }

    return fullContent;
  };

  const chatCompletion = async (
    messages: ChatMessage[],
    options?: { temperature?: number }
  ): Promise<string> => {
    validateAuth();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: options?.temperature ?? config.temperature,
          stream: false,
          ...(config.thinking ? { thinking: config.thinking } : {}),
        }),
      });

      if (!response.ok) await handleErrorResponse(response);

      const data: ChatResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new LLMError('Empty response from API', undefined, false);
      }

      return content;
    } catch (error) {
      if (isUnsupportedRouteError(error)) {
        return responsesCompletion(messages, () => {});
      }
      throw error;
    }
  };

  const chatCompletionStream = async (
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: { temperature?: number; signal?: AbortSignal }
  ): Promise<string> => {
    validateAuth();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: options?.temperature ?? config.temperature,
          stream: true,
          ...(config.thinking ? { thinking: config.thinking } : {}),
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
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      if (isUnsupportedRouteError(error)) {
        return responsesCompletion(messages, onChunk, { signal: options?.signal });
      }
      throw error;
    }
  };

  return { chatCompletion, chatCompletionStream };
};
