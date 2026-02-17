
import { IDatabaseService, TreeItem, SearchResult, SearchMatch, PromptVersion, SearchFilters } from '../types';

// CONFIGURATION
// 自动检测运行环境：Tauri 窗口内使用 Rust 后端，浏览器中使用 localStorage
const IS_TAURI = !!(window as any).__TAURI_INTERNALS__;
const STORAGE_TYPE = import.meta.env.VITE_STORAGE_TYPE || (IS_TAURI ? 'tauri' : 'local');
const API_BASE_URL = 'http://localhost:8000';

/* --- TAURI IMPLEMENTATION (Pure Rust Backend) --- */
import { invoke } from '@tauri-apps/api/core';

class TauriDatabaseService implements IDatabaseService {

  async getItems(): Promise<TreeItem[]> {
    try {
      return await invoke<TreeItem[]>('get_items');
    } catch (error) {
      console.error("Failed to fetch items:", error);
      throw error;
    }
  }

  async getItem(id: string): Promise<TreeItem | null> {
    try {
      return await invoke<TreeItem | null>('get_item', { id });
    } catch (error) {
      console.error(`Failed to fetch item ${id}:`, error);
      return null;
    }
  }

  async addItem(parentId: string | null, item: Omit<TreeItem, 'id' | 'children'>): Promise<TreeItem> {
    const payload = {
      id: "",
      name: item.name,
      type: item.type,
      children: [],
      parentId: parentId || undefined,
      content: item.content,
      versions: item.versions,
      metadata: item.metadata || {}
    };

    return await invoke<TreeItem>('add_item', { parentId, item: payload });
  }

  async updateItem(id: string, updates: Partial<TreeItem>): Promise<TreeItem> {
    const current = await this.getItem(id);
    if (!current) throw new Error("Item not found");

    const merged = { ...current, ...updates };
    // 合并 metadata 而不是覆盖
    if (updates.metadata && current.metadata) {
      merged.metadata = { ...current.metadata, ...updates.metadata };
    }
    return await invoke<TreeItem>('update_item', { id, updates: merged });
  }

  async deleteItem(id: string): Promise<void> {
    await invoke('delete_item', { id });
  }

  async moveItem(itemId: string, newParentId: string | null): Promise<TreeItem> {
    return await invoke<TreeItem>('move_item', { itemId, newParentId });
  }

  async searchItems(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    return await invoke<SearchResult[]>('search_items', { query, filters });
  }
}

/* --- MOCK DATA --- */

let MOCK_DATA_STORE: TreeItem[] = [
  {
    id: 'folder-1',
    name: '通用助手',
    type: 'folder',
    metadata: { lastModified: Date.now() - 86400000 * 2 },
    children: [
      {
        id: 'pr-1',
        name: 'Summarizer',
        type: 'prompt',
        parentId: 'folder-1',
        content: 'You are a helpful assistant. Summarize the following text:\n\n{{text}}\n\nKeep it concise.',
        metadata: {
          lastModified: Date.now(),
          description: 'A general purpose summarization prompt optimized for business documents.',
          provider: 'OpenAI',
          modelName: 'gpt-4',
        },
        versions: [
          {
            id: 'ver-1',
            timestamp: Date.now() - 100000000,
            label: 'Initial Draft',
            content: 'Summarize the text below.'
          }
        ]
      },
      {
        id: 'pr-2',
        name: 'Code Reviewer',
        type: 'prompt',
        parentId: 'folder-1',
        content: 'You are a senior code reviewer. Review the following code for bugs, performance issues, and best practices:\n\n```\n{{code}}\n```',
        metadata: {
          lastModified: Date.now() - 86400000,
          description: 'Code review prompt with focus on quality.',
          provider: 'Anthropic',
          modelName: 'claude-3.5-sonnet',
        },
      }
    ]
  },
  {
    id: 'pr-3',
    name: 'Translator',
    type: 'prompt',
    content: 'Translate the following text from {{source_lang}} to {{target_lang}}:\n\n{{text}}',
    metadata: {
      lastModified: Date.now() - 86400000 * 5,
      description: 'Multi-language translator.',
      provider: 'Google',
      modelName: 'gemini-1.5-pro',
    },
  },
  {
    id: 'pr-4',
    name: 'Creative Writer',
    type: 'prompt',
    content: 'You are a creative fiction writer. Write a short story about:\n\n{{topic}}',
    metadata: {
      lastModified: Date.now() - 86400000 * 10,
      description: 'Creative writing assistant.',
    },
  }
];

/* --- MOCK IMPLEMENTATION --- */

class MockDatabaseService implements IDatabaseService {

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getItems(): Promise<TreeItem[]> {
    await this.delay(100);
    return JSON.parse(JSON.stringify(MOCK_DATA_STORE));
  }

  async getItem(id: string): Promise<TreeItem | null> {
    await this.delay(50);
    return this.findNode(MOCK_DATA_STORE, id);
  }

  async addItem(parentId: string | null, item: Omit<TreeItem, 'id' | 'children'>): Promise<TreeItem> {
    await this.delay(100);
    const newItem: TreeItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      children: item.type === 'folder' ? [] : undefined,
      content: item.content || '',
      metadata: { ...item.metadata, lastModified: Date.now() }
    };

    if (!parentId) {
      MOCK_DATA_STORE.push(newItem);
    } else {
      const parent = this.findNode(MOCK_DATA_STORE, parentId);
      if (parent && parent.type === 'folder') {
        if (!parent.children) parent.children = [];
        parent.children.push(newItem);
      } else {
        throw new Error('Parent not found or not a folder');
      }
    }
    return newItem;
  }

  async updateItem(id: string, updates: Partial<TreeItem>): Promise<TreeItem> {
    await this.delay(50);
    const node = this.findNode(MOCK_DATA_STORE, id);
    if (!node) throw new Error('Item not found');

    const newMetadata = { ...node.metadata, ...updates.metadata, lastModified: Date.now() };
    Object.assign(node, { ...updates, metadata: newMetadata });

    return node;
  }

  async deleteItem(id: string): Promise<void> {
    await this.delay(100);
    MOCK_DATA_STORE = this.deleteNodeRecursively(MOCK_DATA_STORE, id);
  }

  async moveItem(itemId: string, newParentId: string | null): Promise<TreeItem> {
    await this.delay(50);
    const item = this.extractNode(MOCK_DATA_STORE, itemId);
    if (!item) throw new Error('Item not found');
    item.parentId = newParentId || undefined;
    if (newParentId) {
      const parent = this.findNode(MOCK_DATA_STORE, newParentId);
      if (!parent || parent.type !== 'folder') throw new Error('Target is not a folder');
      if (!parent.children) parent.children = [];
      parent.children.push(item);
    } else {
      MOCK_DATA_STORE.push(item);
    }
    return item;
  }

  private extractNode(nodes: TreeItem[], id: string): TreeItem | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes.splice(i, 1)[0];
      if (nodes[i].children) {
        const found = this.extractNode(nodes[i].children!, id);
        if (found) return found;
      }
    }
    return null;
  }

  async searchItems(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    await this.delay(200);
    const results: SearchResult[] = [];
    if (!query.trim()) return results;

    const lowerQuery = query.toLowerCase();

    const traverse = (nodes: TreeItem[]) => {
      for (const node of nodes) {
        let isMatch = false;
        const matches: SearchMatch[] = [];

        let dateMatch = true;
        if (filters && filters.date && filters.date !== 'any') {
          const lastMod = node.metadata?.lastModified || 0;
          const now = Date.now();
          const oneDay = 86400000;
          if (filters.date === 'today' && now - lastMod > oneDay) dateMatch = false;
          if (filters.date === 'week' && now - lastMod > oneDay * 7) dateMatch = false;
          if (filters.date === 'month' && now - lastMod > oneDay * 30) dateMatch = false;
        }

        const typeMatch = !filters?.types || filters.types.length === 0 || filters.types.includes(node.type);

        if (typeMatch && dateMatch) {
          if (node.name.toLowerCase().includes(lowerQuery)) {
            isMatch = true;
          }

          // 搜索提示词内容
          if (node.type === 'prompt' && node.content) {
            const lines = node.content.split('\n');
            lines.forEach((line, index) => {
              const lowerLine = line.toLowerCase();
              let startIndex = 0;
              let matchIndex = lowerLine.indexOf(lowerQuery, startIndex);

              while (matchIndex !== -1) {
                matches.push({
                  lineContent: line,
                  lineNumber: index + 1,
                  startColumn: matchIndex + 1,
                  endColumn: matchIndex + 1 + lowerQuery.length
                });
                startIndex = matchIndex + 1;
                matchIndex = lowerLine.indexOf(lowerQuery, startIndex);
              }
            });

            if (matches.length > 0) isMatch = true;
          }

          if (isMatch) {
            results.push({
              itemId: node.id,
              itemName: node.name,
              itemType: node.type,
              matches,
              lastModified: node.metadata?.lastModified
            });
          }
        }

        if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(MOCK_DATA_STORE);
    return results;
  }

  private findNode(nodes: TreeItem[], id: string): TreeItem | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private deleteNodeRecursively(nodes: TreeItem[], id: string): TreeItem[] {
    return nodes.filter(node => {
      if (node.id === id) return false;
      if (node.children && node.children.length > 0) {
        node.children = this.deleteNodeRecursively(node.children, id);
      }
      return true;
    });
  }
}

/* --- LOCALSTORAGE IMPLEMENTATION --- */

class LocalStorageDatabaseService implements IDatabaseService {
  private STORAGE_KEY = 'prompt_manager_data';

  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(MOCK_DATA_STORE));
    }
  }

  private getData(): TreeItem[] {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveData(data: TreeItem[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  async getItems(): Promise<TreeItem[]> {
    return this.getData();
  }

  async getItem(id: string): Promise<TreeItem | null> {
    const data = this.getData();
    return this.findNode(data, id);
  }

  async addItem(parentId: string | null, item: Omit<TreeItem, 'id' | 'children'>): Promise<TreeItem> {
    const data = this.getData();
    const newItem: TreeItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      children: item.type === 'folder' ? [] : undefined,
      content: item.content || '',
      metadata: { ...item.metadata, lastModified: Date.now() }
    };

    if (!parentId) {
      data.push(newItem);
    } else {
      const parent = this.findNode(data, parentId);
      if (parent && parent.type === 'folder') {
        if (!parent.children) parent.children = [];
        parent.children.push(newItem);
      } else {
        throw new Error('Parent not found or not a folder');
      }
    }
    this.saveData(data);
    return newItem;
  }

  async updateItem(id: string, updates: Partial<TreeItem>): Promise<TreeItem> {
    const data = this.getData();
    const node = this.findNode(data, id);
    if (!node) throw new Error('Item not found');

    const newMetadata = { ...node.metadata, ...updates.metadata, lastModified: Date.now() };
    Object.assign(node, { ...updates, metadata: newMetadata });

    this.saveData(data);
    return node;
  }

  async deleteItem(id: string): Promise<void> {
    let data = this.getData();
    data = this.deleteNodeRecursively(data, id);
    this.saveData(data);
  }

  async moveItem(itemId: string, newParentId: string | null): Promise<TreeItem> {
    const data = this.getData();
    const item = this.extractNode(data, itemId);
    if (!item) throw new Error('Item not found');
    item.parentId = newParentId || undefined;
    if (newParentId) {
      const parent = this.findNode(data, newParentId);
      if (!parent || parent.type !== 'folder') throw new Error('Target is not a folder');
      if (!parent.children) parent.children = [];
      parent.children.push(item);
    } else {
      data.push(item);
    }
    this.saveData(data);
    return item;
  }

  private extractNode(nodes: TreeItem[], id: string): TreeItem | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes.splice(i, 1)[0];
      if (nodes[i].children) {
        const found = this.extractNode(nodes[i].children!, id);
        if (found) return found;
      }
    }
    return null;
  }

  async searchItems(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const data = this.getData();
    const results: SearchResult[] = [];
    if (!query.trim()) return results;

    const lowerQuery = query.toLowerCase();

    const traverse = (nodes: TreeItem[]) => {
      for (const node of nodes) {
        let isMatch = false;
        const matches: SearchMatch[] = [];

        let dateMatch = true;
        if (filters && filters.date && filters.date !== 'any') {
          const lastMod = node.metadata?.lastModified || 0;
          const now = Date.now();
          const oneDay = 86400000;
          if (filters.date === 'today' && now - lastMod > oneDay) dateMatch = false;
          if (filters.date === 'week' && now - lastMod > oneDay * 7) dateMatch = false;
          if (filters.date === 'month' && now - lastMod > oneDay * 30) dateMatch = false;
        }

        const typeMatch = !filters?.types || filters.types.length === 0 || filters.types.includes(node.type);

        if (typeMatch && dateMatch) {
          if (node.name.toLowerCase().includes(lowerQuery)) {
            isMatch = true;
          }

          if (node.type === 'prompt' && node.content) {
            const lines = node.content.split('\n');
            lines.forEach((line, index) => {
              const lowerLine = line.toLowerCase();
              let startIndex = 0;
              let matchIndex = lowerLine.indexOf(lowerQuery, startIndex);

              while (matchIndex !== -1) {
                matches.push({
                  lineContent: line,
                  lineNumber: index + 1,
                  startColumn: matchIndex + 1,
                  endColumn: matchIndex + 1 + lowerQuery.length
                });
                startIndex = matchIndex + 1;
                matchIndex = lowerLine.indexOf(lowerQuery, startIndex);
              }
            });

            if (matches.length > 0) isMatch = true;
          }

          if (isMatch) {
            results.push({
              itemId: node.id,
              itemName: node.name,
              itemType: node.type,
              matches,
              lastModified: node.metadata?.lastModified
            });
          }
        }

        if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(data);
    return results;
  }

  private findNode(nodes: TreeItem[], id: string): TreeItem | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private deleteNodeRecursively(nodes: TreeItem[], id: string): TreeItem[] {
    return nodes.filter(node => {
      if (node.id === id) return false;
      if (node.children && node.children.length > 0) {
        node.children = this.deleteNodeRecursively(node.children, id);
      }
      return true;
    });
  }
}

// 根据配置导出选定的服务
console.log(`[Database] Initializing with storage type: ${STORAGE_TYPE} (local = localStorage, tauri = rust backend)`);

export const dbService =
  STORAGE_TYPE === 'local' ? new LocalStorageDatabaseService() :
    STORAGE_TYPE === 'mock' ? new MockDatabaseService() :
      STORAGE_TYPE === 'tauri' ? new TauriDatabaseService() :
        new TauriDatabaseService();
