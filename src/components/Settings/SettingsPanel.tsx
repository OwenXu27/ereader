import React from 'react';
import { useBookStore } from '../../store/useBookStore';
import type { ThemeType } from '../../hooks/useTheme';
import { X, Globe, ShieldAlert, Moon, Sun, Coffee } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';

// Utility for cleaner tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const iconSize = 16;

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, isSettingsOpen, setSettingsOpen } = useBookStore();

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/30 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
              "bg-theme-surface rounded-xl shadow-xl w-full max-w-md",
              "overflow-hidden"
            )}
            style={{ border: '0.5px solid var(--border-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Unified style with Chat Sidebar */}
            <div className="h-[53px] flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
              <h2 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-theme-primary font-ui">设置</h2>
              <button 
                onClick={() => setSettingsOpen(false)} 
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-md",
                  "text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated",
                  "transition-all duration-fast ease-out-custom active:scale-95"
                )}
              >
                <X size={iconSize} />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Theme */}
              <section>
                <label className="text-[11px] uppercase tracking-[0.05em] font-medium text-theme-muted mb-3 block">
                  主题
                </label>
                <div className="flex gap-2">
                  <ThemeButton
                    theme="light"
                    currentTheme={settings.theme}
                    onClick={() => updateSettings({ theme: 'light' })}
                    icon={<Sun size={14} />}
                    label="明亮"
                  />
                  <ThemeButton
                    theme="sepia"
                    currentTheme={settings.theme}
                    onClick={() => updateSettings({ theme: 'sepia' })}
                    icon={<Coffee size={14} />}
                    label="护眼"
                  />
                  <ThemeButton
                    theme="dark"
                    currentTheme={settings.theme}
                    onClick={() => updateSettings({ theme: 'dark' })}
                    icon={<Moon size={14} />}
                    label="暗黑"
                  />
                </div>
              </section>

              {/* Font Size */}
              <section>
                <label className="text-[11px] uppercase tracking-[0.05em] font-medium text-theme-muted mb-3 block">
                  字号
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-theme-secondary font-ui">A</span>
                  <input 
                    type="range" 
                    min="12" 
                    max="32" 
                    step="1"
                    value={settings.fontSize}
                    onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                    className="flex-1 accent-warm-500 h-1 bg-theme-elevated rounded-full appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `linear-gradient(to right, var(--accent-warm, #8B6F4E) 0%, var(--accent-warm, #8B6F4E) ${(settings.fontSize - 12) / (32 - 12) * 100}%, var(--bg-elevated, #F5ECD8) ${(settings.fontSize - 12) / (32 - 12) * 100}%, var(--bg-elevated, #F5ECD8) 100%)`
                    }}
                  />
                  <span className="text-lg text-theme-secondary font-ui">A</span>
                </div>
                <div className="mt-2 text-center text-sm text-theme-muted">
                  {settings.fontSize}px
                </div>
              </section>

              {/* AI Settings */}
              <section className="pt-4" style={{ borderTop: '0.5px solid var(--border-primary)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-theme-primary">
                    <Globe size={iconSize} />
                    <span className="font-medium text-sm">AI 助手</span>
                  </div>
                  <Switch
                    checked={settings.translationEnabled}
                    onChange={(checked) => updateSettings({ translationEnabled: checked })}
                  />
                </div>
                
                {settings.translationEnabled && (
                  <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                      <label className="text-xs text-theme-secondary">
                        API 地址 <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        value={settings.apiUrl}
                        onChange={(e) => updateSettings({ apiUrl: e.target.value })}
                        placeholder="http://localhost:5177/api/chat/completions"
                        className={cn(
                          "w-full px-3 py-2 text-sm rounded-lg",
                          "bg-theme-input",
                          "text-theme-primary placeholder:text-theme-muted",
                          "focus:outline-none",
                          "transition-all duration-fast"
                        )}
                        style={{ border: '0.5px solid var(--border-primary)' }}
                      />
                      <p className="text-[10px] text-theme-muted">
                        默认使用本地代理，也可直接填写 Moonshot API
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-theme-secondary">
                        API 密钥 <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => updateSettings({ apiKey: e.target.value })}
                        placeholder="sk-..."
                        className={cn(
                          "w-full px-3 py-2 text-sm rounded-lg",
                          "bg-theme-input",
                          "text-theme-primary placeholder:text-theme-muted",
                          "focus:outline-none",
                          "transition-all duration-fast"
                        )}
                        style={{ border: '0.5px solid var(--border-primary)' }}
                      />
                      <p className="text-[10px] text-theme-muted">
                        从 <a href="https://platform.moonshot.cn/" target="_blank" rel="noopener" className="text-warm-500 hover:underline">platform.moonshot.cn</a> 获取
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Security Settings */}
              <section className="pt-4" style={{ borderTop: '0.5px solid var(--border-primary)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-theme-primary">
                    <ShieldAlert size={iconSize} />
                    <span className="font-medium text-sm">允许 EPUB 脚本</span>
                  </div>
                  <Switch
                    checked={settings.allowScriptedContent}
                    onChange={(checked) => updateSettings({ allowScriptedContent: checked })}
                    variant="warning"
                  />
                </div>
                <p className="text-[11px] text-theme-muted leading-relaxed pl-6">
                  部分 EPUB 包含脚本，禁用时会显示沙盒警告或空白页。开启后可能存在安全风险，请谨慎处理来源不明的书籍。
                </p>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Theme Button Component
interface ThemeButtonProps {
  theme: ThemeType;
  currentTheme: ThemeType;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ThemeButton = ({ theme, currentTheme, onClick, icon, label }: ThemeButtonProps) => {
  const isActive = currentTheme === theme;
  
  const themeStyles = {
    light: 'bg-paper-50 text-ink-700 border-ink-200',
    sepia: 'bg-paper-100 text-warm-600 border-warm-300',
    dark: 'bg-ink-900 text-ink-100 border-ink-700',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-2.5 px-3 rounded-lg text-sm transition-all duration-fast ease-out-custom",
        "flex items-center justify-center gap-2",
        isActive 
          ? cn("font-medium", themeStyles[theme])
          : "text-theme-secondary hover:bg-theme-elevated hover:text-theme-primary"
      )}
      style={{ border: isActive ? '0.5px solid var(--warm-500, #8B6F4E)' : '0.5px solid var(--border-primary)' }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

// Switch Component
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'default' | 'warning';
}

const Switch = ({ checked, onChange, variant = 'default' }: SwitchProps) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input 
      type="checkbox" 
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only peer"
    />
    <div className={cn(
      "w-10 h-5 rounded-full transition-all duration-fast",
      "bg-theme-elevated peer-checked:bg-warm-500",
      "relative after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
      "after:bg-white after:rounded-full after:h-4 after:w-4",
      "after:transition-all after:duration-fast",
      "peer-checked:after:translate-x-5",
      variant === 'warning' && checked && "peer-checked:bg-amber-500"
    )} />
  </label>
);

export default SettingsPanel;
