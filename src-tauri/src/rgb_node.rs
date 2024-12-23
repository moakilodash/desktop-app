use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::mpsc::{channel, Sender, Receiver};
use std::time::Duration;
use std::thread;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use std::io::{BufReader, BufRead};
use tauri::Window;

pub struct NodeProcess {
    child_process: Arc<Mutex<Option<Child>>>,
    control_sender: Sender<ControlMessage>,
    control_receiver: Arc<Mutex<Receiver<ControlMessage>>>,
    is_running: Arc<AtomicBool>,
    logs: Arc<Mutex<Vec<String>>>,
    window: Arc<Mutex<Option<Window>>>,
    shutdown_timeout: Duration,
}

#[derive(Debug)]
enum ControlMessage {
    Stop,
    Shutdown,
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
            shutdown_timeout: Duration::from_secs(5), // Configurable shutdown timeout
        }
    }

    pub fn set_window(&self, window: Window) {
        *self.window.lock().unwrap() = Some(window);
    }

    pub fn start(&self, network: String, datapath: String, daemon_listening_port: String, ldk_peer_listening_port: String) {
        if self.is_running.load(Ordering::SeqCst) {
            println!("RGB Lightning Node is already running. Stopping before restart...");
            self.stop();
            // Give it a moment to stop
            std::thread::sleep(Duration::from_secs(2));
        }

        let rx = Arc::clone(&self.control_receiver);
        let child_process = Arc::clone(&self.child_process);
        let is_running = Arc::clone(&self.is_running);
        let logs = Arc::clone(&self.logs);
        let window = Arc::clone(&self.window);
        let shutdown_timeout = self.shutdown_timeout;

        std::thread::spawn(move || {
            let process = run_rgb_lightning_node(&network, &datapath, &daemon_listening_port, &ldk_peer_listening_port);
            
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
                            // Check if process is still alive
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
                    
                    // Send SIGTERM
                    let _ = child.kill();
                    
                    // Wait for process to exit
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

                    // Force kill if still running
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

                // Restart if needed
                if should_restart {
                    thread::sleep(Duration::from_secs(1));
                    let new_process = run_rgb_lightning_node(&network, &datapath, &daemon_listening_port, &ldk_peer_listening_port);
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
            if let Err(e) = self.control_sender.send(ControlMessage::Stop) {
                println!("Failed to send stop signal: {:?}", e);
            }
        } else {
            println!("RGB Lightning Node is not running.");
        }
    }

    pub fn force_kill(&self) {
        println!("Force killing node process...");
        if let Some(mut child) = self.child_process.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.is_running.store(false, Ordering::SeqCst);
    }

    pub fn shutdown(&self) {
        if self.is_running.load(Ordering::SeqCst) {
            println!("Initiating node shutdown...");
            
            // Send shutdown signal
            if let Err(e) = self.control_sender.send(ControlMessage::Shutdown) {
                println!("Failed to send shutdown signal: {:?}", e);
                // If we failed to send the signal, force kill
                self.force_kill();
                return;
            }
            
            // Wait for the process to actually stop
            let start = std::time::Instant::now();
            while self.is_running.load(Ordering::SeqCst) {
                if start.elapsed() > self.shutdown_timeout {
                    println!("Shutdown timeout reached, forcing kill...");
                    self.force_kill();
                    break;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }

    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    pub fn get_logs(&self) -> Vec<String> {
        self.logs.lock().unwrap().clone()
    }
}

fn run_rgb_lightning_node(
    network: &str,
    datapath: &str,
    daemon_listening_port: &str,
    ldk_peer_listening_port: &str,
) -> Option<Child> {
    let mut executable_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    executable_path.push("../bin/rgb-lightning-node");

    if executable_path.exists() {
        println!("Starting RGB Lightning Node with:");
        println!("Network: {}", network);
        println!("Data path: {}", datapath);
        println!("Daemon port: {}", daemon_listening_port);
        println!("LDK peer port: {}", ldk_peer_listening_port);

        Some(
            Command::new(&executable_path)
                .args(&[datapath])
                .args(&["--daemon-listening-port", daemon_listening_port])
                .args(&["--ldk-peer-listening-port", ldk_peer_listening_port])
                .args(&["--network", network])
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .map_err(|e| {
                    println!("Failed to start RGB Lightning Node: {:?}", e);
                    e
                })
                .expect("Failed to start rgb-lightning-node process"),
        )
    } else {
        println!("rgb-lightning-node executable not found at {:?}", executable_path);
        None
    }
}

impl Drop for NodeProcess {
    fn drop(&mut self) {
        self.shutdown();
    }
}