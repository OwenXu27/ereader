import { useEffect, useRef, useCallback } from 'react';
import type { Rendition } from 'epubjs';
import type { QuickPromptMode } from '../services/llm';

interface UseReaderKeyboardOptions {
  renditionRef: React.MutableRefObject<Rendition | null>;
  onClose: () => void;
  showToc: boolean;
  showChat: boolean;
  onShowChat: () => void;
  selectedText: string;
  onQuickPrompt: (mode: QuickPromptMode) => void;
}

export const useReaderKeyboard = ({
  renditionRef,
  onClose,
  showToc,
  showChat,
  onShowChat,
  selectedText,
  onQuickPrompt,
}: UseReaderKeyboardOptions) => {
  const isNavigatingRef = useRef(false);

  // Handle navigation
  const handleNavigation = useCallback(async (key: string) => {
    if (showToc) return;

    const rendition = renditionRef.current;
    if (!rendition) return;
    if (isNavigatingRef.current) return;

    if (key === 'ArrowRight' || key === ' ') {
      isNavigatingRef.current = true;
      try {
        await rendition.next();
      } finally {
        isNavigatingRef.current = false;
      }
    } else if (key === 'ArrowLeft') {
      isNavigatingRef.current = true;
      try {
        await rendition.prev();
      } finally {
        isNavigatingRef.current = false;
      }
    } else if (key === 'Escape') {
      onClose();
    }
  }, [renditionRef, onClose, showToc]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleNavigation(e.key);
      }
    };

    const handleIframeKeydown = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>;
      handleNavigation(customEvent.detail.key);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('reader-keydown', handleIframeKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('reader-keydown', handleIframeKeydown);
    };
  }, [handleNavigation]);

  // Quick prompt shortcuts
  useEffect(() => {
    const triggerQuickPrompt = (code: 'KeyG' | 'KeyD' | 'KeyC') => {
      if (!selectedText || showToc) return;
      const mode = code === 'KeyG' ? 'grammar' : code === 'KeyD' ? 'background' : 'plain';
      onQuickPrompt(mode);
      onShowChat();
    };

    const handleQuickPromptKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.code === 'KeyG' || e.code === 'KeyD' || e.code === 'KeyC') {
        e.preventDefault();
        triggerQuickPrompt(e.code as 'KeyG' | 'KeyD' | 'KeyC');
      }
    };

    const handleQuickPromptFromIframe = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string }>;
      const code = customEvent.detail.code;
      if (code === 'KeyG' || code === 'KeyD' || code === 'KeyC') {
        triggerQuickPrompt(code as 'KeyG' | 'KeyD' | 'KeyC');
      }
    };

    window.addEventListener('keydown', handleQuickPromptKey);
    window.addEventListener('reader-quickprompt', handleQuickPromptFromIframe);

    return () => {
      window.removeEventListener('keydown', handleQuickPromptKey);
      window.removeEventListener('reader-quickprompt', handleQuickPromptFromIframe);
    };
  }, [selectedText, showToc, onShowChat, onQuickPrompt]);

  // Keep focus when window regains focus
  useEffect(() => {
    const handleWindowFocus = () => {
      if (showChat) return;
      // Let the component handle focus
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [showChat]);

  return { isNavigatingRef };
};

export default useReaderKeyboard;
