#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod models;
mod store;

use models::{SearchFilters, SearchResult, TreeItem};
use store::Store;
use tauri::{Manager, State};

// --- Commands ---

#[tauri::command]
fn get_items(store: State<Store>) -> Vec<TreeItem> {
    store.get_all()
}

#[tauri::command]
fn get_item(id: String, store: State<Store>) -> Option<TreeItem> {
    store.get_item(&id)
}

#[tauri::command]
fn add_item(parent_id: Option<String>, item: TreeItem, store: State<Store>) -> Result<TreeItem, String> {
    store.add_item(parent_id, item)
}

#[tauri::command]
fn update_item(id: String, updates: TreeItem, store: State<Store>) -> Result<TreeItem, String> {
    store.update_item(id, updates)
}

#[tauri::command]
fn delete_item(id: String, store: State<Store>) -> Result<(), String> {
    store.delete_item(id)
}

#[tauri::command]
fn search_items(query: String, filters: Option<SearchFilters>, store: State<Store>) -> Vec<SearchResult> {
    store.search(query, filters)
}

#[tauri::command]
fn move_item(item_id: String, new_parent_id: Option<String>, store: State<Store>) -> Result<TreeItem, String> {
    store.move_item(item_id, new_parent_id)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
             let store = Store::new(app.handle());
             app.manage(store);
             Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_items,
            get_item,
            add_item,
            update_item,
            delete_item,
            search_items,
            move_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
