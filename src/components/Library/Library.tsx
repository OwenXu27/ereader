import React, { useRef, useState } from 'react';
import { useBookStore } from '../../store/useBookStore';
import { saveBook, deleteBook } from '../../services/db';
import { Plus, Trash2, Book as BookIcon, Settings, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ePub from 'epubjs';

// Utility for cleaner tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
    const rawCoverUrl = await book.coverUrl();
    if (!rawCoverUrl) return '';
    coverUrl = rawCoverUrl;
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

  const iconSize = 18;

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-semibold font-reading text-theme-primary tracking-tight">
            书库
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSettingsOpen(true)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg",
                "text-theme-secondary hover:text-theme-primary",
                "hover:bg-theme-surface transition-all duration-fast ease-out-custom",
                "active:scale-95"
              )}
            >
              <Settings size={iconSize} />
            </button>
            <button 
              onClick={handleButtonClick}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg",
                "bg-theme-primary text-theme-base",
                "hover:opacity-90 transition-all duration-fast ease-out-custom",
                "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                "font-ui text-sm font-medium"
              )}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>{isLoading ? '导入中...' : '添加书籍'}</span>
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 text-red-600 rounded-lg text-sm" style={{ border: '0.5px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {/* Books Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {books.map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              onClick={() => setCurrentBook(book)}
              onRemove={(e) => handleRemove(e, book.id)}
            />
          ))}

          {books.length === 0 && (
            <div className="col-span-full text-center py-20 text-theme-muted">
              <BookIcon size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">暂无书籍，导入 EPUB 开始阅读</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Book Card Component
interface BookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    cover?: string;
    progress: number;
  };
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

const BookCard = ({ book, onClick, onRemove }: BookCardProps) => (
  <div 
    onClick={onClick}
    className={cn(
      "group relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer",
      "bg-theme-surface shadow-sm",
      "transition-all duration-normal ease-out-custom",
      "hover:-translate-y-1 hover:shadow-md",
      "active:scale-[0.98]"
    )}
  >
    {/* Cover Image */}
    {book.cover ? (
      <img
        src={book.cover}
        alt={`${book.title} cover`}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center bg-theme-elevated">
        <BookIcon size={40} className="text-theme-muted/50" />
      </div>
    )}
    
    {/* Gradient Overlay */}
    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
    
    {/* Book Info */}
    <div className="absolute inset-x-0 bottom-0 p-3">
      <h3 className="font-medium text-white text-sm line-clamp-2 leading-snug">
        {book.title}
      </h3>
      <p className="text-xs text-white/70 mt-1 line-clamp-1">{book.author}</p>
    </div>
    
    {/* Progress Bar */}
    {book.progress > 0 && (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
        <div 
          className="h-full bg-warm-500 transition-all duration-slow" 
          style={{ width: `${book.progress * 100}%` }} 
        />
      </div>
    )}
    
    {/* Delete Button */}
    <button 
      onClick={onRemove}
      className={cn(
        "absolute top-2 right-2 w-8 h-8 flex items-center justify-center",
        "bg-red-500 text-white rounded-md",
        "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100",
        "transition-all duration-fast ease-out-custom",
        "hover:bg-red-600 active:scale-95"
      )}
    >
      <Trash2 size={14} />
    </button>
  </div>
);

export default Library;
