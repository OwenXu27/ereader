import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book } from '../services/db';

interface Settings {
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  fontFamily: string;
  translationEnabled: boolean;
  apiUrl: string;
  apiKey: string;
  allowScriptedContent: boolean;
}

// Translation cache: bookId -> { textHash -> translation }
type TranslationCache = Record<string, Record<string, string>>;

interface ReaderState {
  currentBook: Book | null;
  settings: Settings;
  books: Book[];
  isSettingsOpen: boolean;
  translations: TranslationCache;
  setCurrentBook: (book: Book | null) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  setBooks: (books: Book[]) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  updateBookProgress: (id: string, cfi: string, progress: number) => void;
  saveTranslation: (bookId: string, textHash: string, translation: string) => void;
  getTranslation: (bookId: string, textHash: string) => string | undefined;
}

// Simple hash function for text
export function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export const useBookStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      currentBook: null,
      settings: {
        theme: 'light',
        fontSize: 16,
        fontFamily: 'serif',
        translationEnabled: false,
        apiUrl: '',
        apiKey: '',
        allowScriptedContent: false,
      },
      books: [],
      isSettingsOpen: false,
      translations: {},
      setCurrentBook: (book) => set({ currentBook: book }),
      updateSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      setBooks: (books) => set({ books }),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
      updateBookProgress: (id, cfi, progress) =>
        set((state) => ({
          // Update in books array
          books: state.books.map((book) =>
            book.id === id ? { ...book, cfi, progress } : book
          ),
          // Also update currentBook if it's the same book
          currentBook:
            state.currentBook?.id === id
              ? { ...state.currentBook, cfi, progress }
              : state.currentBook,
        })),
      saveTranslation: (bookId, textHash, translation) =>
        set((state) => ({
          translations: {
            ...state.translations,
            [bookId]: {
              ...state.translations[bookId],
              [textHash]: translation,
            },
          },
        })),
      getTranslation: (bookId, textHash) => {
        const state = get();
        return state.translations[bookId]?.[textHash];
      },
    }),
    {
      name: 'ereader-storage',
      partialize: (state) => ({
        settings: {
          theme: state.settings.theme,
          fontSize: state.settings.fontSize,
          fontFamily: state.settings.fontFamily,
          translationEnabled: state.settings.translationEnabled,
          allowScriptedContent: state.settings.allowScriptedContent,
          apiUrl: state.settings.apiUrl,
          apiKey: state.settings.apiKey, // Saved locally for convenience
        },
        translations: state.translations, // Persist translations
      }),
    }
  )
);
