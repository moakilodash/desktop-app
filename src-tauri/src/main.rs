// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{env, fs, sync::{Arc, Mutex}};
use std::path::{Path, PathBuf};
use fs_extra::dir::create_all;
use std::process::{Child, Command};
use tauri::Manager;

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
        let default_config = Config::default();
        let config_yaml = serde_yaml::to_string(&default_config).expect("Failed to serialize default config");
        fs::write(config_path, config_yaml).expect("Failed to write default config file");
        default_config
    }
}

fn run_rgb_lightning_node(network: &str, datapath: &str, rpc_connection_url: &str) -> Child {
    let mut executable_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    executable_path.push("../bin/rgb-lightning-node");

    Command::new(executable_path)
        .args(&[rpc_connection_url, datapath])
        .args(&["--daemon-listening-port", "3001"])
        .args(&["--ldk-peer-listening-port", "9736"])
        .args(&["--network", network])
        .spawn()
        .expect("Failed to start rgb-lightning-node process")
}

fn main() {
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

    println!("Network: {}", network);
    println!("Data Path: {}", datapath);
    println!("Electrum Connection URL: {}", rpc_connection_url);

    // Use Arc and Mutex to share the child process reference safely
    let child_process = Arc::new(Mutex::new(Some(run_rgb_lightning_node(
        &network,
        &datapath,
        &rpc_connection_url,
    ))));

    let child_process_clone = Arc::clone(&child_process);

    tauri::Builder::default()
        .on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                if let Some(mut child) = child_process_clone.lock().unwrap().take() {
                    child.kill().expect("Failed to kill child process");
                }
            }
        })
        .setup(move |app| {
            let handle = app.handle();
            let child_process_clone = Arc::clone(&child_process);
            app.listen_global("tauri://exit", move |_| {
                if let Some(mut child) = child_process_clone.lock().unwrap().take() {
                    child.kill().expect("Failed to kill child process");
                }
                handle.exit(0);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}