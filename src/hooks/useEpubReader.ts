import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { type Book, type Rendition, type NavItem } from 'epubjs';
import { useBookStore, hashText } from '../store/useBookStore';
import { translateText, TranslationError } from '../services/llm';
import { THEME_COLORS, type ThemeType } from './useTheme';
import type { BookLocation, EpubContents, EpubSpine } from '../types/epubjs';
import { updateBookProgress as saveProgressToDB } from '../services/db';

interface UseEpubReaderOptions {
  bookData: ArrayBuffer;
  initialCfi?: string;
}

interface UseEpubReaderReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewerRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
  toc: NavItem[];
  currentChapter: string;
  currentCfiRef: React.MutableRefObject<string>;
  progressRef: React.MutableRefObject<number>;
  timeLeftRef: React.MutableRefObject<string | null>;
  renditionRef: React.MutableRefObject<Rendition | null>;
  bookRef: React.MutableRefObject<Book | null>;
  goToChapter: (href: string) => void;
}

export const useEpubReader = ({
  bookData,
  initialCfi,
}: UseEpubReaderOptions): UseEpubReaderReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [isReady, setIsReady] = useState(false);
  const currentCfiRef = useRef<string>(initialCfi || '');
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const progressRef = useRef(0);
  const timeLeftRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const startProgressRef = useRef<number | null>(null);
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressSaveAt = useRef(0);
  const pendingProgressSave = useRef<{ bookId: string; cfi: string; percentage: number } | null>(null);

  const { settings } = useBookStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressSaveTimer.current) {
        clearTimeout(progressSaveTimer.current);
      }
    };
  }, []);

  // Navigate to chapter
  const goToChapter = useCallback((href: string) => {
    const rendition = renditionRef.current;
    const book = bookRef.current;
    if (!rendition || !book) return;

    const tryDisplay = async () => {
      try {
        await rendition.display(href);
        return;
      } catch (e) {
        console.warn('Direct display failed for href:', href, e);
      }

      const hrefWithoutHash = href.split('#')[0];
      if (hrefWithoutHash !== href) {
        try {
          await rendition.display(hrefWithoutHash);
          return;
        } catch (e) {
          console.warn('Display without hash failed:', hrefWithoutHash, e);
        }
      }

      try {
        const spine = book.spine as EpubSpine;
        if (spine?.items) {
          for (const item of spine.items) {
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

  // Initialize book
  useEffect(() => {
    if (!viewerRef.current) return;

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

    // Register content hooks
    rendition.hooks.content.register((contents: EpubContents) => {
      const doc = contents.document;
      const head = doc.querySelector('head');
      if (!head) return;
      
      const bookId = useBookStore.getState().currentBook?.id;
      const currentThemeName = useBookStore.getState().settings.theme as ThemeType;
      const currentTheme = THEME_COLORS[currentThemeName];
      const cleanupHandlers: Array<() => void> = [];

      // Inject base styles
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

      // Inject theme styles
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

      // Add translation handlers
      const paragraphs = doc.querySelectorAll('p');
      paragraphs.forEach((p: HTMLElement) => {
        const text = p.textContent;
        if (!text || text.length < 5) return;

        const textHash = hashText(text);

        // Restore cached translation
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

            if (bookId) {
              useBookStore.getState().saveTranslation(bookId, textHash, translated);
            }
          } catch (err) {
            const errorMessage = err instanceof TranslationError ? err.message : 'Translation failed';
            loader.textContent = errorMessage;
            p.removeAttribute('data-translated');
          }
        };

        p.addEventListener('dblclick', handleDblClick);
        cleanupHandlers.push(() => p.removeEventListener('dblclick', handleDblClick));
      });

      // Keyboard handler
      const handleIframeKeydown = (e: KeyboardEvent) => {
        if (e.altKey && !e.metaKey && !e.ctrlKey && (e.code === 'KeyG' || e.code === 'KeyD' || e.code === 'KeyC')) {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('reader-quickprompt', { detail: { code: e.code } }));
          return;
        }

        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('reader-keydown', { detail: { key: e.key } }));
        }
      };
      doc.addEventListener('keydown', handleIframeKeydown);
      cleanupHandlers.push(() => doc.removeEventListener('keydown', handleIframeKeydown));

      // Selection handler
      const handleSelectionMouseup = () => {
        const selection = doc.getSelection();
        const selectedText = selection?.toString().trim();
        if (selectedText && selectedText.length > 0) {
          window.dispatchEvent(new CustomEvent('reader-selection', { detail: { text: selectedText } }));
        }
      };
      doc.addEventListener('mouseup', handleSelectionMouseup);
      cleanupHandlers.push(() => doc.removeEventListener('mouseup', handleSelectionMouseup));

      const cleanup = () => cleanupHandlers.forEach((fn) => fn());
      if (contents?.on) {
        try {
          contents.on('unload', cleanup);
        } catch {
          // Intentionally ignore errors from contents that don't support unload
        }
      }
    });

    rendition.display(initialCfi || undefined).then(() => {
      setIsReady(true);
    });

    // Progress save utilities
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

    // Handle location change
    rendition.on('relocated', (location: BookLocation) => {
      const startCfi = location.start.cfi;
      const percentage = location.start.percentage;

      currentCfiRef.current = startCfi;
      progressRef.current = percentage;

      // Find current chapter
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

      // Estimate time left
      if (startProgressRef.current === null) {
        startProgressRef.current = percentage;
        startTimeRef.current = Date.now();
      } else {
        const now = Date.now();
        const timeSpentMinutes = (now - startTimeRef.current) / 1000 / 60;
        const progressMade = percentage - startProgressRef.current;

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
        scheduleProgressSave(bookId, startCfi, percentage);
      }
    });

    const handleResize = () => {
      if (rendition) (rendition as unknown as { resize(): void }).resize();
    };
    window.addEventListener('resize', handleResize);

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
  }, [bookData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme changes
  useEffect(() => {
    if (!renditionRef.current || !isReady) return;

    const rendition = renditionRef.current;
    const currentTheme = THEME_COLORS[settings.theme as ThemeType];

    rendition.themes.fontSize(`${settings.fontSize}px`);

    try {
      const contents = rendition.getContents() as unknown as Array<{ document: Document }>;
      contents.forEach((content) => {
        const doc = content.document;
        if (doc) {
          const oldStyle = doc.getElementById('reader-theme-style');
          oldStyle?.remove();

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

  return {
    containerRef,
    viewerRef,
    isReady,
    toc,
    currentChapter,
    currentCfiRef,
    progressRef,
    timeLeftRef,
    renditionRef,
    bookRef,
    goToChapter,
  };
};

export default useEpubReader;
