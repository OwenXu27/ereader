import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Trash2, Quote } from 'lucide-react';
import clsx from 'clsx';
import { sendChatMessage, type ChatMessageType, TranslationError } from '../../services/llm';
import { useBookStore } from '../../store/useBookStore';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onClearSelection: () => void;
  quickPromptMode?: 'grammar' | 'background' | 'plain' | null;
  onQuickPromptHandled?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  selectedText,
  onClearSelection,
  quickPromptMode,
  onQuickPromptHandled,
}) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessageType[]>([]);
  const { settings } = useBookStore();

  const {
    isSepia,
    isDark,
    themeBgClass,
    themeTextClass,
    userMessageTextClass,
    assistantMessageTextClass,
    inputBgClass,
  } = useMemo(() => {
    const isSepiaTheme = settings.theme === 'sepia';
    const isDarkTheme = settings.theme === 'dark';
    return {
      isSepia: isSepiaTheme,
      isDark: isDarkTheme,
      themeBgClass: isDarkTheme
        ? "bg-[#18181b]"
        : isSepiaTheme
          ? "bg-[#f4ecd8]"
          : "bg-[#F9F7F1]",
      themeTextClass: isDarkTheme
        ? "text-zinc-100"
        : isSepiaTheme
          ? "text-[#5b4636]"
          : "text-[#333333]",
      userMessageTextClass: isDarkTheme
        ? "text-zinc-300"
        : isSepiaTheme
          ? "text-[#6b4e35]"
          : "text-zinc-600",
      assistantMessageTextClass: isDarkTheme
        ? "text-zinc-100"
        : isSepiaTheme
          ? "text-[#4a3a2a]"
          : "text-zinc-900",
      inputBgClass: isDarkTheme
        ? "bg-zinc-800"
        : isSepiaTheme
          ? "bg-[#f4ecd8]"
          : "bg-[#F9F7F1]",
    };
  }, [settings.theme]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessageType = { role: 'user', content: trimmed };
    const newMessages = [...messagesRef.current, userMessage];

    setMessages(newMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        newMessages,
        settings.apiUrl,
        settings.apiKey,
        selectedText || undefined
      );

      const assistantMessage: ChatMessageType = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof TranslationError 
        ? err.message 
        : 'Failed to get response';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, selectedText, settings.apiKey, settings.apiUrl]);

  const handleSend = () => {
    void sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const buildPrompt = useCallback((mode: 'grammar' | 'background' | 'plain') => {
    if (!selectedText) return '';
    const snippet = selectedText.slice(0, 200) + (selectedText.length > 200 ? '…' : '');
    if (mode === 'grammar') {
      return `请用中文详细解释这句英文的语法结构，拆分长难句并说明各个从句之间的关系，最后给出通顺的中文释义：\n「${snippet}」\n`;
    }
    if (mode === 'background') {
      return `请结合上下文和相关背景知识，帮助我理解下面这段文字中涉及的概念、背景与隐含信息：\n「${snippet}」\n`;
    }
    // plain
    return `「${snippet}」`;
  }, [selectedText]);

  const applyPrompt = useCallback((mode: 'grammar' | 'background' | 'plain') => {
    if (!selectedText) return;
    setInput(prev => {
      const prefix = prev ? `${prev.trimEnd()}\n\n` : '';
      return prefix + buildPrompt(mode);
    });
    inputRef.current?.focus();
  }, [buildPrompt, selectedText]);

  const canSend = input.trim().length > 0 && !isLoading;

  // Handle quick prompt coming from parent (e.g. Option+G/D/C when sidebar was closed)
  useEffect(() => {
    if (!quickPromptMode || !selectedText) return;

    const mode = quickPromptMode;
    const prompt = buildPrompt(mode);

    if (mode === 'grammar' || mode === 'background') {
      // 自动发送：直接用 prompt 走一遍消息发送，不依赖当前输入框状态
      void sendMessage(prompt);
    } else {
      // plain：仅填充到输入框中
      setInput(prev => {
        const prefix = prev ? `${prev.trimEnd()}\n\n` : '';
        return prefix + prompt;
      });
      inputRef.current?.focus();
    }

    onQuickPromptHandled?.();
  }, [quickPromptMode, selectedText, buildPrompt, sendMessage, onQuickPromptHandled]);

  // Keyboard shortcuts for quoting selected text into input
  useEffect(() => {
    if (!isOpen) return;

    const handleShortcut = (e: KeyboardEvent) => {
      // Only react to Option/Alt + key, avoid when modifier combinations are complex
      if (!e.altKey || e.metaKey || e.ctrlKey) return;

      // 使用 code 而不是 key，避免 Option 组合键被映射成特殊符号
      if (e.code === 'KeyG') {
        e.preventDefault();
        // 语法解释：构造 prompt 并自动发送
        const prompt = buildPrompt('grammar');
        void sendMessage(prompt);
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        // 背景知识：构造 prompt 并自动发送
        const prompt = buildPrompt('background');
        void sendMessage(prompt);
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        // 仅引用：只填充，不自动发送
        applyPrompt('plain');
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isOpen, selectedText, isLoading, buildPrompt, sendMessage, applyPrompt]);

  return (
    <div
      className={clsx(
        "w-[24%] h-full border-l border-zinc-200 dark:border-zinc-800 flex flex-col text-sm",
        themeBgClass,
        themeTextClass
      )}
    >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-semibold text-lg">阅读助手</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500"
              title="清空对话"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Selected Text Preview */}
        {selectedText && (
          <div
            className={clsx(
              "p-3 border-b border-zinc-200 dark:border-zinc-800",
              isDark
                ? "bg-zinc-900/60"
                : isSepia
                  ? "bg-[#f1e3c4]"
                  : "bg-white"
            )}
          >
            <div className="flex items-start gap-2">
              <Quote
                size={16}
                className={clsx(
                  "mt-0.5 flex-shrink-0",
                  isDark ? "text-zinc-400" : "text-zinc-500"
                )}
              />
              <p
                className={clsx(
                  "text-sm line-clamp-3 flex-1",
                  isDark ? "text-zinc-100" : "text-zinc-800"
                )}
              >
                {selectedText}
              </p>
              <button
                onClick={onClearSelection}
                className={clsx(
                  "p-1 rounded",
                  isDark
                    ? "hover:bg-zinc-800 text-zinc-400"
                    : "hover:bg-zinc-200 text-zinc-500"
                )}
                title="清除引用"
              >
                <X size={14} />
              </button>
            </div>
            <div
              className={clsx(
                "mt-2 flex flex-wrap gap-2 text-[11px]",
                isDark ? "text-zinc-400" : "text-zinc-700"
              )}
            >
              <button
                type="button"
                onClick={() => applyPrompt('grammar')}
                className={clsx(
                  "hover:underline",
                  isDark ? "hover:text-zinc-100" : "hover:text-zinc-900"
                )}
              >
                语法解释（⌥G）
              </button>
              <span className={clsx(isDark ? "text-zinc-600" : "text-zinc-400")}>·</span>
              <button
                type="button"
                onClick={() => applyPrompt('background')}
                className={clsx(
                  "hover:underline",
                  isDark ? "hover:text-zinc-100" : "hover:text-zinc-900"
                )}
              >
                背景知识（⌥D）
              </button>
              <span className={clsx(isDark ? "text-zinc-600" : "text-zinc-400")}>·</span>
              <button
                type="button"
                onClick={() => applyPrompt('plain')}
                className={clsx(
                  "hover:underline",
                  isDark ? "hover:text-zinc-100" : "hover:text-zinc-900"
                )}
              >
                仅引用（⌥C）
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 dark:text-zinc-500 py-8">
              <p className="text-sm">选择文字后可以在这里提问</p>
              <p className="text-xs mt-2 text-zinc-400 dark:text-zinc-600">
                例如：这个词是什么意思？
              </p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className="w-full pt-2.5 pb-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="mb-1 text-[11px] font-medium tracking-wide uppercase">
                {msg.role === 'user' ? (
                  <span className="text-zinc-600 dark:text-zinc-400">你</span>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-500">助手</span>
                )}
              </div>
              <p
                className={clsx(
                  "text-sm whitespace-pre-wrap",
                  msg.role === 'user'
                    ? userMessageTextClass
                    : assistantMessageTextClass
                )}
              >
                {msg.content}
              </p>
            </div>
          ))}

          {isLoading && (
            <div className="w-full pt-2.5 pb-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="text-center text-sm py-2 text-zinc-600 dark:text-zinc-300">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题..."
              className={clsx(
                "flex-1 resize-none rounded-lg border px-3 py-1.5 text-sm leading-snug focus:outline-none min-h-[32px] max-h-[80px] placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                inputBgClass,
                canSend
                  ? clsx(
                      isDark ? "border-white focus:ring-2 focus:ring-white dark:text-white"
                             : "border-zinc-900 focus:ring-2 focus:ring-zinc-900 text-zinc-900"
                    )
                  : "border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-500 dark:text-white text-zinc-900"
              )}
              rows={1}
              disabled={isLoading}
            />
          </div>
        </div>
    </div>
  );
};
