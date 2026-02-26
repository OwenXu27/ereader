import { useBookStore, hashText } from '../store/useBookStore';
import { translateText, TranslationError } from '../services/llm';
import type { ThemeType } from './useTheme';

/**
 * Register translation double-click handlers on all paragraphs in an epub content document.
 * Restores cached translations and adds interactive translate-on-dblclick.
 * Returns an array of cleanup functions.
 */
export function registerTranslationHandlers(
  doc: Document,
  bookId: string | undefined,
  _themeName: ThemeType,
): Array<() => void> {
  const cleanupHandlers: Array<() => void> = [];
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
    const handleDblClick = async () => {
      const currentSettings = useBookStore.getState().settings;
      if (!currentSettings.translationEnabled) return;
      if (p.getAttribute('data-translated') === 'true') return;

      p.setAttribute('data-translated', 'loading');
      const loader = doc.createElement('div');
      loader.className = 'translation-block';
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

    p.addEventListener('dblclick', handleDblClick);
    cleanupHandlers.push(() => p.removeEventListener('dblclick', handleDblClick));
  });

  return cleanupHandlers;
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
