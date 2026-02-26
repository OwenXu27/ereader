import { useEffect } from 'react';
import type { Rendition } from 'epubjs';
import { THEME_COLORS, type ThemeType } from './useTheme';

interface ThemeSettings {
  theme: string;
  fontSize: number;
}

/**
 * Generate base CSS for initial content injection.
 */
export function getBaseStyleCSS(themeName: ThemeType, fontSize: number): string {
  const theme = THEME_COLORS[themeName];
  return `
    body {
      font-family: 'Source Serif 4', 'Merriweather', 'Georgia', serif !important;
      line-height: 1.75 !important;
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
      font-family: 'Inter', 'SF Pro Display', sans-serif;
      font-size: 0.9em;
      margin-top: 0.5em;
      margin-bottom: 1em;
      padding: 0.75em 1em;
      line-height: 1.6;
      border-left: 2px solid ${theme.accentWarm};
      background-color: ${themeName === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(139, 111, 78, 0.08)'};
      border-radius: 0 4px 4px 0;
    }
    p {
      margin-bottom: 1.25em !important;
      text-align: justify;
    }
    p.has-translation {
      cursor: default;
    }
  `;
}

/**
 * Generate theme-specific CSS for the reader-theme-style element.
 */
export function getThemeStyleCSS(themeName: ThemeType): string {
  const theme = THEME_COLORS[themeName];
  return `
    body {
      color: ${theme.textPrimary} !important;
      background-color: ${theme.bgBase} !important;
    }
    .translation-block {
      color: ${theme.textSecondary} !important;
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
    const currentTheme = THEME_COLORS[themeName];

    try {
      const contents = rendition.getContents() as unknown as Array<{ document: Document }>;
      contents.forEach((content) => {
        const doc = content.document;
        if (!doc) return;

        const oldStyle = doc.getElementById('reader-theme-style');
        oldStyle?.remove();

        const style = doc.createElement('style');
        style.id = 'reader-theme-style';
        style.textContent = `
          body {
            color: ${currentTheme.textPrimary} !important;
            background-color: ${currentTheme.bgBase} !important;
            font-size: ${settings.fontSize}px !important;
          }
          ::selection {
            background-color: ${currentTheme.selectionBg} !important;
          }
          ::-moz-selection {
            background-color: ${currentTheme.selectionBg} !important;
          }
          .translation-block {
            color: ${currentTheme.textSecondary} !important;
            border-left-color: ${currentTheme.accentWarm} !important;
            background-color: ${themeName === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(139, 111, 78, 0.08)'} !important;
          }
        `;
        doc.head.appendChild(style);

        if (doc.body) {
          doc.body.style.setProperty('color', currentTheme.textPrimary, 'important');
          doc.body.style.setProperty('background-color', currentTheme.bgBase, 'important');
          doc.body.style.setProperty('font-size', `${settings.fontSize}px`, 'important');
        }
      });
    } catch (e) {
      console.error('Theme apply error:', e);
    }
  }, [settings.theme, settings.fontSize, isReady, renditionRef]);
};
