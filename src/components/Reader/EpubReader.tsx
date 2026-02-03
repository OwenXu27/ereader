import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { type Book, type Rendition, type NavItem } from 'epubjs';
import { useBookStore, hashText } from '../../store/useBookStore';
import { translateText, TranslationError } from '../../services/llm';
import { Settings, ArrowLeft, List, X, MessageCircle } from 'lucide-react';
import { updateBookProgress as saveProgressToDB } from '../../services/db';
import clsx from 'clsx';
import { ChatSidebar } from './ChatSidebar';

// Theme colors - shared between initialization and dynamic updates
const THEME_COLORS = {
  light: {
    color: '#333333',
    background: '#F9F7F1',
    translationColor: '#52525b',
    borderColor: '#e4e4e7',
    translationBg: 'rgba(0,0,0,0.02)',
  },
  dark: {
    color: '#e4e4e7',
    background: '#18181b',
    translationColor: '#a1a1aa',
    borderColor: '#3f3f46',
    translationBg: 'rgba(255,255,255,0.05)',
  },
  sepia: {
    color: '#5b4636',
    background: '#f4ecd8',
    translationColor: '#8b6b4e',
    borderColor: '#e3d5b8',
    translationBg: 'rgba(91,70,54,0.05)',
  },
} as const;

interface EpubReaderProps {
  bookData: ArrayBuffer;
  initialCfi?: string;
  onClose: () => void;
}

export const EpubReader: React.FC<EpubReaderProps> = ({ bookData, initialCfi, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [isReady, setIsReady] = useState(false);
  const currentCfiRef = useRef<string>(initialCfi || '');
  const { settings, currentBook, setSettingsOpen } = useBookStore();
  
  const [showControls, setShowControls] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const progressRef = useRef(0);
  const timeLeftRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const startProgressRef = useRef<number | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressSaveAt = useRef(0);
  const pendingProgressSave = useRef<{ bookId: string; cfi: string; percentage: number } | null>(null);
  const [quickPromptMode, setQuickPromptMode] = useState<'grammar' | 'background' | 'plain' | null>(null);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      if (progressSaveTimer.current) {
        clearTimeout(progressSaveTimer.current);
      }
    };
  }, []);

  // Jump to chapter - handles various href formats
  const goToChapter = useCallback((href: string) => {
    const rendition = renditionRef.current;
    const book = bookRef.current;
    if (!rendition || !book) return;

    setShowToc(false);

    // Try multiple strategies to navigate
    const tryDisplay = async () => {
      try {
        // Strategy 1: Direct display (works for most cases)
        await rendition.display(href);
        return;
      } catch (e) {
        console.warn('Direct display failed for href:', href, e);
      }

      // Strategy 2: Try without anchor/hash
      const hrefWithoutHash = href.split('#')[0];
      if (hrefWithoutHash !== href) {
        try {
          await rendition.display(hrefWithoutHash);
          return;
        } catch (e) {
          console.warn('Display without hash failed:', hrefWithoutHash, e);
        }
      }

      // Strategy 3: Find matching spine item
      try {
        const spine = book.spine as any;
        if (spine && spine.items) {
          for (const item of spine.items) {
            // Match by href ending or containing the target
            if (item.href && (
              item.href === href ||
              item.href === hrefWithoutHash ||
              item.href.endsWith(href) ||
              item.href.endsWith(hrefWithoutHash) ||
              href.endsWith(item.href)
            )) {
              await rendition.display(item.href);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Spine navigation failed:', e);
      }

      console.error('All navigation strategies failed for:', href);
    };

    tryDisplay();
  }, []);

  // Initialize Book and Rendition
  useEffect(() => {
    if (!viewerRef.current) return;

    // Reset stats on book load
    startTimeRef.current = Date.now();
    startProgressRef.current = null;
    timeLeftRef.current = null;

    const book = ePub(bookData);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      manager: 'default',
      allowScriptedContent: useBookStore.getState().settings.allowScriptedContent,
    });
    renditionRef.current = rendition;

    // Load TOC
    book.loaded.navigation.then((nav) => {
      setToc(nav.toc);
    });

    // Register Hooks
    rendition.hooks.content.register((contents: any) => {
      const doc = contents.document;
      const head = doc.querySelector('head');
      const bookId = useBookStore.getState().currentBook?.id;
      const currentThemeName = useBookStore.getState().settings.theme;
      const currentTheme = THEME_COLORS[currentThemeName];
      const cleanupHandlers: Array<() => void> = [];
      
      // Inject structural styles for translation & paper theme base
      const style = doc.createElement('style');
      style.innerHTML = `
        body {
            font-family: 'Merriweather', 'Georgia', serif !important;
            line-height: 1.6 !important;
        }
        ::selection {
          background-color: rgba(208, 170, 33, 0.6) !important;
          color: inherit !important;
        }
        ::-moz-selection {
          background-color: rgba(208, 170, 33, 0.6) !important;
          color: inherit !important;
        }
        .translation-block {
          font-family: 'Inter', sans-serif;
          font-size: 0.9em;
          margin-top: 0.5em;
          margin-bottom: 1em;
          padding: 0.5em;
          line-height: 1.6;
          border-left-width: 2px;
          border-left-style: solid;
        }
        p {
            margin-bottom: 1em !important;
        }
        p.has-translation {
            cursor: default;
        }
      `;
      head.appendChild(style);
      
      // Inject theme-specific styles for new content
      const themeStyle = doc.createElement('style');
      themeStyle.id = 'reader-theme-style';
      themeStyle.textContent = `
        body {
          color: ${currentTheme.color} !important;
          background-color: ${currentTheme.background} !important;
        }
        .translation-block {
          color: ${currentTheme.translationColor} !important;
          border-left-color: ${currentTheme.borderColor} !important;
          background-color: ${currentTheme.translationBg} !important;
        }
      `;
      head.appendChild(themeStyle);

      // Add click handlers for paragraphs (translation) + restore cached translations
      const paragraphs = doc.querySelectorAll('p');
      paragraphs.forEach((p: HTMLElement) => {
        const text = p.textContent;
        if (!text || text.length < 5) return;
        
        const textHash = hashText(text);
        
        // Check for cached translation and restore it
        if (bookId) {
          const cachedTranslation = useBookStore.getState().getTranslation(bookId, textHash);
          if (cachedTranslation) {
            const translationBlock = doc.createElement('div');
            translationBlock.className = 'translation-block';
            translationBlock.textContent = cachedTranslation;
            p.appendChild(translationBlock);
            p.setAttribute('data-translated', 'true');
            p.classList.add('has-translation');
          }
        }
        
        p.style.cursor = 'pointer';
        const handleDblClick = async () => {
            const currentSettings = useBookStore.getState().settings;
            if (!currentSettings.translationEnabled) return;

            if (p.getAttribute('data-translated') === 'true') return;
            
            p.setAttribute('data-translated', 'loading');
            
            const loader = doc.createElement('div');
            loader.className = 'translation-block';
            loader.textContent = 'Translating...';
            p.appendChild(loader);
            
            try {
                const translated = await translateText(text, currentSettings.apiUrl, currentSettings.apiKey);
                loader.textContent = translated;
                p.setAttribute('data-translated', 'true');
                p.classList.add('has-translation');
                
                // Save translation to cache
                if (bookId) {
                  useBookStore.getState().saveTranslation(bookId, textHash, translated);
                }
            } catch (err) {
                const errorMessage = err instanceof TranslationError 
                  ? err.message 
                  : 'Translation failed';
                loader.textContent = errorMessage;
                p.removeAttribute('data-translated');
            }
        };
        p.addEventListener('dblclick', handleDblClick);
        cleanupHandlers.push(() => p.removeEventListener('dblclick', handleDblClick));
      });

      // Keyboard handler inside iframe - dispatch to parent window
      const handleIframeKeydown = (e: KeyboardEvent) => {
        // Quick prompt shortcuts inside iframe (Option/Alt + G/D/C)
        if (e.altKey && !e.metaKey && !e.ctrlKey && (e.code === 'KeyG' || e.code === 'KeyD' || e.code === 'KeyC')) {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('reader-quickprompt', { detail: { code: e.code } }));
          return;
        }

        // Navigation keys - forward to parent
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          // Dispatch custom event to parent window for unified handling
          window.dispatchEvent(new CustomEvent('reader-keydown', { detail: { key: e.key } }));
        }
      };
      doc.addEventListener('keydown', handleIframeKeydown);
      cleanupHandlers.push(() => doc.removeEventListener('keydown', handleIframeKeydown));

      // Capture text selection for chat sidebar
      const handleSelectionMouseup = () => {
        const selection = doc.getSelection();
        const text = selection?.toString().trim();
        if (text && text.length > 0) {
          window.dispatchEvent(new CustomEvent('reader-selection', { detail: { text } }));
        }
      };
      doc.addEventListener('mouseup', handleSelectionMouseup);
      cleanupHandlers.push(() => doc.removeEventListener('mouseup', handleSelectionMouseup));

      const cleanup = () => {
        cleanupHandlers.forEach((fn) => fn());
      };

      if (contents?.on) {
        try {
          contents.on('unload', cleanup);
        } catch {
          // ignore if contents doesn't support unload
        }
      }
    });

    rendition.display(initialCfi || undefined).then(() => {
      setIsReady(true);
      // Theme will be applied by the other effect
    });

    const flushProgressSave = () => {
      const pending = pendingProgressSave.current;
      if (!pending) return;
      const { bookId, cfi, percentage } = pending;
      pendingProgressSave.current = null;
      lastProgressSaveAt.current = Date.now();
      useBookStore.getState().updateBookProgress(bookId, cfi, percentage);
      saveProgressToDB(bookId, cfi, percentage);
    };

    const scheduleProgressSave = (bookId: string, cfi: string, percentage: number) => {
      pendingProgressSave.current = { bookId, cfi, percentage };
      const now = Date.now();
      const elapsed = now - lastProgressSaveAt.current;
      const throttleMs = 1500;

      if (elapsed >= throttleMs && !progressSaveTimer.current) {
        flushProgressSave();
        return;
      }

      if (!progressSaveTimer.current) {
        const wait = Math.max(throttleMs - elapsed, 0);
        progressSaveTimer.current = setTimeout(() => {
          progressSaveTimer.current = null;
          flushProgressSave();
        }, wait);
      }
    };

    rendition.on('relocated', (location: any) => {
      const startCfi = location.start.cfi;
      const percentage = location.start.percentage;
      
      currentCfiRef.current = startCfi;
      progressRef.current = percentage;

      // Find current chapter from TOC
      const currentHref = location.start.href;
      book.loaded.navigation.then((nav) => {
        const findChapter = (items: NavItem[]): string | null => {
          for (const item of items) {
            if (item.href && currentHref?.includes(item.href.split('#')[0])) {
              return item.label;
            }
            if (item.subitems) {
              const found = findChapter(item.subitems);
              if (found) return found;
            }
          }
          return null;
        };
        const chapter = findChapter(nav.toc);
        if (chapter) setCurrentChapter(chapter);
      });

      // Initialize start progress if needed
      if (startProgressRef.current === null) {
          startProgressRef.current = percentage;
          startTimeRef.current = Date.now();
      } else {
          // Estimate time left
          const now = Date.now();
          const timeSpentMinutes = (now - startTimeRef.current) / 1000 / 60;
          const progressMade = percentage - startProgressRef.current;

          // Only estimate if we've made some progress (>1%) and spent some time (>10s) to avoid noise
          if (progressMade > 0.01 && timeSpentMinutes > 0.1) {
             const estimatedTotalMinutes = timeSpentMinutes / progressMade;
             const remainingMinutes = estimatedTotalMinutes * (1 - percentage);
             
             if (remainingMinutes < 1) timeLeftRef.current = '< 1 min left';
             else if (remainingMinutes > 600) timeLeftRef.current = '> 10 hrs left';
             else timeLeftRef.current = `${Math.ceil(remainingMinutes)} min left`;
          }
      }

      const bookId = useBookStore.getState().currentBook?.id;
      if (bookId) {
        // Update both store (for UI) and IndexedDB (for persistence)
        scheduleProgressSave(bookId, startCfi, percentage);
      }
    });

    const handleResize = () => {
      if (rendition) (rendition as any).resize();
    };
    window.addEventListener('resize', handleResize);
    
    // Focus container initially
    setTimeout(() => containerRef.current?.focus(), 100);

    return () => {
      if (progressSaveTimer.current) {
        clearTimeout(progressSaveTimer.current);
        progressSaveTimer.current = null;
      }
      flushProgressSave();
      window.removeEventListener('resize', handleResize);
      book.destroy();
    };
  }, [bookData]); // Only re-run if book data changes
  
  // Separate effect for keyboard handling - uses refs to avoid stale closures
  const isNavigatingRef = useRef(false);
  
  useEffect(() => {
    // Unified handler for both native keydown and custom iframe events
    const handleNavigation = async (key: string) => {
      if (showToc) return;
      
      const rendition = renditionRef.current;
      if (!rendition) return;
      
      // Prevent navigation while previous one is in progress
      if (isNavigatingRef.current) return;
      
      if (key === 'ArrowRight' || key === ' ') {
        isNavigatingRef.current = true;
        try {
          await rendition.next();
        } finally {
          isNavigatingRef.current = false;
        }
      } else if (key === 'ArrowLeft') {
        isNavigatingRef.current = true;
        try {
          await rendition.prev();
        } finally {
          isNavigatingRef.current = false;
        }
      } else if (key === 'Escape') {
        onClose();
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleNavigation(e.key);
      }
    };
    
    // Handle custom events from iframe
    const handleIframeKeydown = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>;
      handleNavigation(customEvent.detail.key);
    };
    
    // Use capture phase on document to catch all events
    document.addEventListener('keydown', handleKeyDown, true);
    // Listen for custom events from iframe
    window.addEventListener('reader-keydown', handleIframeKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('reader-keydown', handleIframeKeydown);
    };
  }, [onClose, showToc]);
  
  // Keep focus on container when window regains focus (but not when chat is open)
  useEffect(() => {
    const handleWindowFocus = () => {
      // Don't steal focus if chat sidebar is open (user might be typing)
      if (showChat) return;
      setTimeout(() => containerRef.current?.focus(), 50);
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [showChat]);

  // Listen for text selection from iframe
  useEffect(() => {
    const handleSelection = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>;
      setSelectedText(customEvent.detail.text);
    };
    window.addEventListener('reader-selection', handleSelection);
    return () => window.removeEventListener('reader-selection', handleSelection);
  }, []);

  // Global keyboard shortcuts for quick prompts when chat is closed
  useEffect(() => {
    const triggerQuickPrompt = (code: 'KeyG' | 'KeyD' | 'KeyC') => {
      if (!selectedText || showToc) return;
      const mode = code === 'KeyG' ? 'grammar' : code === 'KeyD' ? 'background' : 'plain';
      setQuickPromptMode(mode);
      setShowChat(true);
    };

    const handleQuickPromptKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.code === 'KeyG' || e.code === 'KeyD' || e.code === 'KeyC') {
        e.preventDefault();
        triggerQuickPrompt(e.code as 'KeyG' | 'KeyD' | 'KeyC');
      }
    };

    const handleQuickPromptFromIframe = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string }>;
      const code = customEvent.detail.code;
      if (code === 'KeyG' || code === 'KeyD' || code === 'KeyC') {
        triggerQuickPrompt(code as 'KeyG' | 'KeyD' | 'KeyC');
      }
    };

    window.addEventListener('keydown', handleQuickPromptKey);
    window.addEventListener('reader-quickprompt', handleQuickPromptFromIframe);
    return () => {
      window.removeEventListener('keydown', handleQuickPromptKey);
      window.removeEventListener('reader-quickprompt', handleQuickPromptFromIframe);
    };
  }, [selectedText, showToc]);

  // Resize epub rendition when chat sidebar toggles
  useEffect(() => {
    if (!renditionRef.current || !isReady) return;
    
    // Small delay to allow CSS transition to complete
    const timer = setTimeout(() => {
      // Trigger window resize event for epub.js to recalculate
      window.dispatchEvent(new Event('resize'));
    }, 350);
    
    return () => clearTimeout(timer);
  }, [showChat, isReady]);

  // Apply theme and font size when settings change
  useEffect(() => {
    if (!renditionRef.current || !isReady) return;
    
    const rendition = renditionRef.current;
    const themes = rendition.themes;
    const currentTheme = THEME_COLORS[settings.theme];
    
    // Apply font size
    themes.fontSize(`${settings.fontSize}px`);
    
    // Directly inject CSS into iframe for reliable theme switching
    try {
      const contents = rendition.getContents() as unknown as any[];
      contents.forEach((content: any) => {
        const doc = content.document;
        if (doc) {
          // Remove old theme style if exists
          const oldStyle = doc.getElementById('reader-theme-style');
          if (oldStyle) {
            oldStyle.remove();
          }
          
          // Inject new theme style
          const style = doc.createElement('style');
          style.id = 'reader-theme-style';
          style.textContent = `
            body {
              color: ${currentTheme.color} !important;
              background-color: ${currentTheme.background} !important;
            }
            .translation-block {
              color: ${currentTheme.translationColor} !important;
              border-left-color: ${currentTheme.borderColor} !important;
              background-color: ${currentTheme.translationBg} !important;
            }
          `;
          doc.head.appendChild(style);
          
          // Also set inline styles for immediate effect
          if (doc.body) {
            doc.body.style.setProperty('color', currentTheme.color, 'important');
            doc.body.style.setProperty('background-color', currentTheme.background, 'important');
          }
        }
      });
    } catch (e) {
      console.error('Theme apply error:', e);
    }
  }, [settings.theme, settings.fontSize, isReady]);

  // Recursive TOC renderer
  const renderTocItems = (items: NavItem[], level = 0) => {
    return items.map((item, index) => (
      <div key={index}>
        <button
          onClick={() => goToChapter(item.href)}
          className={clsx(
            "w-full text-left py-2 px-3 rounded-lg transition-colors text-sm",
            "hover:bg-zinc-100 dark:hover:bg-zinc-800",
            currentChapter === item.label && "bg-zinc-100 dark:bg-zinc-800 font-medium"
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {item.label}
        </button>
        {item.subitems && item.subitems.length > 0 && renderTocItems(item.subitems, level + 1)}
      </div>
    ));
  };

  // Ensure keyboard focus when clicking anywhere in the reader
  const handleContainerClick = useCallback(() => {
    containerRef.current?.focus();
  }, []);

  // Handle mouse entering edge zones to show controls
  const handleEdgeHover = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Get background color based on theme
  const bgColor = settings.theme === 'dark' ? 'bg-[#18181b]' 
                : settings.theme === 'sepia' ? 'bg-[#f4ecd8]' 
                : 'bg-[#F9F7F1]';

  return (
    <div 
      className={clsx("relative w-full h-full transition-colors duration-300 overflow-hidden outline-none flex", bgColor)}
    >
      {/* Reader Area - fixed content width, centered when no chat */}
      <div 
        ref={containerRef}
        tabIndex={0}
        onClick={handleContainerClick}
        onFocus={() => {}}
        className={clsx(
          "relative h-full transition-all duration-300 outline-none w-[76%]",
          showChat ? "" : "mx-auto"
        )}
      >
        <div ref={viewerRef} className="absolute inset-0 w-full h-full" />

      {/* Top edge hover zone - triggers control panel */}
      <div 
        className="absolute top-0 left-0 right-0 h-12 z-15"
        onMouseEnter={handleEdgeHover}
      />
      

      {/* Controls Overlay - appears on edge hover */}
      <div className={clsx(
        "absolute inset-0 z-20 pointer-events-none transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        {/* Top Bar */}
        <div 
          className={clsx(
            "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/20 to-transparent",
            showControls ? "pointer-events-auto" : "pointer-events-none"
          )}
          onMouseEnter={handleEdgeHover}
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto gap-2">
            <button 
              onClick={onClose} 
              className="p-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white dark:hover:bg-zinc-700 transition-colors"
            >
              <ArrowLeft size={20} className="text-zinc-700 dark:text-zinc-300" />
            </button>
            
            <button 
              onClick={() => setShowToc(true)} 
              className="p-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white dark:hover:bg-zinc-700 transition-colors"
              title="Table of Contents"
            >
              <List size={20} className="text-zinc-700 dark:text-zinc-300" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate px-4 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full py-1.5 shadow-sm text-center">
                {currentChapter || currentBook?.title || 'Reader'}
              </h1>
            </div>

            <button 
              onClick={() => setShowChat(true)} 
              className={clsx(
                "p-2 backdrop-blur-sm rounded-full shadow-sm transition-colors",
                selectedText 
                  ? "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200" 
                  : "bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700"
              )}
              title="阅读助手"
            >
              <MessageCircle size={20} className={selectedText ? "text-white dark:text-zinc-900" : "text-zinc-700 dark:text-zinc-300"} />
            </button>

            <button 
              onClick={() => setSettingsOpen(true)} 
              className="p-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white dark:hover:bg-zinc-700 transition-colors"
            >
              <Settings size={20} className="text-zinc-700 dark:text-zinc-300" />
            </button>
          </div>
        </div>

      </div>

      </div>

      {/* Table of Contents Panel - positioned relative to outer reader container */}
      <div className={clsx(
        "absolute inset-y-0 left-0 z-30 w-72 max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300",
        showToc ? "translate-x-0 shadow-2xl" : "-translate-x-full shadow-none"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 tracking-wide">
              目录
            </h2>
            <button 
              onClick={() => setShowToc(false)}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {toc.length > 0 ? (
              renderTocItems(toc)
            ) : (
              <p className="text-sm text-zinc-500 p-4 text-center">No table of contents available</p>
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

      {/* Chat Sidebar - fixed 24% width, pushes centered reader to the left */}
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
