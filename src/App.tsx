import { useState, useEffect, useRef } from 'react';
import { useBookStore } from './store/useBookStore';
import { EpubReader } from './components/Reader/EpubReader';
import { Library } from './components/Library/Library';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { getBookFile, getBooks } from './services/db';

function App() {
  const { currentBook, settings, setBooks } = useBookStore();
  const [bookData, setBookData] = useState<ArrayBuffer | null>(null);
  // Track book ID to only reload when switching books, not on progress updates
  const currentBookId = currentBook?.id ?? null;
  const prevBookIdRef = useRef<string | null>(null);

  // Load library
  useEffect(() => {
    getBooks().then(books => setBooks(books));
  }, [setBooks]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

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
    <div className="h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex overflow-hidden">
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
