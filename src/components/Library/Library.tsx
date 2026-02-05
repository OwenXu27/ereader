import React, { useRef, useState } from 'react';
import { useBookStore } from '../../store/useBookStore';
import { useTranslation } from '../../i18n';
import { saveBook, deleteBook } from '../../services/db';
import { Plus, X, Book as BookIcon, Settings, Loader2 } from 'lucide-react';
import { LeCorbusierCover } from '../BookCover/LeCorbusierCover';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ePub from 'epubjs';

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

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const Library: React.FC = () => {
  const { books, setBooks, setCurrentBook, setSettingsOpen } = useBookStore();
  const { t, language } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const book = ePub(arrayBuffer);
      const metadata = await book.loaded.metadata;
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
    } catch (err) {
      console.error('Error loading book:', err);
      setError(err instanceof Error ? err.message : (t('common.error') as string));
    } finally {
      setIsLoading(false);
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

  const contentMargin = '12%';
  const readingCount = books.filter(b => b.progress > 0 && b.progress < 1).length;
  const completedCount = books.filter(b => b.progress >= 1).length;

  // Format number with leading zero based on language
  const fmtNum = (n: number) => language === 'zh' 
    ? n.toString().padStart(2, '0')
    : n.toString();

  return (
    <div className="flex-1 flex flex-col h-full bg-theme-base font-ui selection:bg-warm-500/20">
      {/* Header - Refined Swiss Style */}
      <header 
        className="pt-8 pb-6 shrink-0"
        style={{ marginLeft: contentMargin, marginRight: contentMargin }}
      >
        <div className="flex items-end justify-between">
          {/* Left: Typography-focused Title Block */}
          <div className="flex flex-col gap-1">
            {/* Title Row */}
            <div className="flex items-baseline gap-4">
              <h1 className="text-[15px] font-normal text-theme-primary tracking-[-0.02em]">
                {t('library.title') as string}
              </h1>
              <span className="text-[12px] font-light tabular-nums text-theme-muted/50">
                {fmtNum(books.length)}
              </span>
            </div>
            
            {/* Status Row - Condensed */}
            {(readingCount > 0 || completedCount > 0) && (
              <div className="flex items-center gap-3 text-[10px] tracking-[0.05em]">
                {readingCount > 0 && (
                  <span className="text-warm-500/90">
                    {t('library.reading') as string} {fmtNum(readingCount)}
                  </span>
                )}
                {readingCount > 0 && completedCount > 0 && (
                  <span className="text-theme-muted/30">/</span>
                )}
                {completedCount > 0 && (
                  <span className="text-theme-muted/50">
                    {t('library.completed') as string} {fmtNum(completedCount)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Action Cluster */}
          <div className="flex items-center gap-1">
            <IconButton 
              onClick={() => setSettingsOpen(true)} 
              title={t('library.settings') as string}
            >
              <Settings size={15} strokeWidth={1.5} />
            </IconButton>
            <IconButton 
              onClick={handleButtonClick}
              disabled={isLoading}
              title={t('library.addBook') as string}
              variant="primary"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} strokeWidth={1.5} />
              )}
            </IconButton>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".epub,application/epub+zip" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </div>
        </div>

        {/* Subtle bottom rule */}
        <div className="mt-6 h-px bg-gradient-to-r from-theme-muted/20 via-theme-muted/10 to-transparent" />
      </header>

      {/* Content Area */}
      <div 
        className="flex-1 overflow-y-auto pb-12"
        style={{ 
          marginLeft: contentMargin, 
          marginRight: contentMargin,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Error Message */}
        {error && (
          <div className="mb-8 p-3 text-[11px] text-theme-primary bg-theme-elevated/30 rounded-sm border border-theme-muted/10 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        {/* Books Grid */}
        {books.length > 0 ? (
          <div className="grid grid-cols-4 gap-6">
            {books.map((book, index) => (
              <BookCard 
                key={book.id} 
                book={book} 
                index={index}
                onClick={() => setCurrentBook(book)}
                onRemove={(e) => handleRemove(e, book.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState onAdd={handleButtonClick} t={t} />
        )}
      </div>
    </div>
  );
};

// Icon Button Component
interface IconButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}

const IconButton = ({ onClick, children, title, disabled, variant = 'default' }: IconButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "w-9 h-9 flex items-center justify-center rounded-full",
      "transition-all duration-200 ease-out",
      "disabled:opacity-40 disabled:cursor-not-allowed",
      variant === 'default' && [
        "text-theme-muted hover:text-theme-primary",
        "hover:bg-theme-elevated/50"
      ],
      variant === 'primary' && [
        "bg-theme-elevated text-theme-primary",
        "hover:bg-warm-500 hover:text-white",
        "shadow-sm hover:shadow-md"
      ]
    )}
  >
    {children}
  </button>
);

// Book Card Component
interface BookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    cover?: string;
    progress: number;
  };
  index: number;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

const BookCard = ({ book, index, onClick, onRemove }: BookCardProps) => (
  <div 
    onClick={onClick}
    className={cn(
      "group relative aspect-[2/3] cursor-pointer",
      "transition-all duration-500 ease-out",
      "hover:scale-[1.02] hover:-translate-y-1",
      "active:scale-[0.98] active:duration-200"
    )}
    style={{ 
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      animationDelay: `${index * 50}ms`
    }}
  >
    {/* Cover */}
    <LeCorbusierCover 
      title={book.title}
      author={book.author}
    />
    
    {/* Progress Indicator - Minimal dot */}
    {book.progress > 0 && (
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
        <div className="flex-1 h-px bg-theme-base/40 overflow-hidden">
          <div 
            className="h-full bg-warm-500 transition-all duration-700 ease-out"
            style={{ width: `${book.progress * 100}%` }} 
          />
        </div>
        {book.progress >= 1 && (
          <div className="w-1 h-1 rounded-full bg-warm-500" />
        )}
      </div>
    )}
    
    {/* Delete Button - Appears on hover with delay */}
    <button 
      onClick={onRemove}
      className={cn(
        "absolute top-2 right-2 w-7 h-7 flex items-center justify-center",
        "bg-theme-base/80 backdrop-blur-sm text-theme-muted rounded-full",
        "opacity-0 translate-y-1",
        "group-hover:opacity-100 group-hover:translate-y-0",
        "transition-all duration-200 ease-out delay-100",
        "hover:bg-theme-base hover:text-theme-primary"
      )}
    >
      <X size={13} strokeWidth={1.5} />
    </button>

    {/* Hover overlay - subtle */}
    <div className={cn(
      "absolute inset-0 bg-gradient-to-t from-theme-base/10 to-transparent",
      "opacity-0 group-hover:opacity-100",
      "transition-opacity duration-300 pointer-events-none"
    )} />
  </div>
);

// Empty State Component
interface EmptyStateProps {
  onAdd: () => void;
  t: (key: string) => string | Record<string, string>;
}

const EmptyState = ({ onAdd, t }: EmptyStateProps) => (
  <div className="flex flex-col items-start justify-center min-h-[50vh] text-theme-muted">
    {/* Visual element */}
    <div className="mb-6 relative">
      <div className="w-16 h-20 border border-dashed border-theme-muted/20 rounded-sm flex items-center justify-center">
        <BookIcon size={24} className="opacity-20" strokeWidth={1} />
      </div>
      {/* Decorative lines */}
      <div className="absolute -right-4 top-1/2 w-6 h-px bg-theme-muted/10" />
      <div className="absolute -right-4 top-1/2 translate-y-2 w-4 h-px bg-theme-muted/10" />
    </div>

    {/* Text content */}
    <p className="text-[13px] text-theme-primary/80 mb-1">{t('library.empty') as string}</p>
    <p className="text-[11px] text-theme-muted/60 mb-6">{t('library.emptyHint') as string}</p>

    {/* Action */}
    <button
      onClick={onAdd}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-theme-elevated text-theme-secondary text-[11px]",
        "hover:bg-warm-500 hover:text-white",
        "transition-all duration-300 ease-out",
        "group"
      )}
    >
      <Plus size={14} className="transition-transform duration-300 group-hover:rotate-90" />
      <span>{t('library.addBook') as string}</span>
    </button>
  </div>
);

export default Library;
