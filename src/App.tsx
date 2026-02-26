import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useBookStore, type UIFontFamily, type UIFontWeight, type UIFontPixelStyle } from './store/useBookStore';
import { EpubReader } from './components/Reader/EpubReader';
import { Library } from './components/Library/Library';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { getBookFile, getBooks } from './services/db';
import { useTheme } from './hooks/useTheme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

function App() {
  const { currentBook, setBooks, settings } = useBookStore();
  const [bookData, setBookData] = useState<ArrayBuffer | null>(null);
  const [isBookLoading, setIsBookLoading] = useState(false);
  const [bookLoadError, setBookLoadError] = useState<string | null>(null);
  const theme = useTheme();

  // Apply UI font CSS variable
  useEffect(() => {
    const fontMap: Record<UIFontFamily, string> = {
      sans: 'var(--font-sans)',
      mono: 'var(--font-mono)',
      pixel: 'var(--font-pixel)',
    };
    document.documentElement.style.setProperty('--font-ui', fontMap[settings.uiFontFamily]);
  }, [settings.uiFontFamily]);

  // Apply pixel style CSS variable when pixel is selected
  useEffect(() => {
    const pixelMap: Record<UIFontPixelStyle, string> = {
      square: '"Geist Pixel Square"',
      circle: '"Geist Pixel Circle"',
      grid: '"Geist Pixel Grid"',
      line: '"Geist Pixel Line"',
      triangle: '"Geist Pixel Triangle"',
    };
    document.documentElement.style.setProperty('--font-pixel', pixelMap[settings.uiFontPixelStyle]);
  }, [settings.uiFontPixelStyle]);

  // Calculate font weight
  const uiFontWeight = useMemo(() => {
    const weightMap: Record<UIFontWeight, number> = {
      normal: 400,
      medium: 500,
      semibold: 600,
    };
    return weightMap[settings.uiFontWeight];
  }, [settings.uiFontWeight]);
  
  const handleCloseReader = useCallback(() => {
    useBookStore.getState().setCurrentBook(null);
  }, []);

  // Track book ID to only reload when switching books, not on progress updates
  const currentBookId = currentBook?.id ?? null;
  const prevBookIdRef = useRef<string | null>(null);

  // Load library
  useEffect(() => {
    getBooks().then(books => setBooks(books));
  }, [setBooks]);

  // Only reload book file when book ID changes (not on progress updates)
  useEffect(() => {
    if (currentBookId === prevBookIdRef.current) return;
    prevBookIdRef.current = currentBookId;

    const loadBook = async () => {
      if (currentBookId) {
        setIsBookLoading(true);
        setBookLoadError(null);
        try {
          const data = await getBookFile(currentBookId);
          if (data) {
            setBookData(data);
          } else {
            setBookLoadError('Book file not found. It may have been deleted.');
            useBookStore.getState().setCurrentBook(null);
          }
        } catch {
          setBookLoadError('Failed to load book file.');
          useBookStore.getState().setCurrentBook(null);
        } finally {
          setIsBookLoading(false);
        }
      } else {
        setBookData(null);
        setBookLoadError(null);
      }
    };
    loadBook();
  }, [currentBookId]);

  return (
    <div 
      className={`h-full w-full bg-theme-base text-theme-primary flex overflow-hidden font-reading ${theme.selection}`}
      style={{ fontWeight: uiFontWeight }}
    >
      {isBookLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-theme-muted" />
        </div>
      ) : bookData && currentBook ? (
        <ErrorBoundary onReset={handleCloseReader}>
          <EpubReader 
            bookData={bookData} 
            initialCfi={currentBook.cfi}
            onClose={handleCloseReader}
          />
        </ErrorBoundary>
      ) : (
        <>
          {bookLoadError && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-theme-elevated text-theme-primary text-sm shadow-lg border border-theme-muted/10 animate-in fade-in slide-in-from-top-2 duration-300">
              {bookLoadError}
            </div>
          )}
          <Library />
        </>
      )}
      <SettingsPanel />
    </div>
  );
}

export default App;
