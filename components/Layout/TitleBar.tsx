import React, { useEffect, useRef } from 'react';
import { Minus, X, Copy } from 'lucide-react';
import { Language } from '../../types';

const IS_TAURI = !!(window as any).__TAURI_INTERNALS__;

interface TitleBarProps {
    language: Language;
}

const TitleBar: React.FC<TitleBarProps> = ({ language }) => {
    // 预加载窗口实例，避免 mouseDown 时的 async 延迟
    const winRef = useRef<any>(null);

    useEffect(() => {
        if (!IS_TAURI) return;
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
            winRef.current = getCurrentWindow();
        });
    }, []);

    const handleMinimize = () => winRef.current?.minimize();
    const handleMaximize = async () => {
        const win = winRef.current;
        if (!win) return;
        if (await win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    };
    const handleClose = () => winRef.current?.close();

    const handleMouseDown = (e: React.MouseEvent) => {
        // 仅在左键点击拖拽区域时触发
        if (e.button !== 0 || !winRef.current) return;
        const target = e.target as HTMLElement;
        if (target.closest('button')) return; // 不拦截按钮点击
        e.preventDefault();
        winRef.current.startDragging();
    };

    return (
        <div
            className="titlebar flex items-center justify-between h-9 bg-[var(--bg-titlebar)] border-b border-[var(--border-color)] select-none flex-shrink-0 transition-colors duration-200 cursor-default"
            onMouseDown={handleMouseDown}
        >
            {/* 左侧：应用标题 */}
            <div className="flex items-center pl-3">
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide pointer-events-none">
                    Prompt Manager
                </span>
            </div>

            {/* 右侧：窗口控制按钮 */}
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
                        className="h-full px-3.5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-red-600 hover:text-white transition-colors"
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
