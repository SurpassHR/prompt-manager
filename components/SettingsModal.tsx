import React from 'react';
import { X, Moon, Sun, Type } from 'lucide-react';
import { AppSettings, Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const fonts = [
    { name: 'Monospace (Default)', value: "'Menlo', 'Monaco', 'Courier New', monospace" },
    { name: 'Fira Code', value: "'Fira Code', monospace" },
    { name: 'Source Code Pro', value: "'Source Code Pro', monospace" },
    { name: 'Consolas', value: "'Consolas', 'Courier New', monospace" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[500px] bg-[var(--modal-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Appearance Section */}
          <section>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">Appearance</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                className={`
                  flex items-center justify-center gap-3 p-4 rounded-lg border transition-all
                  ${settings.theme === 'dark' 
                    ? 'bg-blue-600/10 border-blue-500 text-blue-500 ring-1 ring-blue-500' 
                    : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'}
                `}
              >
                <Moon size={20} />
                <span className="font-medium">Dark Mode</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                className={`
                  flex items-center justify-center gap-3 p-4 rounded-lg border transition-all
                  ${settings.theme === 'light' 
                    ? 'bg-blue-600/10 border-blue-500 text-blue-500 ring-1 ring-blue-500' 
                    : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'}
                `}
              >
                <Sun size={20} />
                <span className="font-medium">Light Mode</span>
              </button>
            </div>
          </section>

          {/* Editor Section */}
          <section>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">Editor</h3>
            
            <div className="space-y-4">
              {/* Font Family */}
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Type size={16} /> Font Family
                </label>
                <select
                  value={settings.editorFontFamily}
                  onChange={(e) => onUpdateSettings({ ...settings, editorFontFamily: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {fonts.map(font => (
                    <option key={font.value} value={font.value}>{font.name}</option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-primary)]">Font Size (px)</label>
                <input
                  type="number"
                  min="10"
                  max="32"
                  value={settings.editorFontSize}
                  onChange={(e) => onUpdateSettings({ ...settings, editorFontSize: parseInt(e.target.value) || 14 })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-app)] border-t border-[var(--border-color)] flex justify-end">
             <button 
               onClick={onClose}
               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
             >
               Done
             </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;