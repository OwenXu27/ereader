import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Quote } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sendChatMessage, type ChatMessageType, TranslationError, getQuickPrompt, type QuickPromptMode } from '../../services/llm';
import { useBookStore } from '../../store/useBookStore';
import { useTranslation } from '../../i18n';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  
  const { settings } = useBookStore();
  const { t, language } = useTranslation();

  // Track messages for async operations
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
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
    return getQuickPrompt(mode, selectedText, language);
  }, [selectedText, language]);

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

  const hasContent = input.trim().length > 0;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 w-[24%] max-w-[420px] min-w-[320px]",
        "bg-theme-base",
        "transition-transform duration-normal ease-out-custom",
        "flex flex-col font-ui",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
      style={{ borderLeft: '0.5px solid var(--border-primary)' }}
    >
      {/* Header - 53px fixed height, matches main header */}
      <header className="h-[53px] flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-theme-primary font-ui">
          {t('reader.aiAssistant') as string}
        </h2>
        {/* Close button - refined hover */}
        <button
          onClick={onClose}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-md",
            "text-theme-secondary",
            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "hover:scale-105 hover:text-theme-primary hover:bg-theme-elevated/60",
            "active:scale-95 active:bg-theme-elevated/80"
          )}
          title={t('reader.close') as string}
          type="button"
        >
          <X size={16} />
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-0">
        {messages.length === 0 && (
          <div className="text-center py-12 text-theme-muted">
            <p className="text-sm mb-1 font-ui">{t('reader.placeholder') as string}</p>
            <p className="text-xs opacity-60 font-ui">
              {t('reader.placeholderHint') as string}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <QuickPromptButton 
                label={`Alt + G ${t('reader.grammar') as string}`}
                onClick={() => selectedText && applyPrompt('grammar')}
                disabled={!selectedText}
              />
              <QuickPromptButton 
                label={`Alt + D ${t('reader.background') as string}`}
                onClick={() => selectedText && applyPrompt('background')}
                disabled={!selectedText}
              />
              <QuickPromptButton 
                label={`Alt + C ${t('reader.quote') as string}`}
                onClick={() => selectedText && applyPrompt('plain')}
                disabled={!selectedText}
              />
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className="w-full py-3"
            style={idx > 0 ? { borderTop: '0.5px solid var(--border-primary)' } : undefined}
          >
            <div className="mb-1.5 text-[11px] font-semibold tracking-wide uppercase font-ui">
              {msg.role === 'user' ? (
                <span className="text-theme-muted">{t('chat.you') as string}</span>
              ) : (
                <span className="text-warm-500">{t('chat.assistant') as string}</span>
              )}
            </div>
            <div className={cn(
              "text-sm whitespace-pre-wrap leading-relaxed font-ui",
              msg.role === 'user' ? "text-theme-secondary" : "text-theme-primary"
            )}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="w-full py-3" style={{ borderTop: '0.5px solid var(--border-primary)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-warm-500 uppercase font-ui">{t('chat.assistant') as string}</span>
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full animate-pulse-dot" style={{ animationDelay: '0ms', backgroundColor: 'var(--text-muted)' }} />
                <span className="w-1 h-1 rounded-full animate-pulse-dot" style={{ animationDelay: '150ms', backgroundColor: 'var(--text-muted)' }} />
                <span className="w-1 h-1 rounded-full animate-pulse-dot" style={{ animationDelay: '300ms', backgroundColor: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="py-3 text-sm text-theme-muted font-ui" style={{ borderTop: '0.5px solid var(--border-primary)' }}>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 px-3 py-3 bg-theme-base">
        <div className={cn(
          "flex flex-col gap-2 rounded-lg border px-3 py-2.5",
          "bg-theme-input",
          hasContent && "border-warm-500/50",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hover:border-theme-muted/30"
        )} style={{ borderWidth: '0.5px', borderColor: hasContent ? undefined : 'var(--border-primary)' }}>
          {/* Quote Bar */}
          {quotedText && (
            <div
              className={cn(
                "h-[22px] flex items-center gap-1.5 px-2 rounded-[10px]",
                "bg-theme-elevated/60"
              )}
              onMouseEnter={() => setIsQuoteHover(true)}
              onMouseLeave={() => setIsQuoteHover(false)}
            >
              <button
                onClick={() => {
                  setQuotedText('');
                  onClearSelection();
                }}
                className={cn(
                  "flex-shrink-0 rounded p-0.5",
                  "text-theme-muted",
                  "transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  "hover:scale-110 hover:text-theme-primary hover:bg-theme-elevated",
                  "active:scale-95"
                )}
                title={isQuoteHover ? "清除引用" : "引用"}
              >
                {isQuoteHover ? <X size={12} /> : <Quote size={12} />}
              </button>
              <p className="text-sm line-clamp-1 flex-1 text-theme-primary font-ui">
                {quotedText}
              </p>
            </div>
          )}
          
          {/* Input Row */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'zh' ? "按 Enter 发送..." : "Press Enter to send..."}
            className={cn(
              "w-full resize-none bg-transparent text-sm leading-relaxed",
              "text-theme-primary placeholder:text-theme-muted",
              "focus:outline-none min-h-[22px] py-0.5",
              "custom-scrollbar font-ui"
            )}
            rows={1}
            disabled={isLoading}
          />
        </div>
      </div>
    </aside>
  );
};

// Quick Prompt Button Component - Refined hover
const QuickPromptButton = ({ label, onClick, disabled }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full px-3 py-2 rounded-md text-xs text-left font-ui",
      "bg-theme-elevated text-theme-secondary",
      "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
      "hover:scale-[1.01] hover:bg-theme-surface hover:text-theme-primary hover:shadow-sm",
      "active:scale-[0.99] active:bg-theme-elevated",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-theme-elevated disabled:hover:shadow-none"
    )}
  >
    {label}
  </button>
);

export default ChatSidebar;
