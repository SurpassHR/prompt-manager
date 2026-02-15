use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ItemType {
    Provider,
    Model,
    Version,
    Prompt,
    Settings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PromptVersion {
    pub id: String,
    pub timestamp: i64,
    pub content: String,
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ItemMetadata {
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub last_modified: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TreeItem {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub item_type: ItemType,
    #[serde(default)]
    pub children: Vec<TreeItem>,
    pub parent_id: Option<String>,
    pub content: Option<String>,
    pub versions: Option<Vec<PromptVersion>>,
    #[serde(default)]
    pub metadata: ItemMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub line_content: String,
    pub line_number: usize,
    pub start_column: usize,
    pub end_column: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub item_id: String,
    pub item_name: String,
    pub item_type: ItemType,
    pub matches: Vec<SearchMatch>,
    pub last_modified: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilters {
    pub types: Option<Vec<ItemType>>,
    pub date: Option<String>, // 'any', 'today', 'week', 'month'
}
