
export type ItemType = 'provider' | 'model' | 'version' | 'prompt' | 'settings';

export interface PromptVersion {
  id: string;
  timestamp: number;
  content: string;
  label?: string;
}

export interface TreeItem {
  id: string;
  name: string;
  type: ItemType;
  children?: TreeItem[];
  parentId?: string;
  content?: string; // The actual prompt text
  versions?: PromptVersion[]; // History of the prompt
  // Metadata for prompts or models
  metadata?: {
    description?: string;
    tags?: string[];
    lastModified?: number; // Changed to number (timestamp) for easier filtering
  };
}

export interface EditorTab {
  id: string;
  name: string;
  type: ItemType;
  content: string; // Current editor content
  initialContent: string; // Content from DB (to check dirty state accurately)
  versions?: PromptVersion[];
  // Metadata tracking
  metadata?: {
    description?: string;
    tags?: string[];
    lastModified?: number;
  };
  initialMetadata?: {
    description?: string;
    tags?: string[];
    lastModified?: number;
  };
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

// Passed to editor to trigger scroll & highlight
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

// The generic Database Interface (The "GRUB" / CRUD interface)
export interface IDatabaseService {
  getItems(): Promise<TreeItem[]>;
  getItem(id: string): Promise<TreeItem | null>;
  addItem(parentId: string | null, item: Omit<TreeItem, 'id' | 'children'>): Promise<TreeItem>;
  updateItem(id: string, updates: Partial<TreeItem>): Promise<TreeItem>;
  deleteItem(id: string): Promise<void>;
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
