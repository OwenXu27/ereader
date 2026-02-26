import React, { useRef, useState, useCallback } from 'react';
import { useBookStore } from '../../store/useBookStore';
import { useTranslation } from '../../i18n';
import { saveBook, deleteBook } from '../../services/db';
import { Plus, X, Book as BookIcon, Settings, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { LeCorbusierCover } from '../BookCover/LeCorbusierCover';
import { cn } from '../../utils/cn';
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

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

  const handleRemove = useCallback((e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setDeleteTarget({ id, title });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteBook(deleteTarget.id);
    setBooks(books.filter(b => b.id !== deleteTarget.id));
    setDeleteTarget(null);
  }, [deleteTarget, books, setBooks]);

  const contentMargin = '12%';
  const readingCount = books.filter(b => b.progress > 0 && b.progress < 1).length;
  const completedCount = books.filter(b => b.progress >= 1).length;

  // Format number with leading zero based on language
  const fmtNum = (n: number) => language === 'zh' 
    ? n.toString().padStart(2, '0')
    : n.toString();

  return (
    <div className="flex-1 flex flex-col h-full bg-theme-base font-ui selection:bg-warm-500/20">
      {/* Header */}
      <header 
        className="pt-6 shrink-0"
        style={{ marginLeft: contentMargin, marginRight: contentMargin }}
      >
        {/* Primary bar — 53px, matches reader/TOC/chat headers */}
        <div className="h-[53px] flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[17px] font-medium text-theme-primary tracking-[-0.02em]">
              {t('library.title') as string}
            </h1>
            <span className="text-[13px] tabular-nums text-theme-muted/60">
              {fmtNum(books.length)}
            </span>
          </div>

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

        {/* Status row */}
        {(readingCount > 0 || completedCount > 0) && (
          <div className="flex items-center gap-3 text-[11px] tracking-[0.05em] pb-1">
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

        <div className="mt-3 mb-6" style={{ borderBottom: '0.5px solid var(--border-primary)' }} />
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
          <div className="mb-8 p-3 text-[11px] text-theme-primary bg-theme-elevated/30 rounded-md max-w-md animate-in fade-in slide-in-from-top-2 duration-300" style={{ border: '0.5px solid var(--border-primary)' }}>
            {error}
          </div>
        )}

        {/* Books Grid */}
        {books.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {books.map((book, index) => (
              <BookCard 
                key={book.id} 
                book={book} 
                index={index}
                onClick={() => setCurrentBook(book)}
                onRemove={(e) => handleRemove(e, book.id, book.title)}
              />
            ))}
          </div>
        ) : (
          <EmptyState onAdd={handleButtonClick} t={t} />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 bg-ink-900/20 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-theme-base w-full max-w-xs overflow-hidden font-ui rounded-[4px]"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 0.5px var(--border-primary)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-4">
                <h3 className="text-[14px] font-normal text-theme-primary tracking-[-0.02em]">
                  {t('library.confirmDelete') as string || 'Delete book?'}
                </h3>
                <p className="text-[12px] text-theme-muted mt-1.5 leading-relaxed line-clamp-2">
                  {deleteTarget.title}
                </p>
              </div>
              <div className="px-6 pb-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-[11px] font-medium",
                    "text-theme-secondary",
                    "transition-all duration-150",
                    "hover:bg-theme-elevated/60",
                    "active:scale-95"
                  )}
                >
                  {t('common.cancel') as string || 'Cancel'}
                </button>
                <button
                  onClick={confirmDelete}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-[11px] font-medium",
                    "bg-red-500/10 text-red-600 dark:text-red-400",
                    "transition-all duration-150",
                    "hover:bg-red-500/20 hover:scale-105",
                    "active:scale-95"
                  )}
                >
                  {t('common.delete') as string || 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Icon Button Component - Refined hover states
const IconButton = ({ onClick, children, title, disabled, variant = 'default' }: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "w-9 h-9 flex items-center justify-center rounded-md",
      "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
      "hover:scale-105 active:scale-95",
      variant === 'default' && [
        "text-theme-muted",
        "hover:text-theme-primary hover:bg-theme-elevated/60",
        "active:bg-theme-elevated/80"
      ],
      variant === 'primary' && [
        "bg-theme-elevated text-theme-primary",
        "hover:bg-warm-500 hover:text-white",
        "shadow-sm hover:shadow-lg hover:shadow-warm-500/25",
        "active:bg-warm-600 active:shadow-md"
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

const BookCard = React.memo(({ book, index, onClick, onRemove }: BookCardProps) => (
  <div 
    onClick={onClick}
    className={cn(
      "group relative aspect-[2/3] cursor-pointer rounded-[4px] overflow-hidden",
      "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
      "hover:scale-[1.03] hover:-translate-y-1.5",
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
    
    {/* Progress Indicator */}
    {book.progress > 0 && (
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
        <div className="flex-1 h-[2.5px] bg-theme-base/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-warm-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${book.progress * 100}%` }} 
          />
        </div>
        {book.progress >= 1 && (
          <div className="w-1.5 h-1.5 rounded-full bg-warm-500" />
        )}
      </div>
    )}
    
    {/* Delete Button - Refined hover */}
    <button 
      onClick={onRemove}
      className={cn(
        "absolute top-2 right-2 w-7 h-7 flex items-center justify-center",
        "bg-theme-base/90 backdrop-blur-sm text-theme-muted rounded-full",
        "opacity-0 translate-y-1 scale-90",
        "group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] delay-75",
        "hover:bg-theme-base hover:text-theme-primary hover:shadow-md",
        "active:scale-90 active:bg-theme-elevated"
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
));

// Empty State Component
interface EmptyStateProps {
  onAdd: () => void;
  t: (key: string) => string | Record<string, string>;
}

const EmptyState = ({ onAdd, t }: EmptyStateProps) => (
  <div className="flex flex-col items-start justify-center min-h-[50vh] text-theme-muted">
    {/* Visual element */}
    <div className="mb-6 relative">
      <div className="w-16 h-20 rounded-md flex items-center justify-center" style={{ border: '0.5px dashed var(--border-primary)' }}>
        <BookIcon size={24} className="opacity-20" strokeWidth={1} />
      </div>
      {/* Decorative lines */}
      <div className="absolute -right-4 top-1/2 w-6 h-px bg-theme-muted/10" />
      <div className="absolute -right-4 top-1/2 translate-y-2 w-4 h-px bg-theme-muted/10" />
    </div>

    {/* Text content */}
    <p className="text-[13px] text-theme-primary/80 mb-1">{t('library.empty') as string}</p>
    <p className="text-[11px] text-theme-muted/60 mb-6">{t('library.emptyHint') as string}</p>

    {/* Action - Refined button */}
    <button
      onClick={onAdd}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-md",
        "bg-theme-elevated text-theme-secondary text-[11px] font-medium",
        "shadow-sm hover:shadow-md",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "hover:bg-warm-500 hover:text-white hover:shadow-warm-500/25 hover:scale-105",
        "active:scale-95 active:bg-warm-600 active:shadow-sm",
        "group"
      )}
    >
      <Plus size={14} className="transition-transform duration-300 group-hover:rotate-90" />
      <span>{t('library.addBook') as string}</span>
    </button>
  </div>
);

export default Library;
