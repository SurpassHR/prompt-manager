import React, { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Save, Clock, Info, History, ArrowDownToLine, GitCompareArrows, Code2, Eye } from 'lucide-react';
import { EditorTab, PromptVersion, EditorHighlight, AppSettings, Language, ItemMetadata } from '../../types';
import { dbService } from '../../services/dbService';
import { getIconForName } from '../../utils/iconHelper';
import { t } from '../../utils/i18n';

interface MainContentProps {
    tabs: EditorTab[];
    activeTabId: string | null;
    onSwitchTab: (id: string) => void;
    onCloseTab: (id: string) => void;
    onUpdateTab: (id: string, updates: Partial<EditorTab>) => void;
    onSave: (id: string) => void;
    highlight: EditorHighlight | null;
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
    theme: string;
}

type MainView = 'code' | 'preview' | 'history' | 'info';

const MainContent: React.FC<MainContentProps> = ({
    tabs, activeTabId, onSwitchTab, onCloseTab, onUpdateTab, onSave,
    highlight, settings, onUpdateSettings, theme
}) => {
    const editorRef = useRef<any>(null);
    const [currentView, setCurrentView] = useState<MainView>('code');

    // 版本历史状态
    const [newVersionLabel, setNewVersionLabel] = useState('');
    const [showVersionInput, setShowVersionInput] = useState(false);

    // Diff 对比
    const [diffVersionId, setDiffVersionId] = useState<string | null>(null);

    const lang = settings.language;

    const activeTab = tabs.find(tab => tab.id === activeTabId);

    // 加载 tab 数据
    useEffect(() => {
        const fetchContent = async () => {
            if (activeTab && activeTab.isLoading && activeTab.type === 'prompt') {
                const item = await dbService.getItem(activeTab.id);
                if (item) {
                    onUpdateTab(activeTab.id, {
                        content: item.content || '',
                        initialContent: item.content || '',
                        versions: item.versions,
                        metadata: item.metadata ? { ...item.metadata } : {},
                        initialMetadata: item.metadata ? { ...item.metadata } : {},
                        isLoading: false,
                    });
                } else {
                    onUpdateTab(activeTab.id, { isLoading: false, content: '', initialContent: '' });
                }
            }
        };
        fetchContent();
    }, [activeTabId, activeTab?.isLoading]);

    // 高亮跳转
    useEffect(() => {
        if (highlight && editorRef.current && activeTab?.id === highlight.promptId) {
            const editor = editorRef.current;
            setTimeout(() => {
                editor.revealLineInCenter(highlight.lineNumber);
                editor.setSelection({
                    startLineNumber: highlight.lineNumber,
                    startColumn: highlight.startColumn,
                    endLineNumber: highlight.lineNumber,
                    endColumn: highlight.endColumn,
                });
                editor.focus();
            }, 100);
        }
    }, [highlight, activeTabId]);

    // Ctrl+S 快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (activeTabId && activeTab?.type === 'prompt') {
                    onSave(activeTabId);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTabId, activeTab]);

    const handleEditorMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const handleEditorChange = (value: string | undefined) => {
        if (activeTabId) {
            onUpdateTab(activeTabId, { content: value || '' });
        }
    };

    // 更新 metadata 字段
    const handleMetadataChange = (field: keyof ItemMetadata, value: string) => {
        if (!activeTabId || !activeTab) return;
        const updatedMetadata = { ...activeTab.metadata, [field]: value };
        onUpdateTab(activeTabId, { metadata: updatedMetadata });
    };

    // 保存版本
    const handleSaveVersion = () => {
        if (!activeTab || !activeTabId) return;
        const newVersion: PromptVersion = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            content: activeTab.content,
            label: newVersionLabel || undefined,
        };
        const updated = [...(activeTab.versions || []), newVersion];
        onUpdateTab(activeTabId, { versions: updated });
        onSave(activeTabId);
        setShowVersionInput(false);
        setNewVersionLabel('');
    };

    // 恢复版本
    const handleRestoreVersion = (version: PromptVersion) => {
        if (!activeTabId) return;
        if (confirm(t('versions.restoreConfirm', lang))) {
            onUpdateTab(activeTabId, { content: version.content });
        }
    };

    // Diff 对比
    const handleCompareVersion = (version: PromptVersion) => {
        setDiffVersionId(version.id);
        setCurrentView('code');
    };

    const exitDiff = () => {
        setDiffVersionId(null);
    };

    const diffVersion = activeTab?.versions?.find(v => v.id === diffVersionId);

    /* --- 渲染 --- */

    const renderSettings = () => {
        return (
            <div className="max-w-3xl mx-auto p-8">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('settings.title', lang)}</h1>
                <p className="text-sm text-[var(--text-secondary)] mb-8 border-b border-[var(--border-color)] pb-4">{t('settings.desc', lang)}</p>

                {/* 外观 */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">{t('settings.appearance', lang)}</h2>

                    {/* 主题 */}
                    <div className="mb-5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">{t('settings.colorTheme', lang)}</label>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-2">{t('settings.colorThemeDesc', lang)}</p>
                        <select
                            value={settings.theme}
                            onChange={(e) => onUpdateSettings({ ...settings, theme: e.target.value as any })}
                            className="w-64 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-md focus:outline-none focus:border-blue-500"
                        >
                            <option value="dark">{t('settings.theme.dark', lang)}</option>
                            <option value="light">{t('settings.theme.light', lang)}</option>
                            <option value="system">{t('settings.theme.system', lang)}</option>
                        </select>
                    </div>

                    {/* 语言 */}
                    <div className="mb-5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">{t('settings.language', lang)}</label>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-2">{t('settings.languageDesc', lang)}</p>
                        <select
                            value={settings.language}
                            onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value as any })}
                            className="w-64 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-md focus:outline-none focus:border-blue-500"
                        >
                            <option value="en">English</option>
                            <option value="zh">中文</option>
                        </select>
                    </div>

                    {/* 字号 */}
                    <div className="mb-5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">{t('settings.editorFontSize', lang)}</label>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-2">{t('settings.editorFontSizeDesc', lang)}</p>
                        <input
                            type="number"
                            value={settings.editorFontSize}
                            onChange={(e) => onUpdateSettings({ ...settings, editorFontSize: parseInt(e.target.value) || 14 })}
                            className="w-24 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-md focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* 字体 */}
                    <div className="mb-5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">{t('settings.editorFontFamily', lang)}</label>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-2">{t('settings.editorFontFamilyDesc', lang)}</p>
                        <input
                            type="text"
                            value={settings.editorFontFamily}
                            onChange={(e) => onUpdateSettings({ ...settings, editorFontFamily: e.target.value })}
                            className="w-64 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-md focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* 关于 */}
                <div className="mt-8 pt-4 border-t border-[var(--border-color)]">
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)]">{t('settings.about', lang)}</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{t('settings.version', lang)}</p>
                </div>
            </div>
        );
    };

    const renderVersionHistory = () => {
        const versions = activeTab?.versions || [];
        return (
            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">{t('versions.title', lang)}</h2>
                    {!showVersionInput && (
                        <button
                            onClick={() => setShowVersionInput(true)}
                            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                        >
                            <Save size={12} /> {t('versions.create', lang)}
                        </button>
                    )}
                </div>

                {showVersionInput && (
                    <div className="mb-4 p-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg">
                        <input
                            placeholder={t('versions.labelPlaceholder', lang)}
                            value={newVersionLabel}
                            onChange={(e) => setNewVersionLabel(e.target.value)}
                            className="w-full bg-[var(--input-bg)] text-sm text-[var(--text-primary)] px-3 py-2 rounded border border-[var(--border-color)] focus:outline-none focus:border-blue-500 mb-2"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveVersion}
                                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                {t('versions.save', lang)}
                            </button>
                            <button
                                onClick={() => { setShowVersionInput(false); setNewVersionLabel(''); }}
                                className="text-xs px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--item-hover)] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {versions.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)] italic">{t('versions.empty', lang)}</p>
                ) : (
                    <div className="space-y-2">
                        {[...versions].reverse().map((v) => (
                            <div key={v.id} className="p-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg group hover:border-[var(--text-secondary)]/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                                            {v.label || new Date(v.timestamp).toLocaleString()}
                                        </span>
                                        {v.label && (
                                            <span className="block text-[10px] text-[var(--text-secondary)]">
                                                {new Date(v.timestamp).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleCompareVersion(v)}
                                            className="text-[11px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                        >
                                            <GitCompareArrows size={11} /> {t('versions.compare', lang)}
                                        </button>
                                        <button
                                            onClick={() => handleRestoreVersion(v)}
                                            className="text-[11px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/30 transition-colors flex items-center gap-1"
                                        >
                                            <ArrowDownToLine size={11} /> {t('versions.restore', lang)}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // 详情面板（描述 + 模型配置）
    const renderDetailsPanel = () => {
        const metadata = activeTab?.metadata || {};

        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">{t('details.title', lang)}</h2>

                {/* 描述 */}
                <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('details.description', lang)}</label>
                    <textarea
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 resize-y min-h-[60px]"
                        placeholder={t('details.placeholder', lang)}
                        value={metadata.description || ''}
                        onChange={(e) => handleMetadataChange('description', e.target.value)}
                    />
                </div>

                {/* 模型配置 */}
                <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">{t('details.modelConfig', lang)}</label>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t('details.provider', lang)}</label>
                            <input
                                type="text"
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder={t('details.providerPlaceholder', lang)}
                                value={metadata.provider || ''}
                                onChange={(e) => handleMetadataChange('provider', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t('details.modelName', lang)}</label>
                            <input
                                type="text"
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder={t('details.modelNamePlaceholder', lang)}
                                value={metadata.modelName || ''}
                                onChange={(e) => handleMetadataChange('modelName', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t('details.baseUrl', lang)}</label>
                            <input
                                type="text"
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder={t('details.baseUrlPlaceholder', lang)}
                                value={metadata.baseUrl || ''}
                                onChange={(e) => handleMetadataChange('baseUrl', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t('details.apiKey', lang)}</label>
                            <input
                                type="password"
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder={t('details.apiKeyPlaceholder', lang)}
                                value={metadata.apiKey || ''}
                                onChange={(e) => handleMetadataChange('apiKey', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (!activeTab) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)]">
                    <Code2 size={48} className="mb-4 opacity-30" />
                    <p className="text-sm">{t('main.noActiveTab', lang)}</p>
                    <p className="text-xs opacity-50 mt-1">{t('main.selectPrompt', lang)}</p>
                </div>
            );
        }

        if (activeTab.type === 'settings') {
            return (
                <div className="flex-1 overflow-y-auto bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)]">
                    {renderSettings()}
                </div>
            );
        }

        if (activeTab.isLoading) {
            return (
                <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)]">
                    <div className="animate-pulse text-sm">Loading...</div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex overflow-hidden bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)]">
                {/* 编辑器/预览区域 */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* 视图切换栏 */}
                    <div className="flex items-center border-b border-[var(--border-color)] px-4 h-10">
                        {/* Diff 模式提示 */}
                        {diffVersionId && diffVersion ? (
                            <div className="flex items-center gap-2 text-xs text-blue-400 flex-1">
                                <GitCompareArrows size={14} />
                                <span>{t('versions.diffTitle', lang)}: {diffVersion.label || new Date(diffVersion.timestamp).toLocaleString()}</span>
                                <button
                                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded hover:bg-[var(--item-hover)]"
                                    onClick={exitDiff}
                                >
                                    {t('versions.exitDiff', lang)}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                {([
                                    { view: 'code' as MainView, icon: <Code2 size={14} />, label: t('main.code', lang) },
                                    { view: 'preview' as MainView, icon: <Eye size={14} />, label: t('main.preview', lang) },
                                ] as const).map((btn) => (
                                    <button
                                        key={btn.view}
                                        onClick={() => setCurrentView(btn.view)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${currentView === btn.view ? 'bg-[var(--item-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    >
                                        {btn.icon} {btn.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 右侧按钮 */}
                        <div className="flex-1" />
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentView(currentView === 'history' ? 'code' : 'history')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${currentView === 'history' ? 'bg-[var(--item-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                            >
                                <History size={14} /> {t('main.history', lang)}
                            </button>
                            <button
                                onClick={() => setCurrentView(currentView === 'info' ? 'code' : 'info')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${currentView === 'info' ? 'bg-[var(--item-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                            >
                                <Info size={14} /> {t('main.info', lang)}
                            </button>
                        </div>
                    </div>

                    {/* 主内容 */}
                    <div className="flex-1 overflow-hidden">
                        {currentView === 'code' && !diffVersionId && (
                            <Editor
                                language="markdown"
                                value={activeTab.content}
                                onChange={handleEditorChange}
                                onMount={handleEditorMount}
                                theme={theme}
                                options={{
                                    fontSize: settings.editorFontSize,
                                    fontFamily: settings.editorFontFamily,
                                    minimap: { enabled: false },
                                    wordWrap: 'on',
                                    lineNumbers: 'on',
                                    padding: { top: 16 },
                                    scrollBeyondLastLine: false,
                                    renderWhitespace: 'selection',
                                    glyphMargin: false,
                                    folding: true,
                                    lineDecorationsWidth: 0,
                                    lineNumbersMinChars: 3,
                                }}
                            />
                        )}

                        {currentView === 'code' && diffVersionId && diffVersion && (
                            <Editor
                                language="markdown"
                                value={activeTab.content}
                                theme={theme}
                                options={{
                                    fontSize: settings.editorFontSize,
                                    fontFamily: settings.editorFontFamily,
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    wordWrap: 'on',
                                    renderWhitespace: 'all',
                                    padding: { top: 16 },
                                }}
                            />
                        )}

                        {currentView === 'preview' && (
                            <div className="h-full overflow-y-auto p-6 prose prose-invert max-w-none text-[var(--text-primary)]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {activeTab.content}
                                </ReactMarkdown>
                            </div>
                        )}

                        {currentView === 'history' && renderVersionHistory()}
                        {currentView === 'info' && renderDetailsPanel()}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab 栏 */}
            {tabs.length > 0 && (
                <div className="flex items-center h-10 overflow-x-auto bg-[var(--bg-panel)] rounded-t-2xl border border-[var(--border-color)] border-b-0 px-2">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => onSwitchTab(tab.id)}
                            className={`
                group flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer rounded-md mr-1 transition-colors
                ${tab.id === activeTabId ? 'bg-[var(--item-hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--item-hover)]/50'}
              `}
                        >
                            <div className="opacity-75">{getIconForName(tab.name, tab.type, 12, tab.metadata)}</div>
                            <span className="truncate max-w-[120px]">{tab.name}</span>
                            {tab.isDirty && (
                                <div className="w-2 h-2 rounded-full bg-blue-400" title={t('main.unsaved', lang)} />
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                                className="opacity-0 group-hover:opacity-100 hover:bg-[var(--item-hover)] rounded p-0.5 ml-1"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 内容区 */}
            {renderContent()}
        </div>
    );
};

export default MainContent;