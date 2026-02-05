import { useMemo, useEffect } from 'react';
import { useBookStore } from '../store/useBookStore';

export type ThemeType = 'light' | 'dark' | 'sepia';

export interface ThemeColors {
  // Background
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgInput: string;
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Border
  borderPrimary: string;
  borderActive: string;
  
  // Special
  accentWarm: string;
  selectionBg: string;
}

// Colors synced with index.css CSS variables
export const THEME_COLORS: Record<ThemeType, ThemeColors> = {
  light: {
    bgBase: '#FFFCF8',
    bgSurface: '#FFFDF9',
    bgElevated: '#F8F6F0',
    bgInput: '#FFFFFF',
    textPrimary: '#2D2A26',
    textSecondary: '#5C5852',
    textMuted: '#9A958C',
    borderPrimary: 'rgba(45, 42, 38, 0.08)',
    borderActive: 'rgba(45, 42, 38, 0.2)',
    accentWarm: '#9B7B5C',
    selectionBg: 'rgba(155, 123, 92, 0.15)',
  },
  sepia: {
    bgBase: '#F9F3E8',
    bgSurface: '#F5ECD8',
    bgElevated: '#EDE4D0',
    bgInput: '#FFFDF7',
    textPrimary: '#4A3F35',
    textSecondary: '#7A6B5A',
    textMuted: '#A89B8C',
    borderPrimary: 'rgba(74, 63, 53, 0.1)',
    borderActive: 'rgba(74, 63, 53, 0.25)',
    accentWarm: '#8B6F4E',
    selectionBg: 'rgba(139, 111, 78, 0.2)',
  },
  dark: {
    bgBase: '#0F0E0D',
    bgSurface: '#161513',
    bgElevated: '#1E1D1A',
    bgInput: '#0A0909',
    textPrimary: '#F0EBE5',
    textSecondary: '#A8A299',
    textMuted: '#6B655E',
    borderPrimary: 'rgba(240, 235, 229, 0.12)',
    borderActive: 'rgba(240, 235, 229, 0.25)',
    accentWarm: '#D4C4A0',
    selectionBg: 'rgba(212, 196, 160, 0.25)',
  },
};

export const useTheme = () => {
  const { settings } = useBookStore();
  const theme = settings.theme as ThemeType;
  const colors = THEME_COLORS[theme];

  // Apply data-theme attribute to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const classes = useMemo(() => {
    const isDark = theme === 'dark';
    const isSepia = theme === 'sepia';
    const isLight = theme === 'light';

    return {
      // Meta
      theme,
      isDark,
      isSepia,
      isLight,
      colors,

      // Background - using CSS variables
      bg: 'bg-theme-base',
      bgSurface: 'bg-theme-surface',
      bgElevated: 'bg-theme-elevated',
      bgInput: 'bg-theme-input',

      // Text - using CSS variables
      text: 'text-theme-primary',
      textSecondary: 'text-theme-secondary',
      textMuted: 'text-theme-muted',
      textUser: 'text-theme-secondary',
      textAssistant: 'text-theme-primary',

      // Border - using CSS variables
      border: 'border-theme-primary',
      borderActive: 'border-theme-active',

      // Interactive states - theme specific with transitions
      hover: isDark 
        ? 'hover:bg-white/5 transition-colors duration-fast' 
        : isSepia 
          ? 'hover:bg-warm-100/50 transition-colors duration-fast' 
          : 'hover:bg-ink-50/50 transition-colors duration-fast',

      // Toolbar specific
      toolbarBg: 'bg-theme-base/95 backdrop-blur-sm',
      toolbarText: 'text-theme-primary',
      toolbarButtonText: 'text-theme-secondary',

      // Input specific
      inputBg: 'bg-theme-input',
      inputBorder: 'border-theme-primary focus:border-theme-active',
      inputText: 'text-theme-primary placeholder:text-theme-muted',

      // Special
      accent: 'text-warm-500',
      selection: 'selection:bg-warm-500/20',
    };
  }, [theme, colors]);

  return classes;
};

export default useTheme;
