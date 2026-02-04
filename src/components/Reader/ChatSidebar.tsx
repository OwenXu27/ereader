import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Quote } from 'lucide-react';
import clsx from 'clsx';
import { sendChatMessage, type ChatMessageType, TranslationError, getQuickPrompt, type QuickPromptMode } from '../../services/llm';
import { useTheme } from '../../hooks/useTheme';
import { useBookStore } from '../../store/useBookStore';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onClearSelection: () => void;
  quickPromptMode?: QuickPromptMode | null;
  onQuickPromptHandled?: () => void;
}

export const ChatSidebar = ({
  isOpen,
  onClose,
  selectedText,
  onClearSelection,
  quickPromptMode,
  onQuickPromptHandled,
}: ChatSidebarProps) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuoteHover, setIsQuoteHover] = useState(false);
  const [quotedText, setQuotedText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessageType[]>([]);
  
  const theme = useTheme();
  const { settings } = useBookStore();

  // Track messages for async operations
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const maxHeight = 180;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  const buildPrompt = useCallback((mode: QuickPromptMode) => {
    if (!selectedText) return '';
    return getQuickPrompt(mode, selectedText);
  }, [selectedText]);

  const buildMessageWithQuote = useCallback((content: string, quote?: string) => {
    if (!quote) return content;
    return `「${quote}」\n\n${content}`;
  }, []);

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
      const response = await sendChatMessage(newMessages, settings.apiUrl, settings.apiKey, selectedText || undefined);
      const assistantMessage: ChatMessageType = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof TranslationError ? err.message : 'Failed to get response';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, selectedText, settings.apiUrl, settings.apiKey]);

  const handleSend = useCallback(() => {
    const combined = quotedText ? `「${quotedText}」\n\n${input}` : input;
    setQuotedText('');
    onClearSelection();
    void sendMessage(combined);
  }, [quotedText, input, onClearSelection, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const applyPrompt = useCallback((mode: QuickPromptMode) => {
    if (!selectedText) return;
    if (mode === 'plain') {
      setQuotedText(selectedText);
      inputRef.current?.focus();
      return;
    }
    setInput(prev => {
      const prefix = prev ? `${prev.trimEnd()}\n\n` : '';
      return prefix + buildPrompt(mode);
    });
    inputRef.current?.focus();
  }, [selectedText, buildPrompt]);

  // Handle quick prompt from parent
  useEffect(() => {
    if (!quickPromptMode || !selectedText) return;

    const mode = quickPromptMode;
    const prompt = buildPrompt(mode);

    if (mode === 'grammar' || mode === 'background') {
      const combined = buildMessageWithQuote(prompt, selectedText);
      void sendMessage(combined);
    } else {
      setQuotedText(selectedText);
      inputRef.current?.focus();
    }

    onQuickPromptHandled?.();
  }, [quickPromptMode, selectedText, buildPrompt, sendMessage, onQuickPromptHandled, buildMessageWithQuote]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleShortcut = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;

      if (e.code === 'KeyG') {
        e.preventDefault();
        const prompt = buildPrompt('grammar');
        void sendMessage(buildMessageWithQuote(prompt, selectedText));
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        const prompt = buildPrompt('background');
        void sendMessage(buildMessageWithQuote(prompt, selectedText));
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        applyPrompt('plain');
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isOpen, selectedText, isLoading, buildPrompt, sendMessage, applyPrompt, buildMessageWithQuote]);

  const headerIconSize = 18;

  return (
    <div
      className={clsx(
        "relative w-[24%] h-full border-l flex flex-col text-sm",
        theme.bg,
        theme.text,
        theme.border
      )}
    >
      {/* Collapse Button */}
      <div className="absolute top-0 left-0 right-0 h-[25%] group/top">
        <button
          onClick={onClose}
          className={clsx(
            "absolute right-2 top-2 z-10",
            "w-7 h-7 rounded-full transition-opacity",
            "opacity-0 group-hover/top:opacity-100",
            "flex items-center justify-center",
            theme.textMuted,
            theme.hover
          )}
          title="收起"
        >
          <X size={headerIconSize} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-28 space-y-3">
        {messages.length === 0 && (
          <div className={clsx("text-center py-8", theme.textMuted)}>
            <p className="text-sm">选择文字后可以在这里提问</p>
            <p className={clsx("text-xs mt-2", theme.textMuted)}>
              例如：这个词是什么意思？
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={clsx("w-full pt-2.5 pb-2 border-t", theme.border)}>
            <div className="mb-1 text-[11px] font-medium tracking-wide uppercase">
              {msg.role === 'user' ? (
                <span className={theme.textMuted}>你</span>
              ) : (
                <span className={theme.textMuted}>助手</span>
              )}
            </div>
            <p className={clsx(
              "text-sm whitespace-pre-wrap",
              msg.role === 'user' ? theme.textUser : theme.textAssistant
            )}>
              {msg.content}
            </p>
          </div>
        ))}

        {isLoading && (
          <div className={clsx("w-full pt-2.5 pb-2 border-t", theme.border)}>
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {error && (
          <div className={clsx("text-center text-sm py-2", theme.textMuted)}>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={clsx("absolute inset-x-0 bottom-0 px-2 pt-2 pb-3", theme.bgInput)}>
        <div className={clsx(
          "flex flex-col gap-2 rounded-[4px] border px-2 py-1.5 min-h-[56px]",
          theme.border
        )}>
          {quotedText && (
            <div
              className={clsx(
                "rounded-[10px] px-1 h-[22px] flex items-center",
                theme.isDark ? "bg-zinc-900/40" : theme.isSepia ? "bg-[#f6edd8]" : "bg-zinc-50"
              )}
              onMouseEnter={() => setIsQuoteHover(true)}
              onMouseLeave={() => setIsQuoteHover(false)}
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setQuotedText('');
                    onClearSelection();
                  }}
                  className={clsx(
                    "flex-shrink-0 rounded p-0.5 transition-colors",
                    theme.isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500"
                  )}
                  title={isQuoteHover ? "清除引用" : "引用"}
                >
                  {isQuoteHover ? <X size={12} /> : <Quote size={12} />}
                </button>
                <p className={clsx("text-sm line-clamp-1 flex-1", theme.isDark ? "text-zinc-100" : "text-zinc-800")}>
                  {quotedText}
                </p>
              </div>
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题..."
            className={clsx(
              "flex-1 resize-none bg-transparent px-0 py-0 text-sm leading-snug focus:outline-none min-h-[22px]",
              theme.isDark ? "placeholder:text-zinc-500" : "placeholder:text-zinc-400"
            )}
            rows={1}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
