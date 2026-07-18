/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        reading: ['"Source Serif 4"', 'Merriweather', 'Georgia', 'serif'],
        ui: ['var(--font-ui)', 'Inter', '"SF Pro Display"', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
        'pixel-square': ['"Geist Pixel Square"', 'monospace'],
        'pixel-circle': ['"Geist Pixel Circle"', 'monospace'],
        'pixel-grid': ['"Geist Pixel Grid"', 'monospace'],
        'pixel-line': ['"Geist Pixel Line"', 'monospace'],
        'pixel-triangle': ['"Geist Pixel Triangle"', 'monospace'],
      },
      colors: {
        // 主题变量色 - 引用 CSS 变量，使 hover:/active:/peer-checked: 等变体
        // 及 /40 /60 /80 透明度修饰符能被 Tailwind 正常生成
        'theme-base': 'var(--bg-base)',
        'theme-surface': 'var(--bg-surface)',
        'theme-elevated': 'var(--bg-elevated)',
        'theme-input': 'var(--bg-input)',
        'theme-primary': 'var(--text-primary)',
        'theme-secondary': 'var(--text-secondary)',
        'theme-muted': 'var(--text-muted)',
        // 透明度档位的主题色 - 用 color-mix 实现（Tailwind 无法对 var() 颜色
        // 应用 /60 这类透明度修饰符，所以改用独立色名，如 bg-theme-elevated-60）
        'theme-elevated-30': 'color-mix(in oklab, var(--bg-elevated) 30%, transparent)',
        'theme-elevated-40': 'color-mix(in oklab, var(--bg-elevated) 40%, transparent)',
        'theme-elevated-60': 'color-mix(in oklab, var(--bg-elevated) 60%, transparent)',
        'theme-elevated-80': 'color-mix(in oklab, var(--bg-elevated) 80%, transparent)',
        'theme-muted-10': 'color-mix(in oklab, var(--text-muted) 10%, transparent)',
        'theme-muted-30': 'color-mix(in oklab, var(--text-muted) 30%, transparent)',
        'theme-muted-50': 'color-mix(in oklab, var(--text-muted) 50%, transparent)',
        'theme-muted-60': 'color-mix(in oklab, var(--text-muted) 60%, transparent)',
        'theme-muted-70': 'color-mix(in oklab, var(--text-muted) 70%, transparent)',
        'theme-primary-80': 'color-mix(in oklab, var(--text-primary) 80%, transparent)',
        'theme-base-10': 'color-mix(in oklab, var(--bg-base) 10%, transparent)',
        'theme-base-50': 'color-mix(in oklab, var(--bg-base) 50%, transparent)',
        'theme-base-90': 'color-mix(in oklab, var(--bg-base) 90%, transparent)',
        // 纸张色系 - 护眼暖白
        paper: {
          50: '#FFFCF5',   // Light 主背景
          100: '#FDF6E3',  // Sepia 主背景
          200: '#F5ECD8',  // Elevated 表面
          300: '#EDE4D3',
          400: '#E5D9C5',
          800: '#2A2824',  // Dark 表面
          900: '#1E1C19',  // Dark 主背景
        },
        // 墨色系 - 阅读文字
        ink: {
          50: '#F5F5F0',   // Light 次要文字
          100: '#E8E6E1',  // Dark 主文字
          200: '#D4D1CA',
          300: '#A8A398',
          400: '#7C766B',  // Sepia 次要文字
          500: '#6B6560',
          600: '#5A554F',
          700: '#3D3A36',  // Light 主文字
          800: '#2D2B28',
          900: '#1A1815',  // Dark 主背景
          950: '#0F0E0C',  // Dark 输入框专用
        },
        // 暖褐色系 (Sepia 专用)
        warm: {
          50: '#FAF6F1',
          100: '#F0E8DC',
          200: '#E6D9C5',
          300: '#D4C4A8',
          400: '#C4B49A',
          500: '#8B6F4E',  // Sepia 主文字
          600: '#5B4636',
          700: '#4A3A2D',
        },
      },
      transitionDuration: {
        'fast': '120ms',
        'normal': '200ms',
        'slow': '280ms',
      },
      transitionTimingFunction: {
        'ease-out-custom': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
}
