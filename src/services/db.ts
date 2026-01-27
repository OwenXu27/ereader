import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  cfi: string;
  progress: number;
  addedAt: number;
}

interface EReaderDB extends DBSchema {
  books: {
    key: string;
    value: Book;
  };
  files: {
    key: string;
    value: ArrayBuffer;
  };
}

const DB_NAME = 'ereader-db';
const DB_VERSION = 1;

// Cached database instance to avoid repeated initialization
let dbInstance: IDBPDatabase<EReaderDB> | null = null;
let dbPromise: Promise<IDBPDatabase<EReaderDB>> | null = null;

/**
 * Get or create the database instance (singleton pattern)
 */
const getDB = async (): Promise<IDBPDatabase<EReaderDB>> => {
  // Return cached instance if available
  if (dbInstance) return dbInstance;

  // Return pending promise if initialization is in progress
  if (dbPromise) return dbPromise;

  // Initialize new database connection
  dbPromise = openDB<EReaderDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    },
  });

  dbInstance = await dbPromise;
  dbPromise = null;
  return dbInstance;
};

/**
 * Save a book and its file to the database
 */
export const saveBook = async (book: Book, file: ArrayBuffer): Promise<void> => {
  const db = await getDB();
  // Use transaction for atomic operation
  const tx = db.transaction(['books', 'files'], 'readwrite');
  await Promise.all([
    tx.objectStore('books').put(book),
    tx.objectStore('files').put(file, book.id),
    tx.done,
  ]);
};

/**
 * Get all books from the database
 */
export const getBooks = async (): Promise<Book[]> => {
  const db = await getDB();
  return db.getAll('books');
};

/**
 * Get a book's file by ID
 */
export const getBookFile = async (id: string): Promise<ArrayBuffer | undefined> => {
  const db = await getDB();
  return db.get('files', id);
};

/**
 * Update a book's reading progress
 */
export const updateBookProgress = async (
  id: string,
  cfi: string,
  progress: number
): Promise<void> => {
  const db = await getDB();
  const book = await db.get('books', id);
  if (book) {
    book.cfi = cfi;
    book.progress = progress;
    await db.put('books', book);
  }
};

/**
 * Delete a book and its file from the database
 */
export const deleteBook = async (id: string): Promise<void> => {
  const db = await getDB();
  // Use transaction for atomic operation
  const tx = db.transaction(['books', 'files'], 'readwrite');
  await Promise.all([
    tx.objectStore('books').delete(id),
    tx.objectStore('files').delete(id),
    tx.done,
  ]);
};
