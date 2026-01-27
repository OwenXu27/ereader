import React from 'react';
import { useBookStore } from '../../store/useBookStore';
import { X, Globe, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, isSettingsOpen, setSettingsOpen } = useBookStore();

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-serif">Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>

              <div className="space-y-6">
                {/* Theme */}
                <div>
                  <label className="text-sm font-medium text-zinc-500 mb-2 block">Theme</label>
                  <div className="flex gap-2">
                    {['light', 'dark', 'sepia'].map((t) => (
                      <button
                        key={t}
                        onClick={() => updateSettings({ theme: t as any })}
                        className={clsx(
                          "flex-1 py-2 px-4 rounded-lg border text-sm capitalize transition",
                          settings.theme === t 
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-sm font-medium text-zinc-500 mb-2 block">Font Size</label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs">A</span>
                    <input 
                      type="range" 
                      min="12" 
                      max="32" 
                      step="1"
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                      className="flex-1 accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span className="text-xl">A</span>
                  </div>
                </div>

                {/* Translation Settings */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Globe size={18} />
                      <span className="font-medium">Translation</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.translationEnabled}
                        onChange={(e) => updateSettings({ translationEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {settings.translationEnabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-500">API URL</label>
                        <input 
                          type="text"
                          value={settings.apiUrl}
                          onChange={(e) => updateSettings({ apiUrl: e.target.value })}
                          placeholder="https://api.moonshot.cn/v1"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[10px] text-zinc-400">
                          OpenAI-compatible API endpoint. Leave empty to use local proxy.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-500">API Key</label>
                        <input 
                          type="password"
                          value={settings.apiKey}
                          onChange={(e) => updateSettings({ apiKey: e.target.value })}
                          placeholder="sk-..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[10px] text-zinc-400">
                          Your API key will be saved locally in browser storage.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scripted EPUB (Sandbox) */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={18} />
                      <span className="font-medium">Allow EPUB Scripts</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.allowScriptedContent}
                        onChange={(e) => updateSettings({ allowScriptedContent: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Some EPUBs include scripts and will show a sandbox warning or render blank unless scripts are allowed. Turning this on is less safe for untrusted books.
                  </p>
                </div>
              </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
