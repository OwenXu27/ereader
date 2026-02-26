import { useEffect, useRef } from 'react';
import type { Book, NavItem } from 'epubjs';
import { useBookStore } from '../store/useBookStore';
import { updateBookProgress as saveProgressToDB } from '../services/db';
import type { BookLocation } from '../types/epubjs';

interface ProgressState {
  currentCfiRef: React.MutableRefObject<string>;
  progressRef: React.MutableRefObject<number>;
  timeLeftRef: React.MutableRefObject<string | null>;
  createRelocatedHandler: (
    book: Book,
    setCurrentChapter: (ch: string) => void,
  ) => (location: BookLocation) => void;
  flushProgressSave: () => void;
  resetTimingState: () => void;
}

export const useEpubProgress = (initialCfi: string = ''): ProgressState => {
  const currentCfiRef = useRef<string>(initialCfi);
  const progressRef = useRef(0);
  const timeLeftRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const startProgressRef = useRef<number | null>(null);
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressSaveAt = useRef(0);
  const pendingProgressSave = useRef<{ bookId: string; cfi: string; percentage: number } | null>(null);

  useEffect(() => {
    return () => {
      if (progressSaveTimer.current) {
        clearTimeout(progressSaveTimer.current);
      }
    };
  }, []);

  const flushProgressSave = () => {
    const pending = pendingProgressSave.current;
    if (!pending) return;
    const { bookId, cfi, percentage } = pending;
    pendingProgressSave.current = null;
    lastProgressSaveAt.current = Date.now();
    useBookStore.getState().updateBookProgress(bookId, cfi, percentage);
    saveProgressToDB(bookId, cfi, percentage);
  };

  const scheduleProgressSave = (bookId: string, cfi: string, percentage: number) => {
    pendingProgressSave.current = { bookId, cfi, percentage };
    const now = Date.now();
    const elapsed = now - lastProgressSaveAt.current;
    const throttleMs = 1500;

    if (elapsed >= throttleMs && !progressSaveTimer.current) {
      flushProgressSave();
      return;
    }

    if (!progressSaveTimer.current) {
      const wait = Math.max(throttleMs - elapsed, 0);
      progressSaveTimer.current = setTimeout(() => {
        progressSaveTimer.current = null;
        flushProgressSave();
      }, wait);
    }
  };

  const resetTimingState = () => {
    startTimeRef.current = Date.now();
    startProgressRef.current = null;
    timeLeftRef.current = null;
  };

  const createRelocatedHandler = (
    book: Book,
    setCurrentChapter: (ch: string) => void,
  ) => (location: BookLocation) => {
    const startCfi = location.start.cfi;
    const percentage = location.start.percentage;

    currentCfiRef.current = startCfi;
    progressRef.current = percentage;

    const currentHref = location.start.href;
    book.loaded.navigation.then((nav) => {
      const findChapter = (items: NavItem[]): string | null => {
        for (const item of items) {
          if (item.href && currentHref?.includes(item.href.split('#')[0])) {
            return item.label;
          }
          if (item.subitems) {
            const found = findChapter(item.subitems);
            if (found) return found;
          }
        }
        return null;
      };
      const chapter = findChapter(nav.toc);
      if (chapter) setCurrentChapter(chapter);
    });

    if (startProgressRef.current === null) {
      startProgressRef.current = percentage;
      startTimeRef.current = Date.now();
    } else {
      const now = Date.now();
      const timeSpentMinutes = (now - startTimeRef.current) / 1000 / 60;
      const progressMade = percentage - startProgressRef.current;

      if (progressMade > 0.01 && timeSpentMinutes > 0.1) {
        const estimatedTotalMinutes = timeSpentMinutes / progressMade;
        const remainingMinutes = estimatedTotalMinutes * (1 - percentage);

        if (remainingMinutes < 1) timeLeftRef.current = '< 1 min left';
        else if (remainingMinutes > 600) timeLeftRef.current = '> 10 hrs left';
        else timeLeftRef.current = `${Math.ceil(remainingMinutes)} min left`;
      }
    }

    const bookId = useBookStore.getState().currentBook?.id;
    if (bookId) {
      scheduleProgressSave(bookId, startCfi, percentage);
    }
  };

  return {
    currentCfiRef,
    progressRef,
    timeLeftRef,
    createRelocatedHandler,
    flushProgressSave,
    resetTimingState,
  };
};
