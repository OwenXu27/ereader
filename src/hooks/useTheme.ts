import { useMemo } from 'react';
import { useBookStore } from '../store/useBookStore';

export type ThemeType = 'light' | 'dark' | 'sepia';

export interface ThemeColors {
  color: string;
  background: string;
  translationColor: string;
  borderColor: string;
  translationBg: string;
}

export const THEME_COLORS: Record<ThemeType, ThemeColors> = {
  light: {
    color: '#333333',
    background: '#F9F7F1',
    translationColor: '#52525b',
    borderColor: '#e4e4e7',
    translationBg: 'rgba(0,0,0,0.02)',
  },
  dark: {
    color: '#e4e4e7',
    background: '#18181b',
    translationColor: '#a1a1aa',
    borderColor: '#3f3f46',
    translationBg: 'rgba(255,255,255,0.05)',
  },
  sepia: {
    color: '#5b4636',
    background: '#f4ecd8',
    translationColor: '#8b6b4e',
    borderColor: '#e3d5b8',
    translationBg: 'rgba(91,70,54,0.05)',
  },
};

export const useTheme = () => {
  const { settings } = useBookStore();
  const theme = settings.theme as ThemeType;
  const colors = THEME_COLORS[theme];

  const classes = useMemo(() => {
    const isDark = theme === 'dark';
    const isSepia = theme === 'sepia';
    const isLight = theme === 'light';

    return {
      // Base
      theme,
      isDark,
      isSepia,
      isLight,
      colors,

      // Background classes
      bg: isDark ? 'bg-[#18181b]' : isSepia ? 'bg-[#f4ecd8]' : 'bg-[#F9F7F1]',
      bgInput: isDark ? 'bg-zinc-900' : isSepia ? 'bg-[#fbf5e6]' : 'bg-white',

      // Text classes
      text: isDark ? 'text-zinc-100' : isSepia ? 'text-[#5b4636]' : 'text-[#333333]',
      textMuted: isDark ? 'text-zinc-400' : isSepia ? 'text-[#6b4e35]' : 'text-zinc-500',
      textUser: isDark ? 'text-zinc-300' : isSepia ? 'text-[#6b4e35]' : 'text-zinc-600',
      textAssistant: isDark ? 'text-zinc-100' : isSepia ? 'text-[#4a3a2a]' : 'text-zinc-900',

      // Border classes
      border: isDark ? 'border-zinc-800' : isSepia ? 'border-[#e3d5b8]' : 'border-zinc-200',

      // Interactive states
      hover: isDark ? 'hover:bg-zinc-800' : isSepia ? 'hover:bg-[#f1e3c4]' : 'hover:bg-zinc-100',

      // Toolbar specific
      toolbarBg: isDark ? 'bg-[#18181b]' : isSepia ? 'bg-[#f4ecd8]' : 'bg-[#F9F7F1]',
      toolbarText: isDark ? 'text-zinc-100' : isSepia ? 'text-[#5b4636]' : 'text-[#333333]',
      toolbarButtonText: isDark ? 'text-zinc-300' : isSepia ? 'text-[#6b4e35]' : 'text-zinc-600',
    };
  }, [theme, colors]);

  return classes;
};

export default useTheme;
