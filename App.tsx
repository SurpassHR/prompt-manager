import React, { useState, useEffect } from 'react';
import ActivityBar from './components/Layout/ActivityBar';
import SidePanel from './components/Layout/SidePanel';
import MainContent from './components/Layout/MainContent';
import StatusBar from './components/Layout/StatusBar';
import { ViewMode, EditorHighlight, EditorTab, ItemType, AppSettings } from './types';
import { dbService } from './services/dbService';
import { AlertCircle, X } from 'lucide-react';
import { t } from './utils/i18n';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ViewMode>('prompts');
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [editorHighlight, setEditorHighlight] = useState<EditorHighlight | null>(null);

    // Sidebar Resizing State
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isResizing, setIsResizing] = useState(false);

    // Modal State
    const [tabToClose, setTabToClose] = useState<string | null>(null);
    const [showCloseModal, setShowCloseModal] = useState(false);

    // Settings State
    const [settings, setSettings] = useState<AppSettings>(() => {
        // Initialize from local storage or defaults
        const saved = localStorage.getItem('appSettings');
        return saved ? JSON.parse(saved) : {
            theme: 'system', // Default to system
            language: 'en',
            editorFontSize: 14,
            editorFontFamily: "'Menlo', 'Monaco', 'Courier New', monospace"
        };
    });

    // Derived state for actual theme (for Monaco Editor)
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');

    // Apply Theme Effect
    useEffect(() => {
        const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

        const applyTheme = () => {
            let themeToApply: 'light' | 'dark';

            if (settings.theme === 'system') {
                themeToApply = getSystemTheme();
            } else {
                themeToApply = settings.theme as 'light' | 'dark';
            }

            document.documentElement.setAttribute('data-theme', themeToApply);
            setCurrentTheme(themeToApply);
        };

        applyTheme();

        if (settings.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = () => applyTheme();
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
    }, [settings.theme]);

    // Persist settings
    useEffect(() => {
        localStorage.setItem('appSettings', JSON.stringify(settings));
    }, [settings]);

    const isSidebarVisible = activeView !== 'none';
    const lang = settings.language;

    // Sidebar Resizing Logic
    const startResizing = React.useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                // ActivityBar is ~56px + 8px margin + 8px app padding = ~72px offset
                const newWidth = mouseMoveEvent.clientX - 74;
                if (newWidth > 180 && newWidth < 800) {
                    setSidebarWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        } else {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isResizing, resize, stopResizing]);

    const handleOpenPrompt = (id: string, name: string, type: ItemType, highlight?: EditorHighlight) => {
        // Check if already open
        const existingTab = tabs.find(t => t.id === id);

        if (existingTab) {
            setActiveTabId(id);
        } else {
            // Open new tab
            const newTab: EditorTab = {
                id,
                name,
                type,
                content: '',
                initialContent: '',
                isDirty: false,
                isLoading: true, // Will trigger fetch in MainContent
            };
            setTabs([...tabs, newTab]);
            setActiveTabId(id);
        }

        if (highlight) {
            setEditorHighlight(highlight);
        } else {
            setEditorHighlight(null);
        }
    };

    const handleOpenSettings = () => {
        const SETTINGS_TAB_ID = 'settings_tab';
        const existingTab = tabs.find(t => t.id === SETTINGS_TAB_ID);

        if (existingTab) {
            setActiveTabId(SETTINGS_TAB_ID);
        } else {
            const newTab: EditorTab = {
                id: SETTINGS_TAB_ID,
                name: 'Settings',
                type: 'settings',
                content: '',
                initialContent: '',
                isDirty: false,
                isLoading: false,
            };
            setTabs([...tabs, newTab]);
            setActiveTabId(SETTINGS_TAB_ID);
        }
    };

    const handleUpdateTab = (id: string, updates: Partial<EditorTab>) => {
        setTabs(prev => prev.map(tab => {
            if (tab.id === id) {
                const updatedTab = { ...tab, ...updates };

                // Auto-calculate dirty state if content or metadata changes
                const isContentDirty = updatedTab.content !== updatedTab.initialContent;

                // Simple JSON comparison for metadata dirty check
                let isMetadataDirty = false;
                if (updatedTab.metadata && updatedTab.initialMetadata) {
                    isMetadataDirty = JSON.stringify(updatedTab.metadata) !== JSON.stringify(updatedTab.initialMetadata);
                } else if (!!updatedTab.metadata !== !!updatedTab.initialMetadata) {
                    isMetadataDirty = true;
                }

                if (updates.content !== undefined || updates.initialContent !== undefined || updates.metadata !== undefined || updates.initialMetadata !== undefined) {
                    updatedTab.isDirty = isContentDirty || isMetadataDirty;
                }

                return updatedTab;
            }
            return tab;
        }));
    };

    const handleTabCloseRequest = (id: string) => {
        const tab = tabs.find(t => t.id === id);
        if (!tab) return;

        if (tab.isDirty) {
            setTabToClose(id);
            setShowCloseModal(true);
        } else {
            forceCloseTab(id);
        }
    };

    const forceCloseTab = (id: string) => {
        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);

        if (activeTabId === id) {
            // Switch to nearest tab
            const closedIndex = tabs.findIndex(t => t.id === id);
            if (newTabs.length > 0) {
                // Try to go to the left, else the right (which is now at the same index)
                const newIndex = Math.max(0, closedIndex - 1);
                setActiveTabId(newTabs[newIndex].id);
            } else {
                setActiveTabId(null);
            }
        }
        setShowCloseModal(false);
        setTabToClose(null);
    };

    const handleSaveAndClose = async () => {
        if (tabToClose) {
            const tab = tabs.find(t => t.id === tabToClose);
            if (tab && tab.type !== 'settings') {
                await dbService.updateItem(tab.id, { content: tab.content, metadata: tab.metadata });
            }
            forceCloseTab(tabToClose);
        }
    };

    const handleSave = async (id: string) => {
        const tab = tabs.find(t => t.id === id);
        if (tab && tab.type !== 'settings') {
            await dbService.updateItem(tab.id, { content: tab.content, metadata: tab.metadata });
            handleUpdateTab(id, { initialContent: tab.content, initialMetadata: tab.metadata ? { ...tab.metadata } : undefined });
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] p-2 gap-2 relative transition-colors duration-200">
            {/* Top Main Area */}
            <div className="flex-1 flex flex-row overflow-hidden">

                {/* Left: Activity Bar */}
                <div className="flex-shrink-0 mr-2 h-full">
                    <ActivityBar
                        activeView={activeView}
                        onViewChange={setActiveView}
                        onOpenSettings={handleOpenSettings}
                        language={lang}
                    />
                </div>

                {/* Left: Sidebar Panel (Collapsible) + Resizer */}
                {isSidebarVisible && (
                    <>
                        <SidePanel
                            isVisible={isSidebarVisible}
                            activeView={activeView}
                            onSelectPrompt={handleOpenPrompt}
                            language={lang}
                            width={sidebarWidth}
                        />
                        {/* Resizer Handle */}
                        <div
                            className="w-2 hover:bg-blue-500/10 active:bg-blue-500/30 cursor-col-resize transition-colors flex-shrink-0 z-10"
                            onMouseDown={startResizing}
                        />
                    </>
                )}

                {/* Center: Editor Area */}
                <MainContent
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onSwitchTab={setActiveTabId}
                    onCloseTab={handleTabCloseRequest}
                    onUpdateTab={handleUpdateTab}
                    onSave={handleSave}
                    highlight={editorHighlight}
                    settings={settings}
                    onUpdateSettings={setSettings}
                    theme={currentTheme === 'light' ? 'light' : 'vs-dark'}
                />

            </div>

            {/* Bottom: Status Bar */}
            <StatusBar language={lang} />

            {/* Close Confirmation Modal */}
            {showCloseModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-[400px] bg-[var(--modal-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl p-6 flex flex-col">
                        <div className="flex items-center space-x-3 mb-4 text-[var(--text-primary)]">
                            <AlertCircle className="text-yellow-500" size={24} />
                            <h3 className="text-lg font-semibold">{t('modal.unsavedTitle', lang)}</h3>
                        </div>

                        <p className="text-[var(--text-secondary)] text-sm mb-6">
                            {t('modal.unsavedMessage', lang).replace('{name}', tabs.find(t => t.id === tabToClose)?.name || '')}
                        </p>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => forceCloseTab(tabToClose!)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--item-hover)] transition-colors"
                            >
                                {t('modal.dontSave', lang)}
                            </button>
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--item-hover)] transition-colors"
                            >
                                {t('modal.cancel', lang)}
                            </button>
                            <button
                                onClick={handleSaveAndClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors"
                            >
                                {t('modal.save', lang)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;