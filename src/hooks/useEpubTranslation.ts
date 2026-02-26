import { useBookStore, hashText } from '../store/useBookStore';
import { translateText, TranslationError } from '../services/llm';
import type { ThemeType } from './useTheme';

export interface TranslationRegistration {
  cleanups: Array<() => void>;
  triggerMap: Map<HTMLElement, () => Promise<void>>;
}

/**
 * Register translation dblclick handlers on all paragraphs in an epub content document.
 * Restores cached translations and builds a triggerMap for mobile use.
 *
 * Desktop: dblclick on <p> triggers translation.
 * Mobile: parent overlay reads triggerMap via ref to call translation directly.
 */
export function registerTranslationHandlers(
  doc: Document,
  bookId: string | undefined,
  _themeName: ThemeType,
): TranslationRegistration {
  const cleanups: Array<() => void> = [];
  const triggerMap = new Map<HTMLElement, () => Promise<void>>();
  const paragraphs = doc.querySelectorAll('p');

  paragraphs.forEach((p: HTMLElement) => {
    const text = p.textContent;
    if (!text || text.length < 5) return;

    const textHash = hashText(text);

    if (bookId) {
      const cachedTranslation = useBookStore.getState().getTranslation(bookId, textHash);
      if (cachedTranslation) {
        const translationBlock = doc.createElement('div');
        translationBlock.className = 'translation-block';
        translationBlock.textContent = cachedTranslation;
        p.appendChild(translationBlock);
        p.setAttribute('data-translated', 'true');
        p.classList.add('has-translation');
      }
    }

    p.style.cursor = 'pointer';

    const triggerTranslation = async () => {
      const currentSettings = useBookStore.getState().settings;
      if (!currentSettings.translationEnabled) return;
      if (p.getAttribute('data-translated') === 'true') return;
      if (p.getAttribute('data-translated') === 'loading') return;

      p.setAttribute('data-translated', 'loading');
      const loader = doc.createElement('div');
      loader.className = 'translation-block';
      loader.style.fontSize = '0.75em';
      loader.textContent = '翻译中...';
      p.appendChild(loader);

      try {
        const translated = await translateText(text, currentSettings.apiUrl, currentSettings.apiKey);
        loader.textContent = translated;
        p.setAttribute('data-translated', 'true');
        p.classList.add('has-translation');

        if (bookId) {
          useBookStore.getState().saveTranslation(bookId, textHash, translated);
        }
      } catch (err) {
        const errorMessage = err instanceof TranslationError ? err.message : '翻译失败';
        loader.textContent = errorMessage;
        p.removeAttribute('data-translated');
      }
    };

    triggerMap.set(p, triggerTranslation);

    p.addEventListener('dblclick', triggerTranslation);
    cleanups.push(() => p.removeEventListener('dblclick', triggerTranslation));
  });

  return { cleanups, triggerMap };
}

/**
 * Register keyboard event forwarding from epub iframe to the main window.
 */
export function registerIframeKeyboard(doc: Document): () => void {
  const handleIframeKeydown = (e: KeyboardEvent) => {
    if (e.altKey && !e.metaKey && !e.ctrlKey && (e.code === 'KeyG' || e.code === 'KeyD' || e.code === 'KeyC')) {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('reader-quickprompt', { detail: { code: e.code } }));
      return;
    }

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('reader-keydown', { detail: { key: e.key } }));
    }
  };
  doc.addEventListener('keydown', handleIframeKeydown);
  return () => doc.removeEventListener('keydown', handleIframeKeydown);
}

/**
 * Register text selection forwarding from epub iframe to the main window.
 */
export function registerSelectionHandler(doc: Document): () => void {
  const handleSelectionMouseup = () => {
    const selection = doc.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText && selectedText.length > 0) {
      window.dispatchEvent(new CustomEvent('reader-selection', { detail: { text: selectedText } }));
    }
  };
  doc.addEventListener('mouseup', handleSelectionMouseup);
  return () => doc.removeEventListener('mouseup', handleSelectionMouseup);
}
