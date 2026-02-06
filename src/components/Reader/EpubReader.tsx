import { useState, useRef, useEffect, useCallback } from 'react';
import type { NavItem } from 'epubjs';
import { useBookStore } from '../../store/useBookStore';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';
import { useEpubReader } from '../../hooks/useEpubReader';
import { useReaderKeyboard } from '../../hooks/useReaderKeyboard';
import { Settings, ArrowLeft, List, X, MessageCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChatSidebar } from './ChatSidebar';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EpubReaderProps {
  bookData: ArrayBuffer;
  initialCfi?: string;
  onClose: () => void;
}

export const EpubReader = ({ bookData, initialCfi, onClose }: EpubReaderProps) => {
  const [showHeader, setShowHeader] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [quickPromptMode, setQuickPromptMode] = useState<import('../../services/llm').QuickPromptMode | null>(null);
  
  const hideHeaderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setSettingsOpen } = useBookStore();
  const { t } = useTranslation();
  const theme = useTheme();

  const {
    containerRef,
    viewerRef,
    isReady,
    toc,
    currentChapter,
    renditionRef,
    goToChapter,
  } = useEpubReader({ bookData, initialCfi });

  const handleQuickPrompt = useCallback((mode: import('../../services/llm').QuickPromptMode) => {
    setQuickPromptMode(mode);
  }, []);

  useReaderKeyboard({
    renditionRef,
    onClose,
    showToc,
    showChat,
    onShowChat: () => setShowChat(true),
    selectedText,
    onQuickPrompt: handleQuickPrompt,
  });

  useEffect(() => {
    const handleSelection = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>;
      setSelectedText(customEvent.detail.text);
    };
    window.addEventListener('reader-selection', handleSelection);
    return () => window.removeEventListener('reader-selection', handleSelection);
  }, []);

  useEffect(() => {
    if (!renditionRef.current || !isReady) return;
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 350);
    return () => clearTimeout(timer);
  }, [showChat, isReady, renditionRef]);

  const handleHeaderTriggerEnter = useCallback(() => {
    setShowHeader(true);
    if (hideHeaderTimer.current) {
      clearTimeout(hideHeaderTimer.current);
    }
    hideHeaderTimer.current = setTimeout(() => {
      setShowHeader(false);
    }, 3000);
  }, []);

  const handleHeaderMouseEnter = useCallback(() => {
    if (hideHeaderTimer.current) {
      clearTimeout(hideHeaderTimer.current);
    }
  }, []);

  const handleHeaderMouseLeave = useCallback(() => {
    hideHeaderTimer.current = setTimeout(() => {
      setShowHeader(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (hideHeaderTimer.current) {
        clearTimeout(hideHeaderTimer.current);
      }
    };
  }, []);

  const handleToggleToc = useCallback(() => {
    if (showToc) {
      setShowToc(false);
    } else {
      setShowChat(false);
      setShowToc(true);
    }
  }, [showToc]);

  const handleToggleChat = useCallback(() => {
    if (showChat) {
      setShowChat(false);
    } else {
      setShowToc(false);
      setShowChat(true);
    }
  }, [showChat]);

  const getContentLayout = () => {
    if (showToc) {
      return { 
        marginLeft: '24%', 
        marginRight: '0%',
        headerLeft: '24%',
        headerRight: '0%'
      };
    }
    if (showChat) {
      return { 
        marginLeft: '0%', 
        marginRight: '24%',
        headerLeft: '0%',
        headerRight: '24%'
      };
    }
    return { 
      marginLeft: '12%', 
      marginRight: '12%',
      headerLeft: '12%',
      headerRight: '12%'
    };
  };

  const layout = getContentLayout();

  const renderTocItems = (items: NavItem[], level = 0) => {
    return items.map((item, index) => (
      <div key={index}>
        <button
          onClick={() => {
            goToChapter(item.href);
            setShowToc(false);
          }}
          className={cn(
            "w-full text-left py-2 px-3 rounded-md transition-all duration-fast text-sm font-ui",
            theme.hover,
            currentChapter === item.label && "font-medium bg-warm-500 text-white"
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {item.label}
        </button>
      </div>
    ));
  };

  const iconSize = 16;

  return (
    <div className="relative w-full h-full overflow-hidden bg-theme-base">
      {/* Header Trigger Zone - Follows content layout */}
      <div 
        className="fixed top-0 h-[12px] z-50 transition-all duration-slow ease-out-custom"
        style={{ left: layout.headerLeft, right: layout.headerRight }}
        onMouseEnter={handleHeaderTriggerEnter}
      />

      {/* Primary Header - Follows content layout */}
      <header
        onMouseEnter={handleHeaderMouseEnter}
        onMouseLeave={handleHeaderMouseLeave}
        className={cn(
          "fixed top-0 z-40 transition-all duration-slow ease-out-custom",
          showHeader ? "translate-y-0" : "-translate-y-full"
        )}
        style={{
          left: layout.headerLeft,
          right: layout.headerRight,
        }}
      >
        <div 
          className={cn(
            "h-[53px] flex items-center justify-between px-4",
            "bg-theme-base"
          )}
          style={{ borderBottom: '0.5px solid var(--border-primary)' }}
        >
          <div className="flex items-center gap-1">
            <HeaderIconButton onClick={onClose} title={t('reader.back') as string}>
              <ArrowLeft size={iconSize} />
            </HeaderIconButton>
            <HeaderIconButton 
              onClick={handleToggleToc} 
              title={showToc ? (t('reader.close') as string) : (t('reader.toc') as string)}
              active={showToc}
            >
              <List size={iconSize} />
            </HeaderIconButton>
          </div>

          <div className="flex-1 min-w-0 px-8">
            <h1 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-theme-primary truncate text-center font-ui">
              {currentChapter || (t('reader.aiAssistant') as string)}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <HeaderIconButton 
              onClick={handleToggleChat} 
              title={showChat ? (t('reader.close') as string) : (t('reader.aiAssistant') as string)}
              active={showChat}
              highlight={!!selectedText}
            >
              <MessageCircle size={iconSize} />
            </HeaderIconButton>
            <HeaderIconButton onClick={() => setSettingsOpen(true)} title={t('library.settings') as string}>
              <Settings size={iconSize} />
            </HeaderIconButton>
          </div>
        </div>
      </header>

      {/* Reader Area */}
      <div 
        ref={containerRef}
        tabIndex={0}
        className="relative h-full transition-all duration-slow ease-out-custom outline-none"
        style={{
          marginLeft: layout.marginLeft,
          marginRight: layout.marginRight,
        }}
      >
        <div ref={viewerRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* TOC Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-[24%] max-w-[420px] min-w-[280px]",
          "bg-theme-base",
          "transition-transform duration-normal ease-out-custom",
          "flex flex-col",
          showToc ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ borderRight: '0.5px solid var(--border-primary)' }}
      >
        <div className="h-[53px] flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
          <h2 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-theme-primary font-ui">
            {t('reader.toc') as string}
          </h2>
          <HeaderIconButton onClick={() => setShowToc(false)} title={t('reader.close') as string}>
            <X size={iconSize} />
          </HeaderIconButton>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {toc.length > 0 ? (
            renderTocItems(toc)
          ) : (
            <p className="text-sm text-theme-muted text-center py-8 font-ui">{t('reader.noToc') as string}</p>
          )}
        </div>
      </aside>

      {/* TOC Backdrop */}
      {showToc && (
        <div 
          className="fixed inset-0 z-25 bg-ink-900/10 backdrop-blur-[1px] transition-opacity duration-normal"
          onClick={() => setShowToc(false)}
        />
      )}

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        selectedText={selectedText}
        onClearSelection={() => setSelectedText('')}
        quickPromptMode={quickPromptMode}
        onQuickPromptHandled={() => setQuickPromptMode(null)}
      />
    </div>
  );
};

interface HeaderIconButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  active?: boolean;
  highlight?: boolean;
}

const HeaderIconButton = ({ onClick, children, title, active, highlight }: HeaderIconButtonProps) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      "w-9 h-9 flex items-center justify-center rounded-md",
      "transition-all duration-fast ease-out-custom",
      "text-theme-secondary hover:text-theme-primary",
      active && "bg-warm-500 text-white",
      highlight && "bg-theme-primary text-theme-base",
      "hover:bg-theme-elevated active:scale-95"
    )}
  >
    {children}
  </button>
);

export default EpubReader;
