
export type ItemType = 'prompt' | 'folder' | 'settings';

export interface PromptVersion {
  id: string;
  timestamp: number;
  content: string;
  label?: string;
}

export interface ItemMetadata {
  description?: string;
  tags?: string[];
  lastModified?: number;
  // 模型配置（仅 prompt 类型使用）
  provider?: string;     // e.g. "OpenAI", "Google", "Anthropic"
  modelName?: string;    // e.g. "gpt-4", "gemini-1.5-pro"
  baseUrl?: string;      // API base URL
  apiKey?: string;       // API Key
}

export interface TreeItem {
  id: string;
  name: string;
  type: ItemType;
  children?: TreeItem[];  // 仅 folder 类型使用
  parentId?: string;
  content?: string; // 提示词正文
  versions?: PromptVersion[];
  metadata?: ItemMetadata;
}

export interface EditorTab {
  id: string;
  name: string;
  type: ItemType;
  content: string;
  initialContent: string;
  versions?: PromptVersion[];
  metadata?: ItemMetadata;
  initialMetadata?: ItemMetadata;
  isDirty: boolean;
  isLoading: boolean;
  scrollPosition?: { lineNumber: number; column: number };
}

export interface SearchMatch {
  lineContent: string;
  lineNumber: number;
  startColumn: number;
  endColumn: number;
}

export interface SearchResult {
  itemId: string;
  itemName: string;
  itemType: ItemType;
  matches: SearchMatch[];
  lastModified?: number;
}

// 传给编辑器触发滚动和高亮
export interface EditorHighlight {
  promptId: string;
  lineNumber: number;
  startColumn: number;
  endColumn: number;
}

export type DateFilter = 'any' | 'today' | 'week' | 'month';

export interface SearchFilters {
  types: ItemType[];
  date: DateFilter;
}

// 数据库服务接口
export interface IDatabaseService {
  getItems(): Promise<TreeItem[]>;
  getItem(id: string): Promise<TreeItem | null>;
  addItem(parentId: string | null, item: Omit<TreeItem, 'id' | 'children'>): Promise<TreeItem>;
  updateItem(id: string, updates: Partial<TreeItem>): Promise<TreeItem>;
  deleteItem(id: string): Promise<void>;
  moveItem(itemId: string, newParentId: string | null): Promise<TreeItem>;
  searchItems(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
}

export type ViewMode = 'prompts' | 'search' | 'extensions' | 'settings' | 'none';

export type Theme = 'dark' | 'light' | 'system';
export type Language = 'en' | 'zh';

export interface AppSettings {
  theme: Theme;
  language: Language;
  editorFontSize: number;
  editorFontFamily: string;
}
