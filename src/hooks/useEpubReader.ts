import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { type Book, type Rendition, type NavItem } from 'epubjs';
import { useBookStore } from '../store/useBookStore';
import type { ThemeType } from './useTheme';
import type { EpubContents, EpubSpine } from '../types/epubjs';
import { useEpubProgress } from './useEpubProgress';
import { useEpubTheme, getBaseStyleCSS, getThemeStyleCSS } from './useEpubTheme';
import { registerTranslationHandlers, registerIframeKeyboard, registerSelectionHandler } from './useEpubTranslation';

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
  iframeDocRef: React.MutableRefObject<Document | null>;
  translationMapRef: React.MutableRefObject<Map<HTMLElement, () => Promise<void>>>;
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
  const iframeDocRef = useRef<Document | null>(null);
  const translationMapRef = useRef<Map<HTMLElement, () => Promise<void>>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<string>('');

  const { settings } = useBookStore();

  const {
    currentCfiRef,
    progressRef,
    timeLeftRef,
    createRelocatedHandler,
    flushProgressSave,
    resetTimingState,
  } = useEpubProgress(initialCfi);

  useEpubTheme(renditionRef, isReady, settings);

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

  useEffect(() => {
    if (!viewerRef.current) return;

    resetTimingState();

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

    book.loaded.navigation.then((nav) => {
      setToc(nav.toc);
    });

    rendition.hooks.content.register(async (contents: EpubContents) => {
      const doc = contents.document;
      const head = doc.querySelector('head');
      if (!head) return;

      const htmlEl = doc.documentElement;
      if (!htmlEl.getAttribute('lang') && !htmlEl.getAttribute('xml:lang')) {
        try {
          const metadata = await book.loaded.metadata;
          if (metadata.language) {
            htmlEl.setAttribute('lang', metadata.language);
          }
        } catch { /* ignore */ }
      }

      const bookId = useBookStore.getState().currentBook?.id;
      const currentThemeName = useBookStore.getState().settings.theme as ThemeType;
      const currentFontSize = useBookStore.getState().settings.fontSize;

      const baseStyle = doc.createElement('style');
      baseStyle.innerHTML = getBaseStyleCSS();
      head.appendChild(baseStyle);

      const themeStyle = doc.createElement('style');
      themeStyle.id = 'reader-theme-style';
      themeStyle.textContent = getThemeStyleCSS(currentThemeName, currentFontSize);
      head.appendChild(themeStyle);

      const { cleanups: translationCleanup, triggerMap } = registerTranslationHandlers(doc, bookId, currentThemeName);
      iframeDocRef.current = doc;
      translationMapRef.current = triggerMap;

      const keyboardCleanup = registerIframeKeyboard(doc);
      const selectionCleanup = registerSelectionHandler(doc);

      const cleanup = () => {
        translationCleanup.forEach((fn) => fn());
        keyboardCleanup();
        selectionCleanup();
        if (iframeDocRef.current === doc) {
          iframeDocRef.current = null;
          translationMapRef.current = new Map();
        }
      };

      if (contents?.on) {
        try {
          contents.on('unload', cleanup);
        } catch {
          // Intentionally ignore errors from contents that don't support unload
        }
      }
    });

    rendition.display(initialCfi || undefined).then(() => {
      rendition.themes.fontSize(`${settings.fontSize}px`);
      setIsReady(true);
    });

    const handleRelocated = createRelocatedHandler(book, setCurrentChapter);
    rendition.on('relocated', handleRelocated);

    const handleResize = () => {
      if (rendition) (rendition as unknown as { resize(): void }).resize();
    };
    window.addEventListener('resize', handleResize);

    setTimeout(() => containerRef.current?.focus(), 100);

    return () => {
      flushProgressSave();
      window.removeEventListener('resize', handleResize);
      book.destroy();
    };
  }, [bookData]); // eslint-disable-line react-hooks/exhaustive-deps

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
    iframeDocRef,
    translationMapRef,
    goToChapter,
  };
};

export default useEpubReader;
