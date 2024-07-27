// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dotenv::dotenv;
use fs_extra::dir::create_all;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::{
    env, fs,
    sync::{Arc, Mutex},
};
use tauri::{Manager, Window};

#[derive(Serialize, Deserialize, Debug)]
struct Config {
    network: String,
    datapath: String,
    rpc_connection_url: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            network: "regtest".to_string(),
            datapath: "../bin/dataldk".to_string(),
            rpc_connection_url: "user:password@localhost:18443".to_string(),
        }
    }
}

fn load_config(config_path: &Path) -> Config {
    if config_path.exists() {
        let config_content = fs::read_to_string(config_path).expect("Failed to read config file");
        serde_yaml::from_str(&config_content).expect("Failed to parse config file")
    } else {
        // Crea la directory se non esiste
        if let Some(parent) = config_path.parent() {
            if !parent.exists() {
                create_all(parent, true).expect("Failed to create config directory");
            }
        }
        let default_config = Config::default();
        let config_yaml =
            serde_yaml::to_string(&default_config).expect("Failed to serialize default config");
        fs::write(config_path, config_yaml).expect("Failed to write default config file");
        default_config
    }
}

fn run_rgb_lightning_node(
    network: &str,
    datapath: &str,
    rpc_connection_url: &str,
) -> Option<Child> {
    let mut executable_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    executable_path.push("../bin/rgb-lightning-node");

    if executable_path.exists() {
        Some(
            Command::new(executable_path)
                .args(&[rpc_connection_url, datapath])
                .args(&["--daemon-listening-port", "3001"])
                .args(&["--ldk-peer-listening-port", "9736"])
                .args(&["--network", network])
                .spawn()
                .expect("Failed to start rgb-lightning-node process"),
        )
    } else {
        println!("rgb-lightning-node executable not found.");
        None
    }
}

#[tauri::command]
async fn close_splashscreen(window: Window) {
    window
        .get_window("splashscreen")
        .expect("no window labeled 'splashscreen' found")
        .close()
        .unwrap();
    window
        .get_window("main")
        .expect("no window labeled 'main' found")
        .show()
        .unwrap();
}

#[tauri::command]
fn get_config() -> Result<Config, String> {
    let mut config_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    config_path.push("../bin/config.yaml");
    if config_path.exists() {
        let config_content = match fs::read_to_string(config_path) {
            Ok(content) => content,
            Err(_) => return Err("Failed to read config file".to_string()),
        };
        match serde_yaml::from_str(&config_content) {
            Ok(config) => Ok(config),
            Err(_) => Err("Failed to parse config file".to_string()),
        }
    } else {
        Err("Config file not found".to_string())
    }
}

fn main() {
    dotenv().ok();
    let use_local_bin = env::var("BUILD_AND_RUN_RGB_LIGHTNING_NODE")
        .unwrap_or_else(|_| "true".to_string())
        == "true";

    let mut config_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    config_path.push("../bin/config.yaml");

    let config = load_config(&config_path);

    let mut data_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    data_path.push(&config.datapath);

    if !data_path.exists() {
        create_all(&data_path, true).expect("Failed to create dataldk directory");
    }

    let network = config.network;
    let datapath = data_path.to_str().unwrap().to_string();
    let rpc_connection_url = config.rpc_connection_url;

    let child_process = if use_local_bin {
        println!("Network: {}", network);
        println!("Data Path: {}", datapath);
        println!("RPC Connection URL: {}", rpc_connection_url);

        Arc::new(Mutex::new(run_rgb_lightning_node(
            &network,
            &datapath,
            &rpc_connection_url,
        )))
    } else {
        Arc::new(Mutex::new(None))
    };

    let child_process_clone = Arc::clone(&child_process);

    tauri::Builder::default()
        .on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                let mut child_lock = child_process_clone.lock().unwrap();
                if let Some(ref mut child) = *child_lock {
                    child.kill().expect("Failed to kill child process");
                }
            }
        })
        .setup(move |app| {
            let handle = app.handle();
            let child_process_clone = Arc::clone(&child_process);
            app.listen_global("tauri://exit", move |_| {
                let mut child_lock = child_process_clone.lock().unwrap();
                if let Some(ref mut child) = *child_lock {
                    child.kill().expect("Failed to kill child process");
                }
                handle.exit(0);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![close_splashscreen, get_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
