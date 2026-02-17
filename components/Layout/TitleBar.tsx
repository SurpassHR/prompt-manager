import React from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { Language } from '../../types';

const IS_TAURI = !!(window as any).__TAURI_INTERNALS__;

interface TitleBarProps {
    language: Language;
}

const TitleBar: React.FC<TitleBarProps> = ({ language }) => {
    const handleMinimize = async () => {
        if (!IS_TAURI) return;
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        getCurrentWindow().minimize();
    };

    const handleMaximize = async () => {
        if (!IS_TAURI) return;
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        if (await win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    };

    const handleClose = async () => {
        if (!IS_TAURI) return;
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        getCurrentWindow().close();
    };

    return (
        <div
            className="titlebar flex items-center justify-between h-9 bg-[var(--bg-titlebar)] border-b border-[var(--border-color)] select-none flex-shrink-0 transition-colors duration-200"
            data-tauri-drag-region
        >
            {/* Left: App title */}
            <div className="flex items-center pl-3 pointer-events-none" data-tauri-drag-region>
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide" data-tauri-drag-region>
                    Prompt Manager
                </span>
            </div>

            {/* Right: Window controls */}
            {IS_TAURI && (
                <div className="flex items-center h-full">
                    <button
                        onClick={handleMinimize}
                        className="h-full px-3.5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] transition-colors"
                        title={language === 'zh' ? '最小化' : 'Minimize'}
                    >
                        <Minus size={14} />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="h-full px-3.5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] transition-colors"
                        title={language === 'zh' ? '最大化' : 'Maximize'}
                    >
                        <Copy size={12} className="rotate-180" />
                    </button>
                    <button
                        onClick={handleClose}
                        className="h-full px-3.5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-red-600 hover:text-white transition-colors rounded-tr-2xl"
                        title={language === 'zh' ? '关闭' : 'Close'}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default TitleBar;
