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
}

enum ControlMessage {
    Stop,
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
        }
    }

    pub fn set_window(&self, window: Window) {
        *self.window.lock().unwrap() = Some(window);
    }

    pub fn start(&self, network: String, datapath: String, daemon_listening_port: String, ldk_peer_listening_port: String) {
        if self.is_running.load(Ordering::SeqCst) {
            println!("RGB Lightning Node is already running.");
            return;
        }

        let rx = Arc::clone(&self.control_receiver);
        let child_process = Arc::clone(&self.child_process);
        let is_running = Arc::clone(&self.is_running);
        let logs = Arc::clone(&self.logs);
        let window = Arc::clone(&self.window);

        std::thread::spawn(move || {
            let process = run_rgb_lightning_node(&network, &datapath, &daemon_listening_port, &ldk_peer_listening_port);
            
            if let Some(child) = process {
                *child_process.lock().unwrap() = Some(child);
                is_running.store(true, Ordering::SeqCst);
                
                if let Some(window) = &*window.lock().unwrap() {
                    let _ = window.emit("node-started", ());
                }

                if let Some(stdout) = child_process.lock().unwrap().as_mut().unwrap().stdout.take() {
                    let logs_clone = Arc::clone(&logs);
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stdout);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                logs_clone.lock().unwrap().push(line);
                            }
                        }
                    });
                }

                if let Some(stderr) = child_process.lock().unwrap().as_mut().unwrap().stderr.take() {
                    let logs_clone = Arc::clone(&logs);
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                logs_clone.lock().unwrap().push(line);
                            }
                        }
                    });
                }

                loop {
                    if let Ok(ControlMessage::Stop) = rx.lock().unwrap().try_recv() {
                        println!("Stopping the process...");
                        break;
                    }

                    match child_process.lock().unwrap().as_mut().unwrap().try_wait() {
                        Ok(Some(status)) => {
                            println!("Process finished with status: {:?}", status);
                            break;
                        }
                        Ok(None) => {
                            thread::sleep(Duration::from_secs(5));
                        }
                        Err(e) => {
                            println!("Error waiting for child process: {:?}", e);
                            break;
                        }
                    }
                }

                if let Some(mut child) = child_process.lock().unwrap().take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
                is_running.store(false, Ordering::SeqCst);
            } else {
                println!("Failed to start the rgb-lightning-node daemon.");
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
        Some(
            Command::new(executable_path)
                .args(&[datapath])
                .args(&["--daemon-listening-port", daemon_listening_port])
                .args(&["--ldk-peer-listening-port", ldk_peer_listening_port])
                .args(&["--network", network])
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .expect("Failed to start rgb-lightning-node process"),
        )
    } else {
        println!("rgb-lightning-node executable not found.");
        None
    }
}
