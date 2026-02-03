import React, { useRef, useState } from 'react';
import { useBookStore } from '../../store/useBookStore';
import { saveBook, deleteBook } from '../../services/db';
import { Plus, Trash2, Book as BookIcon, Settings, Loader2 } from 'lucide-react';
import ePub from 'epubjs';

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const extractCoverDataUrl = async (book: ePub.Book): Promise<string> => {
  let coverUrl = '';
  try {
    coverUrl = await book.coverUrl();
    if (!coverUrl) return '';
    if (coverUrl.startsWith('data:')) return coverUrl;

    const response = await fetch(coverUrl);
    if (!response.ok) return '';
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch (e) {
    console.warn('No cover found', e);
    return '';
  } finally {
    if (coverUrl.startsWith('blob:')) {
      URL.revokeObjectURL(coverUrl);
    }
  }
};

/**
 * Generate a UUID, with fallback for browsers without crypto.randomUUID
 */
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback implementation (RFC4122 v4 compliant)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const Library: React.FC = () => {
  const { books, setBooks, setCurrentBook, setSettingsOpen } = useBookStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('ArrayBuffer loaded, size:', arrayBuffer.byteLength);
      
      const book = ePub(arrayBuffer);
      const metadata = await book.loaded.metadata;
      console.log('Metadata loaded:', metadata);
      
      const coverUrl = await extractCoverDataUrl(book);

      const newBook = {
        id: generateUUID(),
        title: metadata.title || file.name.replace('.epub', ''),
        author: metadata.creator || 'Unknown',
        cover: coverUrl,
        cfi: '',
        progress: 0,
        addedAt: Date.now(),
      };

      await saveBook(newBook, arrayBuffer);
      setBooks([...books, newBook]);
      console.log('Book saved successfully');
    } catch (err) {
      console.error('Error loading book:', err);
      setError(err instanceof Error ? err.message : 'Failed to load book');
    } finally {
      setIsLoading(false);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteBook(id);
    setBooks(books.filter(b => b.id !== id));
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-serif">Library</h1>
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setSettingsOpen(true)}
                className="p-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
                <Settings size={20} />
            </button>
            <button 
                onClick={handleButtonClick}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg cursor-pointer hover:opacity-90 transition disabled:opacity-50"
            >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                <span>{isLoading ? 'Loading...' : 'Add Book'}</span>
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".epub,application/epub+zip" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <div 
              key={book.id}
              onClick={() => setCurrentBook(book)}
              className="group relative aspect-[2/3] bg-white dark:bg-zinc-800 rounded shadow-sm hover:shadow-md transition cursor-pointer border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            >
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={`${book.title} cover`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookIcon size={48} className="text-zinc-300" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/95 via-black/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="font-medium text-white text-sm line-clamp-2">{book.title}</h3>
                <p className="text-xs text-zinc-200 mt-1">{book.author}</p>
              </div>
              {book.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40">
                  <div className="h-full bg-blue-500" style={{ width: `${book.progress * 100}%` }} />
                </div>
              )}
              <button 
                onClick={(e) => handleRemove(e, book.id)}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {books.length === 0 && (
            <div className="col-span-full text-center py-20 text-zinc-400">
              <p>No books yet. Upload an EPUB to start reading.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
