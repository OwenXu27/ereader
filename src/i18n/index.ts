import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'zh' | 'en';

const translations = {
  zh: {
    // Library
    library: {
      title: '书库',
      empty: '暂无书籍',
      emptyHint: '导入 EPUB 开始阅读',
      addBook: '添加书籍',
      settings: '设置',
      reading: '在读',
      completed: '已读',
      count: '册',
    },
    // Settings
    settings: {
      title: '设置',
      subtitle: '阅读器偏好',
      appearance: '外观',
      fontSize: '字号',
      aiAssistant: 'AI 助手',
      security: '安全',
      theme: {
        light: '明亮',
        sepia: '护眼',
        dark: '深色',
      },
      fontSizeLabel: {
        small: '小',
        medium: '中',
        large: '大',
      },
      apiUrl: 'API 地址',
      apiKey: 'API 密钥',
      apiUrlHint: '默认使用本地代理，也可直接填写 Moonshot API',
      apiKeyHint: '从 platform.moonshot.cn 获取',
      allowScript: '允许 EPUB 脚本',
      scriptWarning: '允许 EPUB 中的脚本执行。部分书籍需要开启才能正常显示，但可能存在安全风险。',
      language: '语言',
      languageLabel: {
        zh: '中文',
        en: 'English',
      },
    },
    // Reader
    reader: {
      toc: '目录',
      aiAssistant: 'AI 助手',
      close: '关闭',
      back: '返回书库',
      noToc: '暂无目录',
      placeholder: '选择文字后可以在这里提问',
      placeholderHint: '例如：这个词是什么意思？',
      send: '发送',
      grammar: '语法分析',
      background: '背景知识',
      quote: '引用提问',
    },
    // Chat
    chat: {
      you: '你',
      assistant: '助手',
    },
    // Common
    common: {
      loading: '导入中...',
      error: '导入失败',
    },
  },
  en: {
    // Library
    library: {
      title: 'Library',
      empty: 'No books yet',
      emptyHint: 'Import EPUB to start reading',
      addBook: 'Add Book',
      settings: 'Settings',
      reading: 'Reading',
      completed: 'Completed',
      count: 'books',
    },
    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'Reader Preferences',
      appearance: 'Appearance',
      fontSize: 'Font Size',
      aiAssistant: 'AI Assistant',
      security: 'Security',
      theme: {
        light: 'Light',
        sepia: 'Sepia',
        dark: 'Dark',
      },
      fontSizeLabel: {
        small: 'Small',
        medium: 'Medium',
        large: 'Large',
      },
      apiUrl: 'API URL',
      apiKey: 'API Key',
      apiUrlHint: 'Default uses local proxy, or use Moonshot API directly',
      apiKeyHint: 'Get from platform.moonshot.cn',
      allowScript: 'Allow EPUB Scripts',
      scriptWarning: 'Allow scripts in EPUB files. Some books require this, but may pose security risks.',
      language: 'Language',
      languageLabel: {
        zh: '中文',
        en: 'English',
      },
    },
    // Reader
    reader: {
      toc: 'Contents',
      aiAssistant: 'AI Assistant',
      close: 'Close',
      back: 'Back to Library',
      noToc: 'No table of contents',
      placeholder: 'Select text to ask questions',
      placeholderHint: 'e.g., What does this word mean?',
      send: 'Send',
      grammar: 'Grammar',
      background: 'Background',
      quote: 'Quote',
    },
    // Chat
    chat: {
      you: 'You',
      assistant: 'Assistant',
    },
    // Common
    common: {
      loading: 'Loading...',
      error: 'Import failed',
    },
  },
} as const;

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string | Record<string, string>;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'zh',
      setLanguage: (lang) => set({ language: lang }),
      t: (key: string) => {
        const keys = key.split('.');
        let value: unknown = translations[get().language];
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = (value as Record<string, unknown>)[k];
          } else {
            return key;
          }
        }
        return value as string | Record<string, string>;
      },
    }),
    {
      name: 'i18n-storage',
    }
  )
);

// Hook for accessing translations
export const useTranslation = () => {
  const { t, language, setLanguage } = useI18n();
  return { t, language, setLanguage };
};
