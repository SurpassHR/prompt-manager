import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Plus, ChevronRight, ChevronDown, RefreshCw, Trash2, ListCollapse, Edit2, Search as SearchIcon, Filter, X } from 'lucide-react';
import { TreeItem, ViewMode, SearchResult, EditorHighlight, ItemType, Language, SearchFilters, DateFilter } from '../../types';
import { dbService } from '../../services/dbService';
import { getIconForName } from '../../utils/iconHelper';
import { t } from '../../utils/i18n';

interface SidePanelProps {
  isVisible: boolean;
  activeView: ViewMode;
  onSelectPrompt: (id: string, name: string, type: ItemType, highlight?: EditorHighlight) => void;
  language: Language;
  width: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: TreeItem | null;
}

const SidePanel: React.FC<SidePanelProps> = ({ isVisible, activeView, onSelectPrompt, language, width }) => {
  const [items, setItems] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    date: 'any'
  });

  // Creation Input State
  const [showInput, setShowInput] = useState(false);
  const [inputParentId, setInputParentId] = useState<string | null>(null);
  const [inputType, setInputType] = useState<'provider' | 'model' | 'version' | 'prompt' | null>(null);
  const [inputName, setInputName] = useState('');
  
  // Renaming State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, item: null });

  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeView === 'prompts') {
      loadItems();
    }
  }, [activeView]);

  useEffect(() => {
    // Focus logic
    if (showInput && inputRef.current) inputRef.current.focus();
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [showInput, renamingId]);

  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, item: null });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const loadItems = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await dbService.getItems();
      setItems(data);
    } catch (error) {
      console.error("Failed to load items", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleSearch = async (query: string, currentFilters: SearchFilters) => {
    setSearchQuery(query);
    if (query.trim().length > 1) {
       setIsSearching(true);
       try {
         const results = await dbService.searchItems(query, currentFilters);
         setSearchResults(results);
       } finally {
         setIsSearching(false);
       }
    } else {
        setSearchResults([]);
    }
  };

  const toggleFilterType = (type: ItemType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    
    const newFilters = { ...filters, types: newTypes };
    setFilters(newFilters);
    handleSearch(searchQuery, newFilters);
  };

  const setDateFilter = (date: DateFilter) => {
    const newFilters = { ...filters, date };
    setFilters(newFilters);
    handleSearch(searchQuery, newFilters);
  };

  const clearFilters = () => {
    const newFilters: SearchFilters = { types: [], date: 'any' };
    setFilters(newFilters);
    handleSearch(searchQuery, newFilters);
  };

  const activeFilterCount = filters.types.length + (filters.date !== 'any' ? 1 : 0);

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  /* --- CRUD OPERATIONS --- */

  const initiateAdd = (parentId: string | null, type: 'provider' | 'model' | 'version' | 'prompt') => {
    if (parentId) {
      const newExpanded = new Set(expandedIds);
      newExpanded.add(parentId);
      setExpandedIds(newExpanded);
    }
    
    setInputParentId(parentId);
    setInputType(type);
    setInputName('');
    setShowInput(true);
    setRenamingId(null);
  };

  const confirmAdd = async () => {
    if (!inputName.trim() || !inputType) {
      setShowInput(false);
      return;
    }
    
    try {
      // Use background refresh to prevent flickering
      const newItem = await dbService.addItem(inputParentId, { name: inputName, type: inputType, content: '' });
      await loadItems(true); 
      
      if (inputParentId) {
          const newExpanded = new Set(expandedIds);
          newExpanded.add(inputParentId);
          setExpandedIds(newExpanded);
      }
      setShowInput(false);
      
      if (inputType === 'prompt') {
          setSelectedId(newItem.id);
          onSelectPrompt(newItem.id, newItem.name, newItem.type);
      }
    } catch (e) {
      alert("Error adding item");
      setShowInput(false);
    }
  };

  const initiateRename = (item: TreeItem) => {
    setRenamingId(item.id);
    setRenameName(item.name);
    setShowInput(false);
  };

  const confirmRename = async () => {
    if (!renamingId || !renameName.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      // Use background refresh
      await dbService.updateItem(renamingId, { name: renameName });
      await loadItems(true);
      setRenamingId(null);
    } catch (e) {
      alert("Error renaming item");
      setRenamingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('sidepanel.deleteConfirm', language))) {
      await dbService.deleteItem(id);
      // Use background refresh
      await loadItems(true);
      if (selectedId === id) {
          setSelectedId(null);
          // We can't easily clear the editor from here in the new tab model, 
          // but App will handle if the active tab is deleted eventually (out of scope for now)
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: TreeItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item
    });
    setSelectedId(item.id);
    if (item.type === 'prompt') {
      onSelectPrompt(item.id, item.name, item.type);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, mode: 'create' | 'rename') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      mode === 'create' ? confirmAdd() : confirmRename();
    }
    if (e.key === 'Escape') {
      setShowInput(false);
      setRenamingId(null);
    }
  };

  /* --- RENDERING --- */

  const renderInputRow = (level: number) => {
    const paddingLeft = `${level * 12 + 12}px`;
    return (
      <div className="flex items-center h-8 pr-2 my-0.5 rounded-lg bg-[var(--input-bg)] border border-blue-500/30 mx-2" style={{ marginLeft: paddingLeft }}>
          <div className="mr-2 shrink-0">{getIconForName(inputName, inputType!)}</div>
          <input 
              ref={inputRef}
              className="w-full bg-transparent text-[var(--text-primary)] text-xs outline-none"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'create')}
              onBlur={() => setShowInput(false)}
              placeholder="Name..."
          />
      </div>
    );
  };

  const renderRenameInput = (node: TreeItem) => {
    return (
      <input 
          ref={renameInputRef}
          className="flex-1 bg-[var(--input-bg)] text-[var(--text-primary)] text-xs px-1 outline-none border border-blue-500 rounded"
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'rename')}
          onBlur={confirmRename}
          onClick={(e) => e.stopPropagation()}
      />
    );
  };

  const renderTree = (nodes: TreeItem[], level: number = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedIds.has(node.id);
      const isSelected = selectedId === node.id;
      const isLeaf = node.type === 'prompt';
      const isRenaming = renamingId === node.id;
      
      const paddingLeft = `${level * 12 + 12}px`;

      return (
        <React.Fragment key={node.id}>
          <div 
            className={`
              flex items-center group cursor-pointer h-8 text-sm select-none pr-2 mx-2 rounded-lg transition-colors duration-150 my-[1px]
              ${isSelected && !isRenaming ? 'bg-zinc-700/50 text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)]'}
            `}
            style={{ paddingLeft }}
            onClick={() => {
              if (isRenaming) return;
              setSelectedId(node.id);
              if (!isLeaf) toggleExpand(node.id);
              else onSelectPrompt(node.id, node.name, node.type);
            }}
            onContextMenu={(e) => handleContextMenu(e, node)}
            title={node.metadata?.description || ''}
          >
            <div className={`w-5 flex items-center justify-center mr-0.5 ${isLeaf ? 'opacity-0' : ''}`}>
               {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            <div className="mr-2 shrink-0 opacity-80">
              {getIconForName(node.name, node.type)}
            </div>

            {isRenaming ? renderRenameInput(node) : (
               <span className="flex-1 truncate text-[13px]">{node.name}</span>
            )}

            {!isRenaming && (
              <div className="hidden group-hover:flex items-center space-x-1 ml-2 opacity-60">
                 {node.type === 'provider' && <Plus size={13} className="hover:text-[var(--text-primary)]" onClick={(e) => { e.stopPropagation(); initiateAdd(node.id, 'model'); }} />}
                 {node.type === 'model' && <Plus size={13} className="hover:text-[var(--text-primary)]" onClick={(e) => { e.stopPropagation(); initiateAdd(node.id, 'version'); }} />}
                 {node.type === 'version' && <Plus size={13} className="hover:text-[var(--text-primary)]" onClick={(e) => { e.stopPropagation(); initiateAdd(node.id, 'prompt'); }} />}
              </div>
            )}
          </div>

          {isExpanded && (
              <>
                  {node.children && renderTree(node.children, level + 1)}
                  {showInput && inputParentId === node.id && renderInputRow(level + 1)}
              </>
          )}
        </React.Fragment>
      );
    });
  };

  if (!isVisible) return null;

  return (
    <div 
      style={{ width: width }}
      className="h-full bg-[var(--bg-panel)] flex flex-col rounded-2xl border border-[var(--border-color)] shadow-sm relative overflow-hidden flex-shrink-0"
    >
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase">{activeView === 'prompts' ? t('sidepanel.explorer', language) : activeView}</span>
        {activeView === 'prompts' && (
          <div className="flex space-x-1 text-[var(--text-secondary)]">
               <button className="hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] p-1.5 rounded-md transition-colors" onClick={collapseAll} title={t('sidepanel.collapse', language)}>
                  <ListCollapse size={16} />
              </button>
              <button className="hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] p-1.5 rounded-md transition-colors" onClick={() => initiateAdd(null, 'provider')} title={t('sidepanel.addProvider', language)}>
                  <Plus size={16} />
              </button>
              <button className="hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] p-1.5 rounded-md transition-colors" onClick={() => loadItems(false)} title={t('sidepanel.refresh', language)}>
                  <RefreshCw size={14} />
              </button>
          </div>
        )}
      </div>

      {activeView === 'prompts' && (
        <div className="flex-1 overflow-y-auto pb-2 scroll-smooth" onContextMenu={(e) => e.preventDefault()}>
          <div className="flex items-center px-4 py-2 font-semibold text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]">
             <ChevronDown size={14} className="mr-1" />
             <span>{t('sidepanel.prompts', language)}</span>
          </div>
          
          <div className="py-1">
            {loading ? (
                <div className="p-4 text-xs text-center text-[var(--text-secondary)]">{t('sidepanel.loading', language)}</div>
            ) : (
                <>
                    {renderTree(items)}
                    {showInput && inputParentId === null && renderInputRow(0)}
                </>
            )}
             {items.length === 0 && !loading && !showInput && (
                <div className="p-8 text-xs text-center text-zinc-600 italic">
                    <p className="mb-2">{t('sidepanel.empty', language)}</p>
                    <button onClick={() => initiateAdd(null, 'provider')} className="text-blue-500 hover:underline">{t('sidepanel.createProvider', language)}</button>
                </div>
             )}
          </div>
        </div>
      )}

      {activeView === 'search' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pb-2 z-20 bg-[var(--bg-panel)]">
             <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder={t('search.placeholder', language)}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value, filters)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] px-3 py-1.5 pl-8 rounded focus:outline-none focus:border-blue-500"
                  />
                  <SearchIcon size={14} className="absolute left-2.5 top-2 text-[var(--text-secondary)]" />
                </div>
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`p-1.5 rounded border ${isFilterOpen || activeFilterCount > 0 ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--item-hover)]'}`}
                  title={t('search.filter', language)}
                >
                  <div className="relative">
                    <Filter size={14} />
                    {activeFilterCount > 0 && <div className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                </button>
             </div>
             
             {/* Filter Panel */}
             {isFilterOpen && (
               <div className="mt-2 p-3 bg-[var(--bg-app)] rounded-lg border border-[var(--border-color)] text-xs animate-in slide-in-from-top-2 duration-150">
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-[var(--text-secondary)]">{t('search.type', language)}</span>
                      {filters.types.length > 0 && <span onClick={() => setFilters({...filters, types: []})} className="text-[10px] text-blue-500 cursor-pointer hover:underline">{t('search.type.all', language)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['provider', 'model', 'version', 'prompt'] as ItemType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => toggleFilterType(type)}
                          className={`px-2 py-0.5 rounded border transition-colors ${filters.types.includes(type) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[var(--input-bg)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'}`}
                        >
                          {t(`search.type.${type}` as any, language)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <span className="block font-semibold text-[var(--text-secondary)] mb-1.5">{t('search.date', language)}</span>
                     <div className="grid grid-cols-2 gap-1.5">
                       {(['any', 'today', 'week', 'month'] as DateFilter[]).map(date => (
                         <button
                           key={date}
                           onClick={() => setDateFilter(date)}
                           className={`px-2 py-1 rounded text-center border transition-colors ${filters.date === date ? 'bg-blue-600/20 border-blue-600 text-blue-400' : 'bg-[var(--input-bg)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'}`}
                         >
                           {t(`search.date.${date}` as any, language)}
                         </button>
                       ))}
                     </div>
                  </div>
               </div>
             )}
          </div>
          
          <div className="flex-1 overflow-y-auto pb-4 pt-2">
            {isSearching ? (
               <div className="p-4 text-xs text-center text-[var(--text-secondary)]">{t('sidepanel.searching', language)}</div>
            ) : (
               <>
                 {searchQuery.length > 1 && (
                    <div className="px-4 py-1 text-xs text-[var(--text-secondary)] border-b border-[var(--border-color)] mb-2 flex justify-between">
                       <span>{searchResults.length} {t('sidepanel.resultsFound', language)}</span>
                    </div>
                 )}
                 {searchResults.length === 0 && searchQuery.length > 1 && !isSearching && (
                    <div className="text-center p-4 text-xs text-[var(--text-secondary)]">
                      No results found matching your criteria.
                      {activeFilterCount > 0 && <div onClick={clearFilters} className="text-blue-500 mt-1 cursor-pointer hover:underline">Clear Filters</div>}
                    </div>
                 )}
                 {searchResults.map(result => (
                    <div key={result.itemId} className="mb-2">
                      <div className="flex items-center justify-between px-4 py-1 bg-[var(--item-hover)] text-[var(--text-primary)] text-xs font-semibold">
                         <div className="flex items-center truncate">
                            <div className="mr-2 opacity-75">{getIconForName(result.itemName, result.itemType)}</div>
                            <span className="truncate">{result.itemName}</span>
                         </div>
                         {result.lastModified && (
                           <span className="text-[10px] text-[var(--text-secondary)] ml-2 whitespace-nowrap">
                             {new Date(result.lastModified).toLocaleDateString()}
                           </span>
                         )}
                      </div>
                      <div className="flex flex-col">
                        {result.matches.map((match, idx) => (
                           <div 
                              key={idx} 
                              onClick={() => onSelectPrompt(result.itemId, result.itemName, result.itemType, { 
                                promptId: result.itemId,
                                lineNumber: match.lineNumber,
                                startColumn: match.startColumn,
                                endColumn: match.endColumn
                              })}
                              className="px-8 py-1 hover:bg-[var(--item-hover)] cursor-pointer group flex text-xs font-mono text-[var(--text-secondary)]"
                           >
                              <span className="w-6 shrink-0 text-zinc-600 mr-2 text-right">{match.lineNumber}:</span>
                              <span className="truncate flex-1">
                                {match.lineContent.substring(0, match.startColumn - 1)}
                                <span className="text-blue-400 font-bold bg-blue-900/30 px-0.5 rounded-sm">{match.lineContent.substring(match.startColumn - 1, match.endColumn - 1)}</span>
                                {match.lineContent.substring(match.endColumn - 1)}
                              </span>
                           </div>
                        ))}
                        {result.matches.length === 0 && (
                            <div 
                              onClick={() => onSelectPrompt(result.itemId, result.itemName, result.itemType)}
                              className="px-8 py-1 hover:bg-[var(--item-hover)] cursor-pointer text-xs text-[var(--text-secondary)] italic"
                            >
                                Name match
                            </div>
                        )}
                      </div>
                    </div>
                 ))}
               </>
            )}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.item && (
        <div 
          className="fixed z-50 bg-[var(--modal-bg)] border border-[var(--border-color)] shadow-2xl rounded-lg py-1 min-w-[160px] text-[13px] text-[var(--text-primary)] backdrop-blur-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {['provider', 'model', 'version'].includes(contextMenu.item.type) && (
            <div 
              className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center gap-2 transition-colors mx-1 rounded"
              onClick={() => { initiateAdd(contextMenu.item!.id, contextMenu.item!.type === 'provider' ? 'model' : contextMenu.item!.type === 'model' ? 'version' : 'prompt'); setContextMenu(prev => ({ ...prev, visible: false })); }}
            >
              <Plus size={14} /> {t('sidepanel.new', language)} {contextMenu.item.type === 'provider' ? 'Model' : contextMenu.item.type === 'model' ? 'Version' : 'Prompt'}
            </div>
          )}
          
          <div className="h-[1px] bg-[var(--border-color)] my-1 mx-2" />
          
          <div 
            className="px-3 py-2 hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-2 transition-colors mx-1 rounded"
            onClick={() => { initiateRename(contextMenu.item!); setContextMenu(prev => ({ ...prev, visible: false })); }}
          >
            <Edit2 size={14} /> {t('sidepanel.rename', language)}
          </div>
          
           <div 
            className="px-3 py-2 hover:bg-red-900/50 hover:text-red-200 cursor-pointer flex items-center gap-2 text-red-400 transition-colors mx-1 rounded"
            onClick={() => { handleDelete(contextMenu.item!.id); setContextMenu(prev => ({ ...prev, visible: false })); }}
          >
            <Trash2 size={14} /> {t('sidepanel.delete', language)}
          </div>
        </div>
      )}
    </div>
  );
};

export default SidePanel;