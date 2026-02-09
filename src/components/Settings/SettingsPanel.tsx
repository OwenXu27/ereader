import React from 'react';
import { useBookStore, type UIFontFamily, type UIFontWeight, type UIFontPixelStyle } from '../../store/useBookStore';
import { useTranslation, type Language } from '../../i18n';
import type { ThemeType } from '../../hooks/useTheme';
import { X, Globe, ShieldAlert, Sun, Type, Sparkles, AlertCircle, Languages, Palette, Weight, Shapes } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, isSettingsOpen, setSettingsOpen } = useBookStore();
  const { t, language, setLanguage } = useTranslation();

  const getFontSizeLabel = (size: number) => {
    if (size < 16) return (t('settings.fontSizeLabel.small') as string);
    if (size < 20) return (t('settings.fontSizeLabel.medium') as string);
    return (t('settings.fontSizeLabel.large') as string);
  };

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 bg-ink-900/20 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-theme-base w-full max-w-sm overflow-hidden font-ui"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 0.5px var(--border-primary)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[15px] font-normal text-theme-primary tracking-[-0.02em]">
                    {t('settings.title') as string}
                  </h2>
                  <p className="text-[11px] text-theme-muted/60 mt-0.5 tracking-wide">
                    {t('settings.subtitle') as string}
                  </p>
                </div>
                {/* Close button - refined hover */}
                <button 
                  onClick={() => setSettingsOpen(false)} 
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full",
                    "text-theme-muted",
                    "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    "hover:scale-105 hover:text-theme-primary hover:bg-theme-elevated/60",
                    "active:scale-95 active:bg-theme-elevated/80"
                  )}
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              </div>
              <div className="mt-4 h-px bg-gradient-to-r from-theme-muted/20 via-theme-muted/10 to-transparent" />
            </div>

            {/* Content */}
            <div className="px-6 pb-8 space-y-8 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              
              {/* Language Section */}
              <section>
                <SectionHeader icon={<Languages size={13} strokeWidth={1.5} />} label={t('settings.language') as string} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <LanguageOption
                    code="zh"
                    label={(t('settings.languageLabel.zh') as string)}
                    current={language}
                    onClick={() => setLanguage('zh')}
                  />
                  <LanguageOption
                    code="en"
                    label={(t('settings.languageLabel.en') as string)}
                    current={language}
                    onClick={() => setLanguage('en')}
                  />
                </div>
              </section>

              {/* UI Font Section - Only show for English */}
              {language === 'en' && (
                <section>
                  <SectionHeader icon={<Palette size={13} strokeWidth={1.5} />} label={t('settings.uiFont') as string} />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <FontFamilyOption
                      family="sans"
                      label={(t('settings.uiFonts.sans') as string)}
                      current={settings.uiFontFamily}
                      onClick={() => updateSettings({ uiFontFamily: 'sans' })}
                    />
                    <FontFamilyOption
                      family="mono"
                      label={(t('settings.uiFonts.mono') as string)}
                      current={settings.uiFontFamily}
                      onClick={() => updateSettings({ uiFontFamily: 'mono' })}
                    />
                    <FontFamilyOption
                      family="pixel"
                      label={(t('settings.uiFonts.pixel') as string)}
                      current={settings.uiFontFamily}
                      onClick={() => updateSettings({ uiFontFamily: 'pixel' })}
                    />
                  </div>
                </section>
              )}

              {/* UI Font Weight Section - Only show for English and non-pixel fonts */}
              {language === 'en' && settings.uiFontFamily !== 'pixel' && (
                <section>
                  <SectionHeader icon={<Weight size={13} strokeWidth={1.5} />} label={t('settings.uiFontWeight') as string} />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <FontWeightOption
                      weight="normal"
                      label={(t('settings.uiFontWeights.normal') as string)}
                      current={settings.uiFontWeight}
                      onClick={() => updateSettings({ uiFontWeight: 'normal' })}
                    />
                    <FontWeightOption
                      weight="medium"
                      label={(t('settings.uiFontWeights.medium') as string)}
                      current={settings.uiFontWeight}
                      onClick={() => updateSettings({ uiFontWeight: 'medium' })}
                    />
                    <FontWeightOption
                      weight="semibold"
                      label={(t('settings.uiFontWeights.semibold') as string)}
                      current={settings.uiFontWeight}
                      onClick={() => updateSettings({ uiFontWeight: 'semibold' })}
                    />
                  </div>
                </section>
              )}

              {/* UI Pixel Style Section - Only show for English and pixel font */}
              {language === 'en' && settings.uiFontFamily === 'pixel' && (
                <section>
                  <SectionHeader icon={<Shapes size={13} strokeWidth={1.5} />} label={t('settings.uiPixelStyle') as string} />
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    <PixelStyleOption
                      style="square"
                      label={(t('settings.uiPixelStyles.square') as string)}
                      current={settings.uiFontPixelStyle}
                      onClick={() => updateSettings({ uiFontPixelStyle: 'square' })}
                    />
                    <PixelStyleOption
                      style="circle"
                      label={(t('settings.uiPixelStyles.circle') as string)}
                      current={settings.uiFontPixelStyle}
                      onClick={() => updateSettings({ uiFontPixelStyle: 'circle' })}
                    />
                    <PixelStyleOption
                      style="grid"
                      label={(t('settings.uiPixelStyles.grid') as string)}
                      current={settings.uiFontPixelStyle}
                      onClick={() => updateSettings({ uiFontPixelStyle: 'grid' })}
                    />
                    <PixelStyleOption
                      style="line"
                      label={(t('settings.uiPixelStyles.line') as string)}
                      current={settings.uiFontPixelStyle}
                      onClick={() => updateSettings({ uiFontPixelStyle: 'line' })}
                    />
                    <PixelStyleOption
                      style="triangle"
                      label={(t('settings.uiPixelStyles.triangle') as string)}
                      current={settings.uiFontPixelStyle}
                      onClick={() => updateSettings({ uiFontPixelStyle: 'triangle' })}
                    />
                  </div>
                </section>
              )}

              {/* Theme Section */}
              <section>
                <SectionHeader icon={<Sun size={13} strokeWidth={1.5} />} label={t('settings.appearance') as string} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <ThemeOption
                    theme="light"
                    currentTheme={settings.theme}
                    onClick={() => updateSettings({ theme: 'light' })}
                    label={(t('settings.theme.light') as string)}
                  />
                  <ThemeOption
                    theme="sepia"
                    currentTheme={settings.theme}
                    onClick={() => updateSettings({ theme: 'sepia' })}
                    label={(t('settings.theme.sepia') as string)}
                  />
                  <ThemeOption
                    theme="dark"
                    currentTheme={settings.theme}
                    onClick={() => updateSettings({ theme: 'dark' })}
                    label={(t('settings.theme.dark') as string)}
                  />
                </div>
              </section>

              {/* Font Size Section */}
              <section>
                <SectionHeader icon={<Type size={13} strokeWidth={1.5} />} label={t('settings.fontSize') as string} />
                <div className="mt-4">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-theme-muted font-light">A</span>
                    <input 
                      type="range" 
                      min="12" 
                      max="32" 
                      step="1"
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                      className="flex-1 h-1 bg-theme-elevated rounded-full appearance-none cursor-pointer accent-warm-500"
                      style={{
                        backgroundImage: `linear-gradient(to right, var(--warm-500) 0%, var(--warm-500) ${(settings.fontSize - 12) / 20 * 100}%, var(--theme-elevated) ${(settings.fontSize - 12) / 20 * 100}%, var(--theme-elevated) 100%)`
                      }}
                    />
                    <span className="text-[14px] text-theme-muted font-light">A</span>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-[11px] tabular-nums text-theme-primary">
                      {settings.fontSize}px
                    </span>
                    <span className="text-[10px] text-theme-muted/50">
                      {getFontSizeLabel(settings.fontSize)}
                    </span>
                  </div>
                </div>
              </section>

              {/* AI Settings */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeader icon={<Sparkles size={13} strokeWidth={1.5} />} label={t('settings.aiAssistant') as string} />
                  <MinimalSwitch
                    checked={settings.translationEnabled}
                    onChange={(checked) => updateSettings({ translationEnabled: checked })}
                  />
                </div>
                
                {settings.translationEnabled && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 space-y-4 pl-1"
                  >
                    <div className="space-y-2">
                      <label className="text-[11px] text-theme-secondary flex items-center gap-1">
                        <Globe size={11} strokeWidth={1.5} className="opacity-50" />
                        {t('settings.apiUrl') as string}
                      </label>
                      <div
                        className={cn(
                          "flex items-center rounded-lg border px-3 py-2.5",
                          "bg-theme-input",
                          settings.apiUrl && "border-warm-500/50",
                          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                          "hover:border-theme-muted/30"
                        )}
                        style={{ borderWidth: '0.5px', borderColor: settings.apiUrl ? undefined : 'var(--border-primary)' }}
                      >
                        <input 
                          type="text"
                          value={settings.apiUrl}
                          onChange={(e) => updateSettings({ apiUrl: e.target.value })}
                          placeholder="http://localhost:5177/api/chat/completions"
                          className={cn(
                            "w-full text-[12px] leading-relaxed bg-transparent",
                            "text-theme-primary placeholder:text-theme-muted/50",
                            "focus:outline-none"
                          )}
                        />
                      </div>
                      <p className="text-[10px] text-theme-muted/50 leading-relaxed">
                        {t('settings.apiUrlHint') as string}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] text-theme-secondary flex items-center gap-1">
                        <ShieldAlert size={11} strokeWidth={1.5} className="opacity-50" />
                        {t('settings.apiKey') as string}
                      </label>
                      <div
                        className={cn(
                          "flex items-center rounded-lg border px-3 py-2.5",
                          "bg-theme-input",
                          settings.apiKey && "border-warm-500/50",
                          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                          "hover:border-theme-muted/30"
                        )}
                        style={{ borderWidth: '0.5px', borderColor: settings.apiKey ? undefined : 'var(--border-primary)' }}
                      >
                        <input 
                          type="password"
                          value={settings.apiKey}
                          onChange={(e) => updateSettings({ apiKey: e.target.value })}
                          placeholder="sk-..."
                          className={cn(
                            "w-full text-[12px] leading-relaxed bg-transparent",
                            "text-theme-primary placeholder:text-theme-muted/50",
                            "focus:outline-none"
                          )}
                        />
                      </div>
                      <p className="text-[10px] text-theme-muted/50">
                        {t('settings.apiKeyHint') as string}
                      </p>
                    </div>
                  </motion.div>
                )}
              </section>

              {/* Security Settings */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeader icon={<AlertCircle size={13} strokeWidth={1.5} />} label={t('settings.security') as string} />
                  <MinimalSwitch
                    checked={settings.allowScriptedContent}
                    onChange={(checked) => updateSettings({ allowScriptedContent: checked })}
                    variant="warning"
                  />
                </div>
                <p className="mt-2 text-[10px] text-theme-muted/50 leading-relaxed">
                  {t('settings.scriptWarning') as string}
                </p>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Section Header Component
const SectionHeader = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 text-theme-muted/70">
    <span className="opacity-70">{icon}</span>
    <span className="text-[10px] uppercase tracking-[0.1em] font-medium">{label}</span>
  </div>
);

// Language Option Component - Enhanced click feedback
const LanguageOption = ({ code, label, current, onClick }: {
  code: Language;
  label: string;
  current: Language;
  onClick: () => void;
}) => {
  const isActive = current === code;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative py-2.5 px-3 rounded-[4px] text-[12px]",
        "flex items-center justify-center gap-2",
        "transition-all duration-150 ease-out",
        "hover:scale-[1.02]",
        "active:scale-[0.96] active:duration-75",
        isActive 
          ? "text-theme-primary bg-theme-elevated/80"
          : "text-theme-muted hover:text-theme-secondary hover:bg-theme-elevated/40 active:bg-theme-elevated/60"
      )}
      style={{ border: isActive ? '0.5px solid var(--warm-500)' : '0.5px solid var(--border-primary)' }}
    >
      <span className={cn(
        "w-4 h-4 rounded-full border text-[9px] flex items-center justify-center",
        "transition-all duration-150",
        isActive ? "border-warm-500 text-warm-500 scale-110" : "border-theme-muted/30 text-theme-muted/50"
      )}>
        {code.toUpperCase()}
      </span>
      <span className="transition-transform duration-150">{label}</span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-warm-500 animate-pulse" />
      )}
    </button>
  );
};

// Theme Option Component - Enhanced click feedback
const ThemeOption = ({ theme, currentTheme, onClick, label }: {
  theme: ThemeType;
  currentTheme: ThemeType;
  onClick: () => void;
  label: string;
}) => {
  const isActive = currentTheme === theme;
  
  const themeBg = {
    light: 'bg-paper-50',
    sepia: 'bg-paper-100',
    dark: 'bg-ink-900',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative py-3 rounded-[4px] text-[12px]",
        "flex flex-col items-center gap-2",
        "transition-all duration-150 ease-out",
        "hover:scale-[1.02]",
        "active:scale-[0.96] active:duration-75",
        isActive 
          ? "text-theme-primary bg-theme-elevated/80"
          : "text-theme-muted hover:text-theme-secondary hover:bg-theme-elevated/40 active:bg-theme-elevated/60"
      )}
      style={{ border: isActive ? '0.5px solid var(--warm-500)' : '0.5px solid var(--border-primary)' }}
    >
      <div className={cn(
        "w-6 h-6 rounded-full border transition-all duration-150",
        themeBg[theme],
        isActive ? "border-warm-500 scale-110" : "border-theme-muted/20 hover:border-theme-muted/40 active:scale-95"
      )} />
      <span className="transition-transform duration-150">{label}</span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-warm-500 animate-pulse" />
      )}
    </button>
  );
};

// Font Family Option Component
const FontFamilyOption = ({ family, label, current, onClick }: {
  family: UIFontFamily;
  label: string;
  current: UIFontFamily;
  onClick: () => void;
}) => {
  const isActive = current === family;
  
  const fontClass = {
    sans: 'font-sans',
    mono: 'font-mono',
    pixel: 'font-pixel-square',
  };
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative py-2.5 px-3 rounded-[4px] text-[12px]",
        "flex items-center justify-center",
        "transition-all duration-150 ease-out",
        "hover:scale-[1.02]",
        "active:scale-[0.96] active:duration-75",
        fontClass[family],
        isActive 
          ? "text-theme-primary bg-theme-elevated/80"
          : "text-theme-muted hover:text-theme-secondary hover:bg-theme-elevated/40 active:bg-theme-elevated/60"
      )}
      style={{ border: isActive ? '0.5px solid var(--warm-500)' : '0.5px solid var(--border-primary)' }}
    >
      <span className="transition-transform duration-150">{label}</span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-warm-500 animate-pulse" />
      )}
    </button>
  );
};

// Font Weight Option Component
const FontWeightOption = ({ weight, label, current, onClick }: {
  weight: UIFontWeight;
  label: string;
  current: UIFontWeight;
  onClick: () => void;
}) => {
  const isActive = current === weight;
  
  const weightClass = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
  };
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative py-2.5 px-3 rounded-md text-[12px]",
        "flex items-center justify-center",
        "transition-all duration-150 ease-out",
        "hover:scale-[1.02]",
        "active:scale-[0.96] active:duration-75",
        weightClass[weight],
        isActive 
          ? "text-theme-primary bg-theme-elevated/80"
          : "text-theme-muted hover:text-theme-secondary hover:bg-theme-elevated/40 active:bg-theme-elevated/60"
      )}
      style={{ border: isActive ? '0.5px solid var(--warm-500)' : '0.5px solid var(--border-primary)' }}
    >
      <span className="transition-transform duration-150">{label}</span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-warm-500 animate-pulse" />
      )}
    </button>
  );
};

// Pixel Style Option Component
const PixelStyleOption = ({ style, label, current, onClick }: {
  style: UIFontPixelStyle;
  label: string;
  current: UIFontPixelStyle;
  onClick: () => void;
}) => {
  const isActive = current === style;
  
  const styleClass = {
    square: 'font-pixel-square',
    circle: 'font-pixel-circle',
    grid: 'font-pixel-grid',
    line: 'font-pixel-line',
    triangle: 'font-pixel-triangle',
  };
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative py-2.5 px-1 rounded-[4px] text-[11px]",
        "flex items-center justify-center",
        "transition-all duration-150 ease-out",
        "hover:scale-[1.02]",
        "active:scale-[0.96] active:duration-75",
        styleClass[style],
        isActive 
          ? "text-theme-primary bg-theme-elevated/80"
          : "text-theme-muted hover:text-theme-secondary hover:bg-theme-elevated/40 active:bg-theme-elevated/60"
      )}
      style={{ border: isActive ? '0.5px solid var(--warm-500)' : '0.5px solid var(--border-primary)' }}
    >
      <span className="transition-transform duration-150">{label}</span>
      {isActive && (
        <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-warm-500 animate-pulse" />
      )}
    </button>
  );
};

// Minimal Switch Component - Refined
const MinimalSwitch = ({ checked, onChange, variant = 'default' }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'default' | 'warning';
}) => (
  <label className="relative inline-flex items-center cursor-pointer group">
    <input 
      type="checkbox" 
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only peer"
    />
    <div 
      className={cn(
        "w-9 h-5 rounded-full transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-theme-elevated peer-checked:bg-warm-500",
        "group-hover:shadow-sm",
        variant === 'warning' && checked && "peer-checked:bg-amber-500"
      )}
      style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
    >
      <div className={cn(
        "absolute top-[2px] left-[2px]",
        "w-4 h-4 rounded-full bg-white transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "shadow-sm",
        checked ? "translate-x-4" : "translate-x-0",
        "group-hover:shadow-md"
      )} />
    </div>
  </label>
);

export default SettingsPanel;
