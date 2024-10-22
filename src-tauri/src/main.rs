// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use db::Account;
use dotenv::dotenv;
use rgb_node::NodeProcess;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Manager, Window};

mod db;
mod rgb_node;

fn main() {
    dotenv().ok();
    
    let node_process = Arc::new(Mutex::new(NodeProcess::new()));

    tauri::Builder::default()
        .manage(Arc::clone(&node_process))
        .on_window_event({
            let node_process = Arc::clone(&node_process);
            move |event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                    let node_process = node_process.lock().unwrap();
                    node_process.stop();
                }
            }
        })
        .setup({
            |_app| {
                db::init();
                Ok(())
            }
        })
        .invoke_handler(tauri::generate_handler![
            close_splashscreen,
            get_accounts,
            insert_account,
            start_node,
            stop_node
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn close_splashscreen(window: Window) {
    if let Some(splashscreen) = window.get_window("splashscreen") {
        splashscreen.close().unwrap();
    };
    if let Some(main_window) = window.get_window("main") {
        main_window.show().unwrap();
    };
}

#[tauri::command]
fn start_node(
    node_process: tauri::State<Arc<Mutex<NodeProcess>>>,
    network: String,
    datapath: String,
    rpc_connection_url: String,
) -> Result<(), String> {
    let mut executable_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    executable_dir.push("../bin");

    let datapath = executable_dir.join(datapath).to_str().unwrap().to_string();

    let node_process = node_process.lock().unwrap();
    if !node_process.is_running() {
        node_process.start(network, datapath, rpc_connection_url);
        Ok(())
    } else {
        Err("RGB Lightning Node is already running.".to_string())
    }
}

#[tauri::command]
fn stop_node(node_process: tauri::State<Arc<Mutex<NodeProcess>>>) -> Result<(), String> {
    println!("Locking mutex");
    let node_process = node_process.lock().unwrap();
    if node_process.is_running() {
        node_process.stop();
        println!("Node stopped");
        Ok(())
    } else {
        Err("RGB Lightning Node is not running.".to_string())
    }
}

#[tauri::command]
fn get_accounts() -> Result<Vec<Account>, String> {
    match db::get_accounts() {
        Ok(configs) => Ok(configs),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn insert_account(
    name: String,
    network: String,
    datapath: String,
    rpc_connection_url: String,
    node_url: String,
) -> Result<usize, String> {
    match db::insert_account(name, network, datapath, rpc_connection_url, node_url) {
        Ok(num_rows) => Ok(num_rows),
        Err(e) => Err(e.to_string()),
    }
}
