use crate::models::{ItemType, SearchFilters, SearchMatch, SearchResult, TreeItem};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::api::path::app_data_dir;
use tauri::Config;

pub struct Store {
    pub data: Mutex<Vec<TreeItem>>,
    path: PathBuf,
}

impl Store {
    pub fn new(config: &Config) -> Self {
        let app_data_path = app_data_dir(config).expect("Failed to resolve app data dir");
        let store_dir = app_data_path.join("com.prompt-manager.app");

        // Ensure directory exists
        if !store_dir.exists() {
            fs::create_dir_all(&store_dir).expect("Failed to create app data directory");
        }

        let path = store_dir.join("store.json");

        // Load initial data
        let data = if path.exists() {
            let content = fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string());
            serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
        } else {
            // Seed data if empty (could be moved to a separate init function)
            Vec::new()
        };

        Store {
            data: Mutex::new(data),
            path,
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
        fs::write(&self.path, content).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_all(&self) -> Vec<TreeItem> {
        self.data.lock().unwrap().clone()
    }

    pub fn get_item(&self, id: &str) -> Option<TreeItem> {
        let data = self.data.lock().unwrap();
        Self::find_node_recursive(&data, id).cloned()
    }

    fn find_node_recursive<'a>(nodes: &'a [TreeItem], id: &str) -> Option<&'a TreeItem> {
        for node in nodes {
            if node.id == id {
                return Some(node);
            }
            if let Some(found) = Self::find_node_recursive(&node.children, id) {
                return Some(found);
            }
        }
        None
    }

    pub fn add_item(&self, parent_id: Option<String>, mut item: TreeItem) -> Result<TreeItem, String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;

        // Generate ID and Timestamp
        item.id = uuid::Uuid::new_v4().to_string();
        item.metadata.last_modified = Some(chrono::Utc::now().timestamp_millis());

        if let Some(p_id) = parent_id {
            if let Some(parent) = Self::find_node_mut_recursive(&mut data, &p_id) {
                parent.children.push(item.clone());
            } else {
                return Err("Parent not found".to_string());
            }
        } else {
            data.push(item.clone());
        }

        // Release lock to save
        drop(data);
        self.save()?;

        Ok(item)
    }

    fn find_node_mut_recursive<'a>(nodes: &'a mut [TreeItem], id: &str) -> Option<&'a mut TreeItem> {
        for node in nodes {
            if node.id == id {
                return Some(node);
            }
            if let Some(found) = Self::find_node_mut_recursive(&mut node.children, id) {
                return Some(found);
            }
        }
        None
    }

    pub fn update_item(&self, id: String, updates: TreeItem) -> Result<TreeItem, String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;

        if let Some(node) = Self::find_node_mut_recursive(&mut data, &id) {
            // Apply updates (simplistic merge)
            node.name = updates.name;
            node.content = updates.content;
            node.versions = updates.versions;

            // Merge metadata
            node.metadata.description = updates.metadata.description.or(node.metadata.description.clone());
            node.metadata.tags = updates.metadata.tags.or(node.metadata.tags.clone());
            node.metadata.last_modified = Some(chrono::Utc::now().timestamp_millis());

            let updated_node = node.clone();
             // Release lock to save
            drop(data);
            self.save()?;

            return Ok(updated_node);
        }
        Err("Item not found".to_string())
    }

    pub fn delete_item(&self, id: String) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;
        Self::delete_node_recursive(&mut data, &id);
        drop(data);
        self.save()?;
        Ok(())
    }

    fn delete_node_recursive(nodes: &mut Vec<TreeItem>, id: &str) {
        // Remove item from current level
        if let Some(pos) = nodes.iter().position(|x| x.id == id) {
            nodes.remove(pos);
            return;
        }
        // Or recurse into children
        for node in nodes.iter_mut() {
            Self::delete_node_recursive(&mut node.children, id);
        }
    }

    pub fn search(&self, query: String, filters: Option<SearchFilters>) -> Vec<SearchResult> {
        let data = self.data.lock().unwrap();
        let mut results = Vec::new();
        if query.trim().is_empty() {
            return results;
        }

        let lower_query = query.to_lowercase();

        Self::search_recursive(&data, &lower_query, &filters, &mut results);

        results
    }

    fn search_recursive(nodes: &[TreeItem], query: &str, filters: &Option<SearchFilters>, results: &mut Vec<SearchResult>) {
        for node in nodes {
            let mut is_match = false;
            let mut matches = Vec::new();

            // 1. Type Filter
            let type_match = if let Some(f) = filters {
                if let Some(types) = &f.types {
                    types.is_empty() || types.contains(&node.item_type)
                } else {
                    true
                }
            } else {
                true
            };

            // 2. Date Filter (Simplified)
            let date_match = true; // Implement date logic if needed matching JS version

            if type_match && date_match {
                // Name match
                if node.name.to_lowercase().contains(query) {
                    is_match = true;
                }

                // Content match (for Prompts)
                if node.item_type == ItemType::Prompt {
                    if let Some(content) = &node.content {
                        for (i, line) in content.lines().enumerate() {
                            let lower_line = line.to_lowercase();
                            let mut start_idx = 0;
                            while let Some(idx) = lower_line[start_idx..].find(query) {
                                let absolute_idx = start_idx + idx;
                                matches.push(SearchMatch {
                                    line_content: line.to_string(),
                                    line_number: i + 1,
                                    start_column: absolute_idx + 1,
                                    end_column: absolute_idx + 1 + query.len(),
                                });
                                start_idx = absolute_idx + 1;
                            }
                        }
                        if !matches.is_empty() {
                            is_match = true;
                        }
                    }
                }

                if is_match {
                    results.push(SearchResult {
                        item_id: node.id.clone(),
                        item_name: node.name.clone(),
                        item_type: node.item_type.clone(),
                        matches,
                        last_modified: node.metadata.last_modified,
                    });
                }
            }

            Self::search_recursive(&node.children, query, filters, results);
        }
    }
}
