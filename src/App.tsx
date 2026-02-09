import { useState, useEffect, useRef, useMemo } from 'react';
import { useBookStore, type UIFontFamily, type UIFontWeight, type UIFontPixelStyle } from './store/useBookStore';
import { EpubReader } from './components/Reader/EpubReader';
import { Library } from './components/Library/Library';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { getBookFile, getBooks } from './services/db';
import { useTheme } from './hooks/useTheme';

function App() {
  const { currentBook, setBooks, settings } = useBookStore();
  const [bookData, setBookData] = useState<ArrayBuffer | null>(null);
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
  
  // Track book ID to only reload when switching books, not on progress updates
  const currentBookId = currentBook?.id ?? null;
  const prevBookIdRef = useRef<string | null>(null);

  // Load library
  useEffect(() => {
    getBooks().then(books => setBooks(books));
  }, [setBooks]);

  // Only reload book file when book ID changes (not on progress updates)
  useEffect(() => {
    // Skip if same book
    if (currentBookId === prevBookIdRef.current) return;
    prevBookIdRef.current = currentBookId;

    const loadBook = async () => {
      if (currentBookId) {
        const data = await getBookFile(currentBookId);
        if (data) setBookData(data);
      } else {
        setBookData(null);
      }
    };
    loadBook();
  }, [currentBookId]);

  return (
    <div 
      className={`h-screen w-screen bg-theme-base text-theme-primary flex overflow-hidden font-reading ${theme.selection}`}
      style={{ fontWeight: uiFontWeight }}
    >
      {bookData && currentBook ? (
        <EpubReader 
          bookData={bookData} 
          initialCfi={currentBook.cfi}
          onClose={() => useBookStore.getState().setCurrentBook(null)}
        />
      ) : (
        <Library />
      )}
      <SettingsPanel />
    </div>
  );
}

export default App;
