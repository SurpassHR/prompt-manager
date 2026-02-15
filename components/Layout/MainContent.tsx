import React, { useState, useEffect, useRef } from 'react';
import { Command, Save, Eye, Edit3, CheckCircle2, X, Circle, History, GitCompare, RotateCcw, Plus, Clock, Info } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { TreeItem, EditorHighlight, EditorTab, AppSettings, PromptVersion } from '../../types';
import { getIconForName } from '../../utils/iconHelper';
import { t } from '../../utils/i18n';
import Editor, { useMonaco, DiffEditor } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SettingsTab from '../SettingsTab';

interface MainContentProps {
    tabs: EditorTab[];
    activeTabId: string | null;
    onSwitchTab: (id: string) => void;
    onCloseTab: (id: string) => void;
    onUpdateTab: (id: string, updates: Partial<EditorTab>) => void;
    onSave: (id: string) => void;
    highlight?: EditorHighlight | null;
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    theme: 'light' | 'vs-dark'; // Add theme prop
}

const MainContent: React.FC<MainContentProps> = ({
    tabs,
    activeTabId,
    onSwitchTab,
    onCloseTab,
    onUpdateTab,
    onSave,
    highlight,
    settings,
    onUpdateSettings,
    theme // Destructure theme
}) => {
    const [isPreview, setIsPreview] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [diffVersion, setDiffVersion] = useState<PromptVersion | null>(null);

    // New Version Input
    const [showVersionInput, setShowVersionInput] = useState(false);
    const [versionLabel, setVersionLabel] = useState('');

    const activeTab = tabs.find(t => t.id === activeTabId);
    const lang = settings.language;

    const monaco = useMonaco();
    const editorRef = useRef<any>(null);
    const decorationsCollection = useRef<any>(null);
    const scrollPositions = useRef<Map<string, { scrollTop: number, scrollLeft: number }>>(new Map());

    // Monaco Config
    useEffect(() => {
        if (monaco) {
            const jsonContrib = monaco.languages.json as any;
            if (jsonContrib?.jsonDefaults) {
                jsonContrib.jsonDefaults.setDiagnosticsOptions({ validate: true });
            }
        }
    }, [monaco]);

    // Handle Loading Data for New Tabs
    useEffect(() => {
        if (activeTab && activeTab.isLoading && activeTab.type !== 'settings') {
            const loadData = async () => {
                try {
                    const item = await dbService.getItem(activeTab.id);
                    const content = item?.content || '';
                    const versions = item?.versions || [];
                    // Update tab with loaded content and clear loading state
                    onUpdateTab(activeTab.id, {
                        content,
                        initialContent: content,
                        versions,
                        metadata: item?.metadata || {},
                        initialMetadata: item?.metadata ? JSON.parse(JSON.stringify(item.metadata)) : {},
                        isLoading: false
                    });
                } catch (e) {
                    console.error("Failed to load prompt content", e);
                    onUpdateTab(activeTab.id, {
                        content: '',
                        initialContent: '',
                        versions: [],
                        metadata: {},
                        initialMetadata: {},
                        isLoading: false
                    });
                }
            };
            loadData();
        }
    }, [activeTab?.id, activeTab?.isLoading, activeTab?.type]);

    // Save Scroll Position on Tab Switch (Cleanup of previous tab)
    useEffect(() => {
        return () => {
            if (activeTabId && editorRef.current && activeTab?.type !== 'settings') {
                try {
                    const scrollTop = editorRef.current.getScrollTop();
                    const scrollLeft = editorRef.current.getScrollLeft();
                    scrollPositions.current.set(activeTabId, { scrollTop, scrollLeft });
                } catch (e) {
                    console.warn("Failed to save scroll position", e);
                }
            }
        };
    }, [activeTabId, activeTab?.type]);

    // Reset UI state when switching tabs
    useEffect(() => {
        setShowHistory(false);
        setShowDetails(false);
        setDiffVersion(null);
        setShowVersionInput(false);
    }, [activeTabId]);

    // Restore Scroll & Highlights logic encapsulated to run when editor is ready
    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;

        // 1. Restore Scroll
        if (activeTabId) {
            const savedPos = scrollPositions.current.get(activeTabId);
            if (savedPos) {
                editor.setScrollPosition(savedPos);
            }
        }

        // 2. Initial Highlight if present
        updateHighlights(editor);
    };

    // Update highlights when prop changes, or active tab changes (though re-mount handles that mostly)
    useEffect(() => {
        if (editorRef.current && activeTabId) {
            updateHighlights(editorRef.current);
        }
    }, [highlight, activeTabId]);

    const updateHighlights = (editor: any) => {
        if (!editor) return;

        // Clear existing
        if (decorationsCollection.current) {
            decorationsCollection.current.clear();
            decorationsCollection.current = null;
        }

        if (highlight && highlight.promptId === activeTabId) {
            const { lineNumber, startColumn, endColumn } = highlight;
            editor.revealRangeInCenter({ startLineNumber: lineNumber, startColumn, endLineNumber: lineNumber, endColumn });

            const newDecorations = [{
                range: new monaco.Range(lineNumber, startColumn, lineNumber, endColumn),
                options: { isWholeLine: false, className: 'findMatch', overviewRuler: { color: 'rgba(234, 179, 8, 0.8)', position: 1 } }
            }];
            decorationsCollection.current = editor.createDecorationsCollection(newDecorations);
        }
    };

    const handleEditorChange = (value: string | undefined) => {
        if (activeTabId) {
            onUpdateTab(activeTabId, { content: value || '' });
        }
    };

    const handleMetadataChange = (key: string, value: any) => {
        if (activeTab) {
            const newMetadata = { ...(activeTab.metadata || {}), [key]: value };
            onUpdateTab(activeTab.id, { metadata: newMetadata });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Simple Save Shortcut (Ctrl/Cmd + S)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (activeTabId && activeTab?.type !== 'settings') onSave(activeTabId);
        }
    };

    // Version Management
    const handleCreateVersion = async () => {
        if (!activeTab) return;

        const newVersion: PromptVersion = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            content: activeTab.content,
            label: versionLabel.trim() || `v${(activeTab.versions?.length || 0) + 1}`
        };

        const updatedVersions = [newVersion, ...(activeTab.versions || [])];

        try {
            // Persist
            await dbService.updateItem(activeTab.id, { versions: updatedVersions });
            // Update Local
            onUpdateTab(activeTab.id, { versions: updatedVersions });
            setVersionLabel('');
            setShowVersionInput(false);
        } catch (e) {
            console.error("Failed to save version", e);
            alert("Failed to save version");
        }
    };

    const handleRestoreVersion = async (version: PromptVersion) => {
        if (!activeTab) return;
        if (confirm(t('versions.restoreConfirm', lang))) {
            onUpdateTab(activeTab.id, { content: version.content });
            setDiffVersion(null); // Exit diff if open
        }
    };

    // Helper to determine content to render
    const renderContent = () => {
        if (!activeTab) return <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">{t('main.noActiveTab', lang)}</div>;

        if (activeTab.type === 'settings') {
            return <SettingsTab settings={settings} onUpdateSettings={onUpdateSettings} />;
        }

        if (diffVersion) {
            return (
                <DiffEditor
                    height="100%"
                    language="markdown"
                    theme={theme}
                    original={diffVersion.content}
                    modified={activeTab.content}
                    options={{
                        fontSize: settings.editorFontSize,
                        fontFamily: settings.editorFontFamily,
                        readOnly: true,
                        renderSideBySide: true,
                    }}
                />
            );
        }

        if (isPreview) {
            return (
                <div className="h-full w-full overflow-auto p-8 bg-[var(--bg-panel)] text-[var(--text-primary)]">
                    <div className="markdown-preview max-w-3xl mx-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {activeTab.content}
                        </ReactMarkdown>
                    </div>
                </div>
            );
        }

        if (activeTab.isLoading) {
            return <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">{t('sidepanel.loading', lang)}</div>;
        }

        return (
            <Editor
                key={`${activeTab.id}-${theme}-${settings.editorFontSize}-${settings.language}`}
                height="100%"
                defaultLanguage="markdown"
                theme={theme}
                value={activeTab.content}
                onMount={handleEditorDidMount}
                onChange={handleEditorChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: settings.editorFontSize,
                    fontFamily: settings.editorFontFamily,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 24, bottom: 24 },
                    automaticLayout: true,
                    renderLineHighlight: 'none',
                    overviewRulerBorder: false,
                    lineNumbers: 'on',
                    glyphMargin: false,
                    folding: false,
                }}
            />
        );
    };

    if (tabs.length === 0) {
        return (
            <div className="flex-1 h-full bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] flex flex-col items-center justify-center text-[var(--text-secondary)] select-none">
                <div className="flex flex-col items-center max-w-md text-center p-8 rounded-3xl bg-[var(--bg-app)]/50 border border-[var(--border-color)]">
                    <Command size={64} strokeWidth={1} className="mb-6 opacity-40 text-blue-500" />
                    <h1 className="text-xl font-medium mb-2 text-[var(--text-primary)]">{t('app.name', lang)}</h1>
                    <p className="text-sm">{t('main.selectPrompt', lang)}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full bg-[var(--bg-editor)] rounded-2xl border border-[var(--border-color)] flex flex-col overflow-hidden shadow-sm" onKeyDown={handleKeyDown}>

            {/* Tab Bar */}
            <div className="h-10 bg-[var(--bg-app)] flex items-center px-2 pt-2 gap-1 overflow-x-auto no-scrollbar border-b border-[var(--border-color)]">
                {tabs.map(tab => {
                    const isActive = tab.id === activeTabId;
                    const tabName = tab.type === 'settings' ? t('settings.title', lang) : tab.name;

                    return (
                        <div
                            key={tab.id}
                            onClick={() => onSwitchTab(tab.id)}
                            className={`
                            group relative flex items-center h-full min-w-[140px] max-w-[200px] px-3 pr-8 rounded-t-lg text-xs cursor-pointer select-none border-t border-x transition-colors
                            ${isActive
                                    ? 'bg-[var(--bg-editor)] border-[var(--border-color)] text-[var(--text-primary)] border-b-[var(--bg-editor)]'
                                    : 'bg-[var(--bg-panel)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)]'
                                }
                        `}
                        >
                            <span className="mr-2 opacity-80">{getIconForName(tab.name, tab.type, 14)}</span>
                            <span className="truncate">{tabName}</span>

                            <div
                                className="absolute right-2 p-0.5 rounded-md hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] text-transparent group-hover:text-[var(--text-secondary)] transition-all flex items-center justify-center"
                                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                            >
                                {tab.isDirty ? <Circle size={8} fill="currentColor" className="text-[var(--text-secondary)] group-hover:hidden" /> : null}
                                <X size={14} className={tab.isDirty ? "hidden group-hover:block" : ""} />
                            </div>

                            {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500 rounded-t-full" />}
                        </div>
                    );
                })}
            </div>

            {/* Toolbar Header (For Active Tab) */}
            {activeTab && activeTab.type !== 'settings' && (
                <div className="h-10 bg-[var(--bg-editor)] flex items-center px-4 border-b border-[var(--border-color)] justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="text-xs text-[var(--text-secondary)]">
                            {activeTab.type.toUpperCase()} <span className="text-[var(--text-secondary)]">/</span> {activeTab.name}
                        </span>
                        {activeTab.isDirty ? (
                            <div className="flex items-center text-[10px] text-yellow-500/80 gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                <Circle size={6} fill="currentColor" /> {t('main.unsaved', lang)}
                            </div>
                        ) : (
                            <div className="flex items-center text-[10px] text-green-500/50 gap-1">
                                <CheckCircle2 size={10} /> {t('main.saved', lang)}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {diffVersion ? (
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-xs text-[var(--text-secondary)] font-medium bg-purple-500/10 text-purple-400 px-2 py-1 rounded">
                                    {t('versions.diffTitle', lang)}: {diffVersion.label}
                                </span>
                                <button
                                    onClick={() => setDiffVersion(null)}
                                    className="px-2 py-1 bg-[var(--item-hover)] hover:bg-zinc-700 text-[10px] rounded border border-[var(--border-color)]"
                                >
                                    {t('versions.exitDiff', lang)}
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => onSave(activeTab.id)}
                                    title="Save (Ctrl+S)"
                                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--item-hover)] rounded transition-colors"
                                >
                                    <Save size={14} />
                                </button>

                                <button
                                    onClick={() => {
                                        setShowDetails(!showDetails);
                                        if (!showDetails) setShowHistory(false);
                                    }}
                                    title={t('main.info', lang)}
                                    className={`p-1.5 rounded transition-colors ${showDetails ? 'text-blue-400 bg-blue-400/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--item-hover)]'}`}
                                >
                                    <Info size={14} />
                                </button>

                                <button
                                    onClick={() => {
                                        setShowHistory(!showHistory);
                                        if (!showHistory) setShowDetails(false);
                                        if (diffVersion) setDiffVersion(null);
                                    }}
                                    title={t('main.history', lang)}
                                    className={`p-1.5 rounded transition-colors ${showHistory ? 'text-blue-400 bg-blue-400/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--item-hover)]'}`}
                                >
                                    <History size={14} />
                                </button>

                                <div className="h-4 w-[1px] bg-[var(--border-color)] mx-1" />
                                <div className="flex items-center bg-[var(--bg-app)] p-0.5 rounded-lg border border-[var(--border-color)]">
                                    <button
                                        className={`p-1 px-2 rounded-md text-[10px] font-medium transition-all ${!isPreview ? 'bg-[var(--item-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                        onClick={() => setIsPreview(false)}
                                    >
                                        {t('main.code', lang)}
                                    </button>
                                    <button
                                        className={`p-1 px-2 rounded-md text-[10px] font-medium transition-all ${isPreview ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                        onClick={() => setIsPreview(true)}
                                    >
                                        {t('main.preview', lang)}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Content Area */}
                <div className="flex-1 relative overflow-hidden bg-[var(--bg-editor)]">
                    {renderContent()}
                </div>

                {/* History Sidebar */}
                {activeTab && activeTab.type !== 'settings' && showHistory && (
                    <div className="w-64 bg-[var(--bg-panel)] border-l border-[var(--border-color)] flex flex-col animate-in slide-in-from-right-10 duration-200">
                        <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center">
                            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('versions.title', lang)}</span>
                            <button onClick={() => setShowHistory(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Create Version Form */}
                        <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-app)]/30">
                            {showVersionInput ? (
                                <div className="flex flex-col gap-2">
                                    <input
                                        autoFocus
                                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-xs p-1.5 rounded focus:outline-none focus:border-blue-500"
                                        placeholder={t('versions.labelPlaceholder', lang)}
                                        value={versionLabel}
                                        onChange={(e) => setVersionLabel(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateVersion()}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setShowVersionInput(false)} className="text-xs px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{t('modal.cancel', lang)}</button>
                                        <button onClick={handleCreateVersion} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">{t('modal.save', lang)}</button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowVersionInput(true)}
                                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded border border-dashed border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:border-blue-500 hover:text-blue-500 transition-colors"
                                >
                                    <Plus size={12} /> {t('versions.create', lang)}
                                </button>
                            )}
                        </div>

                        {/* Versions List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {(!activeTab.versions || activeTab.versions.length === 0) && (
                                <div className="text-center py-8 text-xs text-[var(--text-secondary)] italic">
                                    {t('versions.empty', lang)}
                                </div>
                            )}

                            {activeTab.versions?.map((v) => (
                                <div key={v.id} className="group p-2 rounded-lg hover:bg-[var(--item-hover)] border border-transparent hover:border-[var(--border-color)] transition-all">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-medium text-[var(--text-primary)]">{v.label || 'Untitled'}</span>
                                        <span className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">{new Date(v.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                                            <Clock size={10} /> {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setDiffVersion(v)}
                                                title={t('versions.compare', lang)}
                                                className="p-1 hover:bg-purple-500/20 hover:text-purple-400 rounded text-[var(--text-secondary)]"
                                            >
                                                <GitCompare size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleRestoreVersion(v)}
                                                title={t('versions.restore', lang)}
                                                className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-[var(--text-secondary)]"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Details Sidebar */}
                {activeTab && activeTab.type !== 'settings' && showDetails && (
                    <div className="w-64 bg-[var(--bg-panel)] border-l border-[var(--border-color)] flex flex-col animate-in slide-in-from-right-10 duration-200">
                        <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center">
                            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('details.title', lang)}</span>
                            <button onClick={() => setShowDetails(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[var(--text-secondary)] block">{t('details.description', lang)}</label>
                                <textarea
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] p-2 rounded focus:outline-none focus:border-blue-500 min-h-[120px] resize-none"
                                    placeholder={t('details.placeholder', lang)}
                                    value={activeTab.metadata?.description || ''}
                                    onChange={(e) => handleMetadataChange('description', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MainContent;