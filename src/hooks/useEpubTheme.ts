import { useEffect } from 'react';
import type { Rendition } from 'epubjs';
import { THEME_COLORS, type ThemeType } from './useTheme';

interface ThemeSettings {
  theme: string;
  fontSize: number;
}

/**
 * Structural CSS for epub content — layout, typography, spacing.
 * Color-free; all appearance is handled by getThemeStyleCSS.
 */
export function getBaseStyleCSS(): string {
  return `
    html, body {
      touch-action: manipulation;
      -webkit-text-size-adjust: 100%;
    }
    body {
      font-family: 'Source Serif 4', 'Merriweather', 'Georgia', serif !important;
      line-height: 1.6 !important;
    }
    body:lang(zh), body:lang(ja), body:lang(ko) {
      line-height: 1.8 !important;
    }
    p, li, dd, dt, blockquote, figcaption, td, th {
      line-height: inherit !important;
    }
    .translation-block {
      font-family: 'Inter', 'SF Pro Display', sans-serif;
      font-size: 0.75em;
      margin-top: 0.75em;
      margin-bottom: 0.75em;
      padding: 0.5em 0.75em;
      line-height: 1.7;
      border-left: 0.5px solid transparent;
      border-radius: 0px 4px 4px 0px;
    }
    p {
      margin-bottom: 1.25em !important;
      text-align: justify;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    p.has-translation {
      cursor: default;
    }
  `;
}

/**
 * Theme-dependent CSS — colors, selection, font-size.
 * Used both for initial injection and live theme/fontSize updates.
 */
export function getThemeStyleCSS(themeName: ThemeType, fontSize: number): string {
  const theme = THEME_COLORS[themeName];
  return `
    body {
      color: ${theme.textPrimary} !important;
      background-color: ${theme.bgBase} !important;
      font-size: ${fontSize}px !important;
    }
    ::selection {
      background-color: ${theme.selectionBg} !important;
      color: inherit !important;
    }
    ::-moz-selection {
      background-color: ${theme.selectionBg} !important;
      color: inherit !important;
    }
    .translation-block {
      color: ${theme.textSecondary} !important;
      border-left-color: ${theme.accentWarm} !important;
      background-color: ${themeName === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(139, 111, 78, 0.08)'} !important;
    }
  `;
}

/**
 * React hook that reactively applies theme/fontSize changes to existing rendered content.
 */
export const useEpubTheme = (
  renditionRef: React.MutableRefObject<Rendition | null>,
  isReady: boolean,
  settings: ThemeSettings,
) => {
  useEffect(() => {
    if (!renditionRef.current || !isReady) return;

    const rendition = renditionRef.current;
    const themeName = settings.theme as ThemeType;

    try {
      const contents = rendition.getContents() as unknown as Array<{ document: Document }>;
      contents.forEach((content) => {
        const doc = content.document;
        if (!doc) return;

        const oldStyle = doc.getElementById('reader-theme-style');
        oldStyle?.remove();

        const style = doc.createElement('style');
        style.id = 'reader-theme-style';
        style.textContent = getThemeStyleCSS(themeName, settings.fontSize);
        doc.head.appendChild(style);

        if (doc.body) {
          const theme = THEME_COLORS[themeName];
          doc.body.style.setProperty('color', theme.textPrimary, 'important');
          doc.body.style.setProperty('background-color', theme.bgBase, 'important');
          doc.body.style.setProperty('font-size', `${settings.fontSize}px`, 'important');
        }
      });
    } catch (e) {
      console.error('Theme apply error:', e);
    }
  }, [settings.theme, settings.fontSize, isReady, renditionRef]);
};
