// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::{env, thread};

fn run_docker_command(network: &str, datapath: &str, rpc_connection_url: &str) -> std::process::Child {
    Command::new("sudo")
        .arg("docker")
        .arg("run")
        .arg("--name=kaleidoswap_node") 
        .arg("--network=regnet")
        .arg("--publish=3001:3001") 
        .arg("--publish=9736:9736") 
        .arg("rgb-lightning-node:latest")
        .args(&[rpc_connection_url, datapath])
        .args(&["--daemon-listening-port", "3001"])
        .args(&["--ldk-peer-listening-port", "9736"])
        .args(&["--network", network])
        .spawn()
        .expect("Failed to start Docker process")
        
}

fn init_process(network: String, datapath: String, rpc_connection_url: String) {
    thread::spawn(move || {
        let child = run_docker_command(&network, &datapath, &rpc_connection_url);
        println!("Docker process started with pid: {}", child.id());
    });
}

fn main() {
    let network = env::var("NETWORK").unwrap_or_else(|_| "regtest".to_string());
    let datapath = env::var("DATAPATH").unwrap_or_else(|_| "/tmp/kaleidoswap/dataldk1/".to_string());
    let rpc_connection_url = env::var("RPC_CONNECTION_URL").unwrap_or_else(|_| "user:password@host.docker.internal:18443".to_string());

    // init_process(network, datapath, rpc_connection_url);

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
