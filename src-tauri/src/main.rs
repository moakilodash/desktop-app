// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use db::Account;
use dotenv::dotenv;
use fs_extra::dir::create_all;
use rgb_node::NodeThread;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::{
    env, fs,
    sync::{Arc, Mutex},
};

use tauri::{Manager, Window};

mod db;
mod rgb_node;

// #[derive(Serialize, Deserialize, Debug)]
// struct Account {
//     name: String,
//     datapath: String,
// }

// #[derive(Serialize, Deserialize, Debug)]
// struct Config {
//     network: String,
//     datapath: String,
//     rpc_connection_url: String,
//     accounts: Vec<Account>,
// }
//
// impl Default for Config {
//     fn default() -> Self {
//         Self {
//             network: "regtest".to_string(),
//             datapath: "../bin/dataldk".to_string(),
//             rpc_connection_url: "user:password@localhost:18443".to_string(),
//             accounts: vec![],
//         }
//     }
// }

// fn load_config(config_path: &Path) -> Config {
//     if config_path.exists() {
//         let config_content = fs::read_to_string(config_path).expect("Failed to read config file");
//         serde_yaml::from_str(&config_content).expect("Failed to parse config file")
//     } else {
//         // Crea la directory se non esiste
//         if let Some(parent) = config_path.parent() {
//             if !parent.exists() {
//                 create_all(parent, true).expect("Failed to create config directory");
//             }
//         }
//         let default_config = Config::default();
//         let config_yaml =
//             serde_yaml::to_string(&default_config).expect("Failed to serialize default config");
//         fs::write(config_path, config_yaml).expect("Failed to write default config file");
//         default_config
//     }
// }

// fn run_rgb_lightning_node(
//     network: &str,
//     datapath: &str,
//     rpc_connection_url: &str,
// ) -> Option<Child> {
//     let mut executable_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
//     executable_path.push("../bin/rgb-lightning-node");
//
//     if executable_path.exists() {
//         Some(
//             Command::new(executable_path)
//                 .args(&[rpc_connection_url, datapath])
//                 .args(&["--daemon-listening-port", "3001"])
//                 .args(&["--ldk-peer-listening-port", "9736"])
//                 .args(&["--network", network])
//                 .spawn()
//                 .expect("Failed to start rgb-lightning-node process"),
//         )
//     } else {
//         println!("rgb-lightning-node executable not found.");
//         None
//     }
// }

// #[tauri::command]
// fn is_wallet_init() -> bool {
//     let data_path = match get_config() {
//         Ok(config) => PathBuf::from(config.datapath),
//         Err(_) => return false,
//     };
//
//     if !data_path.exists() {
//         return false;
//     }
//
//     let wallet_path = data_path.join("mnemonic");
//
//     wallet_path.exists()
// }

// #[tauri::command]
// fn get_config() -> Result<Config, String> {
//     let mut config_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
//     config_path.push("../bin/config.yaml");
//     if config_path.exists() {
//         let config_content = match fs::read_to_string(config_path) {
//             Ok(content) => content,
//             Err(_) => return Err("Failed to read config file".to_string()),
//         };
//         match serde_yaml::from_str(&config_content) {
//             Ok(config) => Ok(config),
//             Err(_) => Err("Failed to parse config file".to_string()),
//         }
//     } else {
//         Err("Config file not found".to_string())
//     }
// }
//
// #[tauri::command]
// fn write_config(config: Config) -> Result<(), String> {
//     let mut config_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
//     config_path.push("../bin/config.yaml");
//
//     let config_yaml = serde_yaml::to_string(&config).expect("Failed to serialize default config");
//     match fs::write(config_path, config_yaml) {
//         Ok(_) => Ok(()),
//         Err(_) => Err("Failed to write config file".to_string()),
//     }
// }

fn main() {
    dotenv().ok();
    // let use_local_bin = env::var("BUILD_AND_RUN_RGB_LIGHTNING_NODE")
    //     .unwrap_or_else(|_| "true".to_string())
    //     == "true";
    //
    // let mut config_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // config_path.push("../bin/config.yaml");
    //
    // let config = load_config(&config_path);
    //
    // let mut data_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // data_path.push(&config.datapath);
    //
    // if !data_path.exists() {
    //     create_all(&data_path, true).expect("Failed to create dataldk directory");
    // }
    //
    // let network = config.network.clone();
    // let datapath = data_path.to_str().unwrap().to_string();
    // let rpc_connection_url = config.rpc_connection_url.clone();
    //
    let node_thread = Arc::new(Mutex::new(NodeThread::new()));
    //
    // if use_local_bin {
    //     let node_thread_clone = Arc::clone(&node_thread);
    //     node_thread_clone
    //         .lock()
    //         .unwrap()
    //         .start(network, datapath, rpc_connection_url);
    // }

    tauri::Builder::default()
        .manage(Arc::clone(&node_thread))
        .on_window_event({
            let node_thread = Arc::clone(&node_thread);
            move |event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                    let mut node_thread = node_thread.lock().unwrap();
                    node_thread.stop();
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
            // write_config,
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
    node_thread: tauri::State<Arc<Mutex<NodeThread>>>,
    network: String,
    datapath: String,
    rpc_connection_url: String,
) -> Result<(), String> {
    let mut executable_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    executable_dir.push("../bin");

    let datapath = executable_dir.join(datapath).to_str().unwrap().to_string();

    let mut node_thread = node_thread.lock().unwrap();
    node_thread.start(network, datapath, rpc_connection_url);
    Ok(())
}

#[tauri::command]
fn stop_node(node_thread: tauri::State<Arc<Mutex<NodeThread>>>) -> Result<(), String> {
    println!("Locking mutex");
    let mut node_thread = node_thread.lock().unwrap();
    node_thread.stop();
    println!("Node stopped");
    Ok(())
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
