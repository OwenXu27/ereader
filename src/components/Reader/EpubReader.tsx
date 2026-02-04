import { useState, useRef, useEffect, useCallback } from 'react';
import type { NavItem } from 'epubjs';
import { useBookStore } from '../../store/useBookStore';
import { useTheme } from '../../hooks/useTheme';
import { useEpubReader } from '../../hooks/useEpubReader';
import { useReaderKeyboard } from '../../hooks/useReaderKeyboard';
import { Settings, ArrowLeft, List, X, MessageCircle } from 'lucide-react';

import clsx from 'clsx';
import { ChatSidebar } from './ChatSidebar';

interface EpubReaderProps {
  bookData: ArrayBuffer;
  initialCfi?: string;
  onClose: () => void;
}

export const EpubReader = ({ bookData, initialCfi, onClose }: EpubReaderProps) => {
  const [showControls, setShowControls] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [quickPromptMode, setQuickPromptMode] = useState<import('../../services/llm').QuickPromptMode | null>(null);
  
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setSettingsOpen } = useBookStore();
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

  // Handle quick prompt trigger
  const handleQuickPrompt = useCallback((mode: import('../../services/llm').QuickPromptMode) => {
    setQuickPromptMode(mode);
  }, []);

  // Keyboard navigation
  useReaderKeyboard({
    renditionRef,
    onClose,
    showToc,
    showChat,
    onShowChat: () => setShowChat(true),
    selectedText,
    onQuickPrompt: handleQuickPrompt,
  });

  // Text selection listener
  useEffect(() => {
    const handleSelection = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>;
      setSelectedText(customEvent.detail.text);
    };
    window.addEventListener('reader-selection', handleSelection);
    return () => window.removeEventListener('reader-selection', handleSelection);
  }, []);

  // Resize rendition when chat sidebar toggles
  useEffect(() => {
    if (!renditionRef.current || !isReady) return;
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 350);
    return () => clearTimeout(timer);
  }, [showChat, isReady, renditionRef]);

  // Cleanup controls timer
  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  const handleEdgeHover = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const handleContainerClick = useCallback(() => {
    containerRef.current?.focus();
  }, [containerRef]);

  // Recursive TOC renderer
  const renderTocItems = (items: NavItem[], level = 0) => {
    return items.map((item, index) => (
      <div key={index}>
        <button
          onClick={() => goToChapter(item.href)}
          className={clsx(
            "w-full text-left py-2 px-3 rounded-lg transition-colors text-sm",
            theme.hover,
            currentChapter === item.label && clsx(theme.hover, "font-medium")
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {item.label}
        </button>
        {item.subitems && item.subitems.length > 0 && renderTocItems(item.subitems, level + 1)}
      </div>
    ));
  };

  const toolbarIconSize = 18;

  return (
    <div 
      className={clsx("relative w-full h-full transition-colors duration-300 overflow-hidden outline-none flex", theme.bg)}
    >
      {/* Reader Area */}
      <div 
        ref={containerRef}
        tabIndex={0}
        onClick={handleContainerClick}
        className={clsx(
          "relative h-full transition-all duration-300 outline-none w-[76%]",
          showChat ? "" : "mx-auto"
        )}
      >
        <div ref={viewerRef} className="absolute inset-0 w-full h-full" />

        {/* Top edge hover zone */}
        <div 
          className="absolute top-0 left-0 right-0 h-12 z-15"
          onMouseEnter={handleEdgeHover}
        />

        {/* Controls Overlay */}
        <div className={clsx(
          "absolute inset-0 z-20 pointer-events-none transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          {/* Top Bar */}
          <div 
            className={clsx(
              "absolute top-0 left-0 right-0 p-4",
              showControls ? "pointer-events-auto" : "pointer-events-none"
            )}
            onMouseEnter={handleEdgeHover}
          >
            <div
              className={clsx(
                "flex items-center justify-between max-w-4xl mx-auto gap-2",
                "px-3 py-2 rounded-xl border backdrop-blur-sm",
                theme.toolbarBg,
                theme.border,
                theme.toolbarText
              )}
            >
              <button 
                onClick={onClose} 
                className={clsx("p-2 rounded-full transition-colors", theme.hover, theme.toolbarButtonText)}
              >
                <ArrowLeft size={toolbarIconSize} />
              </button>
              
              <button 
                onClick={() => setShowToc(true)} 
                className={clsx("p-2 rounded-full transition-colors", theme.hover, theme.toolbarButtonText)}
                title="Table of Contents"
              >
                <List size={toolbarIconSize} />
              </button>
              
              <div className="flex-1 min-w-0">
                <h1 className={clsx("text-sm font-medium truncate px-4 rounded-full py-1.5 text-center", theme.toolbarText)}>
                  {currentChapter || 'Reader'}
                </h1>
              </div>

              <button 
                onClick={() => setShowChat(true)} 
                className={clsx(
                  "p-2 rounded-full transition-colors",
                  selectedText 
                    ? "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200"
                    : theme.hover
                )}
                title="阅读助手"
              >
                <MessageCircle
                  size={toolbarIconSize}
                  className={selectedText ? "text-white dark:text-zinc-900" : theme.toolbarButtonText}
                />
              </button>

              <button 
                onClick={() => setSettingsOpen(true)} 
                className={clsx("p-2 rounded-full transition-colors", theme.hover, theme.toolbarButtonText)}
              >
                <Settings size={toolbarIconSize} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table of Contents Panel */}
      <div className={clsx(
        "absolute inset-y-0 left-0 z-30 w-72 max-w-[85vw] bg-white dark:bg-zinc-900 border-r transition-transform duration-300",
        showToc ? "translate-x-0 shadow-2xl" : "-translate-x-full shadow-none",
        theme.border
      )}>
        <div className="flex flex-col h-full">
          <div className={clsx("flex items-center justify-between p-4 border-b", theme.border)}>
            <h2 className={clsx("font-semibold text-sm tracking-wide", theme.text)}>
              目录
            </h2>
            <button 
              onClick={() => setShowToc(false)}
              className={clsx("p-1 rounded-full", theme.hover)}
            >
              <X size={toolbarIconSize} className={theme.toolbarButtonText} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {toc.length > 0 ? (
              renderTocItems(toc)
            ) : (
              <p className={clsx("text-sm p-4 text-center", theme.textMuted)}>No table of contents available</p>
            )}
          </div>
        </div>
      </div>

      {/* TOC Backdrop */}
      {showToc && (
        <div 
          className="absolute inset-0 z-25 bg-black/20" 
          onClick={() => setShowToc(false)}
        />
      )}

      {/* Chat Sidebar */}
      {showChat && (
        <ChatSidebar
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          selectedText={selectedText}
          onClearSelection={() => setSelectedText('')}
          quickPromptMode={quickPromptMode}
          onQuickPromptHandled={() => setQuickPromptMode(null)}
        />
      )}
    </div>
  );
};

export default EpubReader;
