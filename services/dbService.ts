
import { IDatabaseService, TreeItem, SearchResult, SearchMatch, PromptVersion, SearchFilters } from '../types';

// CONFIGURATION
const USE_MOCK = true; // Set to true to use in-memory mock data, false for FastAPI backend
const API_BASE_URL = 'http://localhost:8000';

/* --- API IMPLEMENTATION (For FastAPI) --- */
class ApiDatabaseService implements IDatabaseService {
  
  async getItems(): Promise<TreeItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/items`);
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch items:", error);
      throw error;
    }
  }

  async getItem(id: string): Promise<TreeItem | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/items/${id}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch item ${id}:`, error);
      return null;
    }
  }

  async addItem(parentId: string | null, item: Omit<TreeItem, 'id' | 'children'>): Promise<TreeItem> {
    const response = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, parentId }) 
    });
    if (!response.ok) throw new Error('Failed to create item');
    return await response.json();
  }

  async updateItem(id: string, updates: Partial<TreeItem>): Promise<TreeItem> {
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update item');
    return await response.json();
  }

  async deleteItem(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete item');
  }

  async searchItems(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const queryParams = new URLSearchParams({ q: query });
    if (filters) {
       queryParams.set('filters', JSON.stringify(filters));
    }
    const response = await fetch(`${API_BASE_URL}/search?${queryParams.toString()}`);
    if (!response.ok) throw new Error('Search request failed');
    return await response.json();
  }
}

/* --- MOCK IMPLEMENTATION (Fallback) --- */

// Initial Mock Data
let MOCK_DATA_STORE: TreeItem[] = [
  {
    id: 'p-1',
    name: 'OpenAI',
    type: 'provider',
    metadata: { lastModified: Date.now() - 86400000 * 2 }, // 2 days ago
    children: [
      {
        id: 'm-1',
        name: 'GPT-4',
        type: 'model',
        parentId: 'p-1',
        metadata: { lastModified: Date.now() - 86400000 * 2 },
        children: [
          { 
            id: 'v-1', 
            name: 'Production', 
            type: 'version', 
            parentId: 'm-1', 
            metadata: { lastModified: Date.now() - 86400000 * 2 },
            children: [
              { 
                id: 'pr-1', 
                name: 'Summarizer', 
                type: 'prompt', 
                parentId: 'v-1', 
                content: 'You are a helpful assistant. Summarize the following text:\n\n{{text}}\n\nKeep it concise.',
                metadata: { 
                  lastModified: Date.now(),
                  description: 'A general purpose summarization prompt optimized for business documents.' 
                }, // Today
                versions: [
                  {
                    id: 'ver-1',
                    timestamp: Date.now() - 100000000,
                    label: 'Initial Draft',
                    content: 'Summarize the text below.'
                  }
                ]
              }
            ] 
          },
          { id: 'v-2', name: 'Drafts', type: 'version', parentId: 'm-1', children: [], metadata: { lastModified: Date.now() - 86400000 * 10 } }
        ]
      },
      {
        id: 'm-2',
        name: 'GPT-3.5',
        type: 'model',
        parentId: 'p-1',
        metadata: { lastModified: Date.now() - 86400000 * 20 },
        children: []
      }
    ]
  },
  {
    id: 'p-2',
    name: 'Google',
    type: 'provider',
    metadata: { lastModified: Date.now() - 86400000 * 5 },
    children: [
      {
        id: 'm-3',
        name: 'Gemini',
        type: 'model',
        parentId: 'p-2',
        metadata: { lastModified: Date.now() - 86400000 * 5 },
        children: [
          { id: 'v-3', name: 'gemini-1.5-pro', type: 'version', parentId: 'm-3', children: [] },
          { id: 'v-4', name: 'gemini-flash', type: 'version', parentId: 'm-3', children: [] }
        ]
      }
    ]
  }
];

class MockDatabaseService implements IDatabaseService {
  
  // Simulate network delay
  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getItems(): Promise<TreeItem[]> {
    await this.delay(100);
    // Return deep copy to prevent external mutation issues
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
      children: [],
      content: item.content || '',
      metadata: { lastModified: Date.now() }
    };

    if (!parentId) {
      MOCK_DATA_STORE.push(newItem);
    } else {
      const parent = this.findNode(MOCK_DATA_STORE, parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newItem);
      } else {
        throw new Error('Parent not found');
      }
    }
    return newItem;
  }

  async updateItem(id: string, updates: Partial<TreeItem>): Promise<TreeItem> {
    await this.delay(50);
    const node = this.findNode(MOCK_DATA_STORE, id);
    if (!node) throw new Error('Item not found');
    
    // Update metadata timestamp automatically
    const newMetadata = { ...node.metadata, ...updates.metadata, lastModified: Date.now() };
    Object.assign(node, { ...updates, metadata: newMetadata });
    
    return node;
  }

  async deleteItem(id: string): Promise<void> {
    await this.delay(100);
    // Explicitly update the global store reference
    MOCK_DATA_STORE = this.deleteNodeRecursively(MOCK_DATA_STORE, id);
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

        // 1. Filter by Type
        if (filters && filters.types && filters.types.length > 0) {
           if (!filters.types.includes(node.type)) {
              // Skip if type mismatch, BUT continue traversing children (a provider might match type filter, but children might not, or vice versa if we only want prompts)
              // Actually, if we filter by 'prompt', we still need to look inside providers to find them.
              // So we don't 'continue' loop, we just don't add THIS node.
           }
        }

        // 2. Filter by Date
        let dateMatch = true;
        if (filters && filters.date && filters.date !== 'any') {
           const lastMod = node.metadata?.lastModified || 0;
           const now = Date.now();
           const oneDay = 86400000;
           if (filters.date === 'today' && now - lastMod > oneDay) dateMatch = false;
           if (filters.date === 'week' && now - lastMod > oneDay * 7) dateMatch = false;
           if (filters.date === 'month' && now - lastMod > oneDay * 30) dateMatch = false;
        }

        // Check Logic
        // We only consider adding the node if it matches the Type and Date filters (if specific type filter is active)
        const typeMatch = !filters?.types || filters.types.length === 0 || filters.types.includes(node.type);
        
        if (typeMatch && dateMatch) {
            // Check Name
            if (node.name.toLowerCase().includes(lowerQuery)) {
                isMatch = true;
            }

            // Check Content (only for prompts)
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
      if (node.id === id) {
        return false; // Remove this node
      }
      if (node.children && node.children.length > 0) {
        // Recursively update children
        node.children = this.deleteNodeRecursively(node.children, id);
      }
      return true; // Keep this node
    });
  }
}

// Export the selected service based on configuration
export const dbService = USE_MOCK ? new MockDatabaseService() : new ApiDatabaseService();
