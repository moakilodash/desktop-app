use std::process::{Command, Child, Stdio};
use std::path::PathBuf;
use std::sync::mpsc::{Sender, Receiver, channel};
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use std::time::Duration;
use std::thread;
use std::io::{BufReader, BufRead};
use tauri::Window;

#[derive(Debug)]
pub struct NodeConfig {
    pub executable_path: PathBuf,
    pub network: String,
    pub datapath: String,
    pub daemon_listening_port: String,
    pub ldk_peer_listening_port: String,
}

#[derive(Debug)]
pub enum ControlMessage {
    Stop,
    Shutdown,
}

pub struct NodeProcess {
    child_process: Arc<Mutex<Option<Child>>>,
    control_sender: Sender<ControlMessage>,
    control_receiver: Arc<Mutex<Receiver<ControlMessage>>>,
    is_running: Arc<AtomicBool>,
    logs: Arc<Mutex<Vec<String>>>,
    window: Arc<Mutex<Option<Window>>>,
    shutdown_timeout: Duration,
}

fn run_rgb_lightning_node_with_config(config: &NodeConfig) -> Option<Child> {
    let mut command = Command::new(&config.executable_path);
    command
        .arg("--network")
        .arg(&config.network);

    if !config.datapath.is_empty() {
        command.arg("--datadir").arg(&config.datapath);
    }

    command
        .arg("--daemon-listening-port")
        .arg(&config.daemon_listening_port)
        .arg("--ldk-peer-listening-port")
        .arg(&config.ldk_peer_listening_port)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    println!("Starting node with command: {:?}", command);

    match command.spawn() {
        Ok(child) => Some(child),
        Err(e) => {
            println!("Failed to start rgb-lightning-node: {:?}", e);
            None
        }
    }
}

impl NodeProcess {
    pub fn new() -> Self {
        let (tx, rx) = channel();
        NodeProcess {
            child_process: Arc::new(Mutex::new(None)),
            control_sender: tx,
            control_receiver: Arc::new(Mutex::new(rx)),
            is_running: Arc::new(AtomicBool::new(false)),
            logs: Arc::new(Mutex::new(Vec::new())),
            window: Arc::new(Mutex::new(None)),
            shutdown_timeout: Duration::from_secs(5),
        }
    }

    pub fn set_window(&self, window: Window) {
        *self.window.lock().unwrap() = Some(window);
    }

    pub fn start(&self, config: NodeConfig) {
        if self.is_running.load(Ordering::SeqCst) {
            println!("RGB Lightning Node is already running. Stopping before restart...");
            self.stop();
            std::thread::sleep(Duration::from_secs(2));
        }

        let rx = Arc::clone(&self.control_receiver);
        let child_process = Arc::clone(&self.child_process);
        let is_running = Arc::clone(&self.is_running);
        let logs = Arc::clone(&self.logs);
        let window = Arc::clone(&self.window);
        let shutdown_timeout = self.shutdown_timeout;
        let config = config.clone();

        std::thread::spawn(move || {
            let process = run_rgb_lightning_node_with_config(&config);
            
            if let Some(child) = process {
                *child_process.lock().unwrap() = Some(child);
                is_running.store(true, Ordering::SeqCst);
                
                if let Some(window) = &*window.lock().unwrap() {
                    let _ = window.emit("node-started", ());
                }

                // Setup stdout logging
                if let Some(stdout) = child_process.lock().unwrap().as_mut().unwrap().stdout.take() {
                    let logs_clone = Arc::clone(&logs);
                    let window_clone = Arc::clone(&window);
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stdout);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                println!("Node stdout: {}", line);
                                logs_clone.lock().unwrap().push(line.clone());
                                if let Some(window) = &*window_clone.lock().unwrap() {
                                    let _ = window.emit("node-log", line);
                                }
                            }
                        }
                    });
                }

                // Setup stderr logging
                if let Some(stderr) = child_process.lock().unwrap().as_mut().unwrap().stderr.take() {
                    let logs_clone = Arc::clone(&logs);
                    let window_clone = Arc::clone(&window);
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                println!("Node stderr: {}", line);
                                logs_clone.lock().unwrap().push(format!("Error: {}", line));
                                if let Some(window) = &*window_clone.lock().unwrap() {
                                    let _ = window.emit("node-error", line);
                                }
                            }
                        }
                    });
                }

                let mut should_restart = false;

                loop {
                    match rx.lock().unwrap().try_recv() {
                        Ok(ControlMessage::Stop) => {
                            println!("Stopping the process...");
                            should_restart = true;
                            break;
                        }
                        Ok(ControlMessage::Shutdown) => {
                            println!("Shutting down the process...");
                            break;
                        }
                        Err(_) => {
                            match child_process.lock().unwrap().as_mut().unwrap().try_wait() {
                                Ok(Some(status)) => {
                                    println!("Process finished with status: {:?}", status);
                                    break;
                                }
                                Ok(None) => {
                                    thread::sleep(Duration::from_secs(1));
                                }
                                Err(e) => {
                                    println!("Error waiting for child process: {:?}", e);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Graceful shutdown
                if let Some(mut child) = child_process.lock().unwrap().take() {
                    println!("Attempting graceful shutdown...");
                    
                    let _ = child.kill();
                    
                    let start = std::time::Instant::now();
                    while start.elapsed() < shutdown_timeout {
                        match child.try_wait() {
                            Ok(Some(_)) => {
                                println!("Process exited gracefully");
                                break;
                            }
                            Ok(None) => thread::sleep(Duration::from_millis(100)),
                            Err(e) => {
                                println!("Error waiting for process: {:?}", e);
                                break;
                            }
                        }
                    }

                    if child.try_wait().map(|s| s.is_none()).unwrap_or(false) {
                        println!("Force killing process");
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }

                is_running.store(false, Ordering::SeqCst);
                
                if let Some(window) = &*window.lock().unwrap() {
                    let _ = window.emit("node-stopped", ());
                }

                if should_restart {
                    thread::sleep(Duration::from_secs(1));
                    let new_process = run_rgb_lightning_node_with_config(&config);
                    if let Some(child) = new_process {
                        *child_process.lock().unwrap() = Some(child);
                        is_running.store(true, Ordering::SeqCst);
                    }
                }
            } else {
                println!("Failed to start the rgb-lightning-node daemon.");
                if let Some(window) = &*window.lock().unwrap() {
                    let _ = window.emit("node-error", "Failed to start RGB Lightning Node");
                }
            }
        });
    }

    pub fn stop(&self) {
        if self.is_running.load(Ordering::SeqCst) {
            let _ = self.control_sender.send(ControlMessage::Stop);
        }
    }

    pub fn shutdown(&self) {
        if self.is_running.load(Ordering::SeqCst) {
            let _ = self.control_sender.send(ControlMessage::Shutdown);
        }
    }

    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    pub fn get_logs(&self) -> Vec<String> {
        self.logs.lock().unwrap().clone()
    }

    pub fn force_kill(&self) {
        println!("Force killing node process...");
        if let Some(mut child) = self.child_process.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.is_running.store(false, Ordering::SeqCst);
    }
}

impl Clone for NodeConfig {
    fn clone(&self) -> Self {
        NodeConfig {
            executable_path: self.executable_path.clone(),
            network: self.network.clone(),
            datapath: self.datapath.clone(),
            daemon_listening_port: self.daemon_listening_port.clone(),
            ldk_peer_listening_port: self.ldk_peer_listening_port.clone(),
        }
    }
}