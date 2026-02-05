import { useState, useEffect, useRef } from 'react';
import { useBookStore } from './store/useBookStore';
import { EpubReader } from './components/Reader/EpubReader';
import { Library } from './components/Library/Library';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { getBookFile, getBooks } from './services/db';
import { useTheme } from './hooks/useTheme';

function App() {
  const { currentBook, setBooks } = useBookStore();
  const [bookData, setBookData] = useState<ArrayBuffer | null>(null);
  const theme = useTheme();
  
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
    <div className={`h-screen w-screen bg-theme-base text-theme-primary flex overflow-hidden font-reading ${theme.selection}`}>
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
