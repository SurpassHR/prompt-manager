import React from 'react';
import { Moon, Sun, Type, Laptop, Search, Globe } from 'lucide-react';
import { AppSettings } from '../types';
import { t } from '../utils/i18n';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onUpdateSettings }) => {
  const lang = settings.language;
  
  const fonts = [
    { name: 'Monospace (System Default)', value: "'Menlo', 'Monaco', 'Courier New', monospace" },
    { name: 'Fira Code', value: "'Fira Code', monospace" },
    { name: 'Source Code Pro', value: "'Source Code Pro', monospace" },
    { name: 'Consolas', value: "'Consolas', 'Courier New', monospace" },
  ];

  return (
    <div className="h-full w-full bg-[var(--bg-editor)] overflow-y-auto text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto px-12 py-12">
        <h1 className="text-3xl font-light mb-8">{t('settings.title', lang)}</h1>

        {/* Search Bar Simulation */}
        <div className="relative mb-10">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-[var(--text-secondary)]" />
          </div>
          <input 
            type="text"
            placeholder={t('settings.searchPlaceholder', lang)}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-sm rounded-md py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-12">
          
          {/* Appearance Section */}
          <section>
            <h2 className="text-xl font-normal mb-6 pb-2 border-b border-[var(--border-color)]">{t('settings.commonlyUsed', lang)}</h2>
            
            <div className="space-y-8">
              {/* Language */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-base flex items-center gap-2"><Globe size={16} /> {t('settings.language', lang)}</label>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{t('settings.languageDesc', lang)}</p>
                
                <div className="max-w-md">
                   <select
                    value={settings.language}
                    onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value as any })}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="zh">简体中文 (Chinese)</option>
                  </select>
                </div>
              </div>

              {/* Theme */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-base">{t('settings.colorTheme', lang)}</label>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{t('settings.colorThemeDesc', lang)}</p>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded border text-sm transition-all
                      ${settings.theme === 'dark' 
                        ? 'bg-blue-600/10 border-blue-600 text-blue-500' 
                        : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--item-hover)]'}
                    `}
                  >
                    <Moon size={14} /> {t('settings.dark', lang)}
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded border text-sm transition-all
                      ${settings.theme === 'light' 
                        ? 'bg-blue-600/10 border-blue-600 text-blue-500' 
                        : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--item-hover)]'}
                    `}
                  >
                    <Sun size={14} /> {t('settings.light', lang)}
                  </button>
                </div>
              </div>

              {/* Font Size */}
              <div className="flex flex-col gap-2">
                <label className="font-medium text-base">{t('settings.editorFontSize', lang)}</label>
                <p className="text-sm text-[var(--text-secondary)] mb-1">{t('settings.editorFontSizeDesc', lang)}</p>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={settings.editorFontSize}
                    onChange={(e) => onUpdateSettings({ ...settings, editorFontSize: parseInt(e.target.value) || 14 })}
                    className="w-24 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Font Family */}
              <div className="flex flex-col gap-2">
                <label className="font-medium text-base">{t('settings.editorFontFamily', lang)}</label>
                <p className="text-sm text-[var(--text-secondary)] mb-1">{t('settings.editorFontFamilyDesc', lang)}</p>
                <div className="max-w-md">
                   <select
                    value={settings.editorFontFamily}
                    onChange={(e) => onUpdateSettings({ ...settings, editorFontFamily: e.target.value })}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {fonts.map(font => (
                      <option key={font.value} value={font.value}>{font.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section>
            <h2 className="text-xl font-normal mb-6 pb-2 border-b border-[var(--border-color)]">{t('settings.about', lang)}</h2>
            <div className="text-sm text-[var(--text-secondary)] space-y-2">
                <p>{t('settings.version', lang)}</p>
                <p>{t('settings.desc', lang)}</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsTab;