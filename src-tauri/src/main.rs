#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use db::Account;
use dotenv::dotenv;
use rgb_node::NodeProcess;
use std::sync::{Arc, Mutex, RwLock};
use tauri::{Manager, Window};
use std::env;

mod db;
mod rgb_node;

#[derive(Default)]
struct CurrentAccount(RwLock<Option<Account>>);

fn main() {
    dotenv().ok();
    
    let node_process = Arc::new(Mutex::new(NodeProcess::new()));

    tauri::Builder::default()
        .manage(Arc::clone(&node_process))
        .manage(CurrentAccount::default())
        .on_window_event({
            let node_process = Arc::clone(&node_process);
            move |event| {
                match event.event() {
                    tauri::WindowEvent::CloseRequested { .. } => {
                        println!("Window close requested, shutting down node...");
                        let node_process = node_process.lock().unwrap();
                        // Graceful shutdown
                        node_process.shutdown();
                        
                        // Wait a bit to ensure the process has time to shut down
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        
                        // Force kill if still running
                        if node_process.is_running() {
                            println!("Node still running after shutdown, forcing kill...");
                            node_process.force_kill();
                        }
                    }
                    _ => {}
                }
            }
        })
        .setup({
            let node_process = Arc::clone(&node_process);
            move |app| {
                if let Some(main_window) = app.get_window("main") {
                    node_process.lock().unwrap().set_window(main_window);
                }
                db::init();
                Ok(())
            }
        })
        .invoke_handler(tauri::generate_handler![
            close_splashscreen,
            // DB commands
            get_accounts,
            insert_account,
            update_account,
            delete_account,
            // Node commands
            start_node,
            stop_node,
            is_node_running,
            check_account_exists,
            set_current_account,
            get_current_account,
            get_account_by_name,
            get_node_logs,
            save_logs_to_file,
            get_running_node_account
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn close_splashscreen(window: Window) {
    // Show main window first
    if let Some(main_window) = window.get_window("main") {
        main_window.show().unwrap();
        // Give the main window a moment to render
        std::thread::sleep(std::time::Duration::from_millis(1000));
        // Then close splashscreen
        if let Some(splashscreen) = window.get_window("splashscreen") {
            splashscreen.close().unwrap();
        }
    }
}

#[tauri::command]
fn start_node(
    node_process: tauri::State<Arc<Mutex<NodeProcess>>>,
    network: String,
    datapath: Option<String>,
    daemon_listening_port: String,
    ldk_peer_listening_port: String,
    account_name: String,
) -> Result<(), String> {
    println!("Received start_node command for account: {}", account_name);
    println!("Parameters:");
    println!("  Network: {}", network);
    println!("  Datapath: {:?}", datapath);
    println!("  Daemon port: {}", daemon_listening_port);
    println!("  LDK peer port: {}", ldk_peer_listening_port);

    // Lock the shared NodeProcess
    let node_process = match node_process.lock() {
        Ok(process) => process,
        Err(e) => {
            let err = format!("Failed to acquire lock on node process: {}", e);
            println!("{}", err);
            return Err(err);
        }
    };

    // Attempt to start; bubble up any errors
    match node_process.start(network, datapath, daemon_listening_port, ldk_peer_listening_port, account_name) {
        Ok(_) => {
            println!("Node started successfully");
            Ok(())
        }
        Err(e) => {
            println!("Failed to start node: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
fn stop_node(node_process: tauri::State<Arc<Mutex<NodeProcess>>>) -> Result<(), String> {
    let node_process = node_process.lock().unwrap();
    if node_process.is_running() {
        node_process.stop();
        Ok(())
    } else {
        // Return an error or just Ok(()) – depends on your UI needs
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
    datapath: Option<String>,
    rpc_connection_url: String,
    node_url: String,
    indexer_url: String,
    proxy_endpoint: String,
    default_lsp_url: String,
    maker_urls: String,
    default_maker_url: String,
    daemon_listening_port: String,
    ldk_peer_listening_port: String,
) -> Result<usize, String> {
    match db::insert_account(
        name,
        network,
        datapath,
        rpc_connection_url,
        node_url,
        indexer_url,
        proxy_endpoint,
        default_lsp_url,
        maker_urls,
        default_maker_url,
        daemon_listening_port,
        ldk_peer_listening_port,
    ) {
        Ok(num_rows) => Ok(num_rows),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn update_account(
    name: String,
    network: String,
    datapath: Option<String>,
    rpc_connection_url: String,
    node_url: String,
    indexer_url: String,
    proxy_endpoint: String,
    default_lsp_url: String,
    maker_urls: String,
    default_maker_url: String,
    daemon_listening_port: String,
    ldk_peer_listening_port: String,
) -> Result<usize, String> {
    match db::update_account(
        name,
        network,
        datapath,
        rpc_connection_url,
        node_url,
        indexer_url,
        proxy_endpoint,
        default_lsp_url,
        maker_urls,
        default_maker_url,
        daemon_listening_port,
        ldk_peer_listening_port,
    ) {
        Ok(num_rows) => Ok(num_rows),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn delete_account(
    node_process: tauri::State<Arc<Mutex<NodeProcess>>>,
    name: String
) -> Result<usize, String> {
    println!("Attempting to delete account: {}", name);
    
    // Stop the node if it's running
    let node_process = node_process.lock().unwrap();
    if node_process.is_running() {
        println!("Stopping node for account: {}", name);
        node_process.stop();
    }
    
    match db::delete_account(name.clone()) {
        Ok(num_rows) => {
            println!("Successfully deleted account: {}", name);
            Ok(num_rows)
        },
        Err(e) => {
            println!("Failed to delete account {}: {}", name, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
fn check_account_exists(name: String) -> Result<bool, String> {
    match db::check_account_exists(&name) {
        Ok(exists) => Ok(exists),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_current_account(
    state: tauri::State<CurrentAccount>,
    account_name: String,
) -> Result<Account, String> {
    let accounts = db::get_accounts().map_err(|e| e.to_string())?;
    let account = accounts
        .into_iter()
        .find(|a| a.name == account_name)
        .ok_or_else(|| "Account not found".to_string())?;
    
    *state.0.write().unwrap() = Some(account.clone());
    Ok(account)
}

#[tauri::command]
fn get_current_account(state: tauri::State<CurrentAccount>) -> Option<Account> {
    state.0.read().unwrap().clone()
}

#[tauri::command]
fn get_account_by_name(name: String) -> Result<Option<Account>, String> {
    match db::get_account_by_name(&name) {
        Ok(account) => Ok(account),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn get_node_logs(node_process: tauri::State<Arc<Mutex<NodeProcess>>>) -> Vec<String> {
    node_process.lock().unwrap().get_logs()
}

#[tauri::command]
async fn save_logs_to_file(file_path: String, content: String) -> Result<(), String> {
    std::fs::write(file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn is_node_running(
    node_process: tauri::State<Arc<Mutex<NodeProcess>>>,
    account_name: Option<String>,
) -> bool {
    let node_process = node_process.lock().unwrap();
    if let Some(account_name) = account_name {
        node_process.is_running_for_account(&account_name)
    } else {
        node_process.is_running()
    }
}

#[tauri::command]
fn get_running_node_account(node_process: tauri::State<Arc<Mutex<NodeProcess>>>) -> Option<String> {
    node_process.lock().unwrap().get_current_account()
}
