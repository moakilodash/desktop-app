use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{channel, Sender, Receiver};
use std::time::Duration;
use std::thread;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use std::io::{BufReader, BufRead};
use tauri::Window;
use std::env;
use std::net::TcpListener;

const SHUTDOWN_TIMEOUT_SECS: u64 = 5;

#[derive(Debug)]
enum ControlMessage {
    Stop,
}

pub struct NodeProcess {
    child_process: Arc<Mutex<Option<Child>>>,
    control_sender: Sender<ControlMessage>,
    control_receiver: Arc<Mutex<Receiver<ControlMessage>>>,
    is_running: Arc<AtomicBool>,
    logs: Arc<Mutex<Vec<String>>>,
    window: Arc<Mutex<Option<Window>>>,
    shutdown_timeout: Duration,
    current_account: Arc<Mutex<Option<String>>>,
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
            shutdown_timeout: Duration::from_secs(SHUTDOWN_TIMEOUT_SECS),
            current_account: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_window(&self, window: Window) {
        *self.window.lock().unwrap() = Some(window);
    }

    /// Check if a port is available
    fn is_port_available(port: u16) -> bool {
        TcpListener::bind(("127.0.0.1", port)).is_ok()
    }

    /// Starts a new RGB Lightning Node process (if none is running).
    /// If one is running, it is shut down first, then a new one is started.
    /// Returns an error if the node binary cannot be started.
    pub fn start(
        &self,
        network: String,
        datapath: Option<String>,
        daemon_listening_port: String,
        ldk_peer_listening_port: String,
        account_name: String,
    ) -> Result<(), String> {
        println!("Starting node for account: {}", account_name);
        
        // Check if ports are available before proceeding
        let daemon_port = daemon_listening_port.parse::<u16>()
            .map_err(|e| format!("Invalid daemon port number: {}", e))?;
        let ldk_port = ldk_peer_listening_port.parse::<u16>()
            .map_err(|e| format!("Invalid LDK peer port number: {}", e))?;

        if !Self::is_port_available(daemon_port) {
            let err = format!("Port {} is already in use. Please make sure no other node is running or try a different port.", daemon_port);
            println!("{}", err);
            if let Some(window) = &*self.window.lock().unwrap() {
                let _ = window.emit("node-error", err.clone());
            }
            return Err(err);
        }

        if !Self::is_port_available(ldk_port) {
            let err = format!("Port {} is already in use. Please make sure no other node is running or try a different port.", ldk_port);
            println!("{}", err);
            if let Some(window) = &*self.window.lock().unwrap() {
                let _ = window.emit("node-error", err.clone());
            }
            return Err(err);
        }

        // Store the account name before starting the node
        *self.current_account.lock().unwrap() = Some(account_name.clone());

        // 1) If already running, attempt to stop & wait for complete shutdown
        if self.is_running() {
            println!("Node is already running for account: {}. Stopping existing process...", 
                self.current_account.lock().unwrap().as_ref().unwrap_or(&"unknown".to_string()));
            
            // First try graceful shutdown
            self.shutdown();
            
            // Wait for up to 10 seconds for graceful shutdown
            let start_time = std::time::Instant::now();
            let graceful_timeout = Duration::from_secs(10);
            while self.is_running() {
                if start_time.elapsed() > graceful_timeout {
                    println!("Graceful shutdown timed out, attempting force kill...");
                    self.force_kill();
                    
                    // Wait additional 5 seconds after force kill
                    thread::sleep(Duration::from_secs(5));
                    
                    if self.is_running() {
                        let err = "Failed to stop existing node process. Please try restarting the application.".to_string();
                        println!("{}", err);
                        if let Some(window) = &*self.window.lock().unwrap() {
                            let _ = window.emit("node-error", err.clone());
                        }
                        return Err(err);
                    }
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }
            
            // Add a small delay to ensure resources are released
            thread::sleep(Duration::from_secs(2));
        }

        // 2) Build the final data path for the node
        let app_data_dir = if cfg!(debug_assertions) {
            println!("Debug mode: Using local bin directory");
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../bin")
        } else if cfg!(target_os = "macos") {
            println!("MacOS: Using Application Support directory");
            let home = env::var("HOME").map_err(|e| format!("Failed to get HOME directory: {}", e))?;
            PathBuf::from(home).join("Library/Application Support/com.kaleidoswap.dev/data")
        } else if cfg!(target_os = "windows") {
            println!("Windows: Using LOCALAPPDATA directory");
            let local_app_data = env::var("LOCALAPPDATA")
                .map_err(|e| format!("Failed to get LOCALAPPDATA: {}", e))?;
            PathBuf::from(local_app_data).join("com.kaleidoswap.dev/data")
        } else {
            println!("Linux: Using .local/share directory");
            let home = env::var("HOME").map_err(|e| format!("Failed to get HOME directory: {}", e))?;
            PathBuf::from(home).join(".local/share/com.kaleidoswap.dev/data")
        };

        println!("App data directory: {:?}", app_data_dir);

        // Ensure base directory exists
        if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
            let err = format!("Failed to create data directory {:?}: {}", app_data_dir, e);
            println!("{}", err);
            return Err(err);
        }

        let final_datapath = match datapath {
            Some(path) => {
                let path = app_data_dir.join(path);
                println!("Using datapath: {:?}", path);
                path.to_string_lossy().to_string()
            },
            None => {
                println!("No datapath provided");
                "".to_string()
            },
        };

        // 3) Actually spawn the child process
        let child = match run_rgb_lightning_node(
            &network,
            &final_datapath,
            &daemon_listening_port,
            &ldk_peer_listening_port,
        ) {
            Ok(child) => child,
            Err(e) => {
                let err = format!("Failed to start RGB Lightning Node: {}", e);
                println!("{}", err);
                if let Some(window) = &*self.window.lock().unwrap() {
                    let _ = window.emit("node-error", err.clone());
                }
                return Err(err);
            }
        };

        // 4) Store the child process and mark as running
        {
            let mut proc_guard = self.child_process.lock().unwrap();
            *proc_guard = Some(child);
        }
        self.is_running.store(true, Ordering::SeqCst);

        println!("Node started successfully for account: {}", account_name);
        
        // Optionally emit an event so your UI knows a node started
        if let Some(window) = &*self.window.lock().unwrap() {
            let _ = window.emit("node-started", ());
        }

        // 5) Spawn a thread to watch the child process output and handle shutdown
        let rx = Arc::clone(&self.control_receiver);
        let cp_for_thread = Arc::clone(&self.child_process);
        let is_running_for_thread = Arc::clone(&self.is_running);
        let logs_for_thread = Arc::clone(&self.logs);
        let window_for_thread = Arc::clone(&self.window);
        let shutdown_timeout = self.shutdown_timeout;

        std::thread::spawn(move || {
            let mut child_option = cp_for_thread.lock().unwrap();
            if let Some(ref mut child) = *child_option {
                // Capture stdout
                if let Some(stdout) = child.stdout.take() {
                    let logs_clone = Arc::clone(&logs_for_thread);
                    let window_clone = Arc::clone(&window_for_thread);
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stdout);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                println!("Node stdout: {}", line);
                                logs_clone.lock().unwrap().push(line.clone());
                                if let Some(win) = &*window_clone.lock().unwrap() {
                                    let _ = win.emit("node-log", line);
                                }
                            }
                        }
                    });
                }
                // Capture stderr
                if let Some(stderr) = child.stderr.take() {
                    let logs_clone = Arc::clone(&logs_for_thread);
                    let window_clone = Arc::clone(&window_for_thread);
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                println!("Node stderr: {}", line);
                                logs_clone
                                    .lock()
                                    .unwrap()
                                    .push(format!("Error: {}", line));
                                if let Some(win) = &*window_clone.lock().unwrap() {
                                    let _ = win.emit("node-error", line);
                                }
                            }
                        }
                    });
                }
            }
            drop(child_option); // Release the lock

            // Monitoring loop
            loop {
                // Check if we got a Stop message
                match rx.lock().unwrap().try_recv() {
                    Ok(ControlMessage::Stop) => {
                        println!("Received Stop signal, breaking monitoring loop.");
                        break;
                    }
                    Err(_) => {
                        // Check if the child has exited
                        if let Some(ref mut child) = *cp_for_thread.lock().unwrap() {
                            match child.try_wait() {
                                Ok(Some(status)) => {
                                    println!("Node process exited with status: {:?}", status);
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
                        } else {
                            // No child process reference? Possibly already cleaned up
                            break;
                        }
                    }
                }
            }

            // Graceful shutdown attempt
            {
                let mut proc_guard = cp_for_thread.lock().unwrap();
                if let Some(mut child) = proc_guard.take() {
                    println!("Attempting graceful shutdown (kill)...");
                    let _ = child.kill();

                    // Wait up to shutdown_timeout
                    let start = std::time::Instant::now();
                    while start.elapsed() < shutdown_timeout {
                        match child.try_wait() {
                            Ok(Some(_)) => {
                                println!("Process exited gracefully.");
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
                        println!("Force killing child process (didn't exit in time).");
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }

            is_running_for_thread.store(false, Ordering::SeqCst);
            if let Some(win) = &*window_for_thread.lock().unwrap() {
                let _ = win.emit("node-stopped", ());
            }
        });

        Ok(())
    }

    /// Requests the process to stop. (Non-blocking)
    pub fn stop(&self) {
        if self.is_running() {
            println!("Sending Stop signal to node thread...");
            let _ = self.control_sender.send(ControlMessage::Stop);
            *self.current_account.lock().unwrap() = None;  // Clear the current account
        } else {
            println!("Node is not running.");
        }
    }

    /// Gracefully shuts down the node and waits up to `shutdown_timeout`.
    /// Falls back to a force kill if still alive afterward.
    pub fn shutdown(&self) {
        if self.is_running() {
            println!("Shutting down node gracefully via Stop signal...");
            self.stop(); // reuse the same signal

            let start = std::time::Instant::now();
            while self.is_running() {
                if start.elapsed() > self.shutdown_timeout {
                    println!("Timed out waiting for shutdown. Force killing...");
                    self.force_kill();
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }

            // Add additional delay to ensure ports are released
            println!("Waiting for ports to be released...");
            thread::sleep(Duration::from_secs(1));
        }
    }

    /// Check if a process is currently marked as running.
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    /// Check if a process is running for a specific account.
    pub fn is_running_for_account(&self, account_name: &str) -> bool {
        if !self.is_running() {
            return false;
        }
        
        if let Some(current_account) = self.current_account.lock().unwrap().as_ref() {
            current_account == account_name
        } else {
            false
        }
    }

    /// Get the name of the account currently running, if any
    pub fn get_current_account(&self) -> Option<String> {
        self.current_account.lock().unwrap().clone()
    }

    /// Returns any logs captured so far.
    pub fn get_logs(&self) -> Vec<String> {
        self.logs.lock().unwrap().clone()
    }

    /// Force kill the process immediately, without waiting for graceful exit.
    pub fn force_kill(&self) {
        println!("Force killing node process...");
        let mut proc_guard = self.child_process.lock().unwrap();
        if let Some(mut child) = proc_guard.take() {
            // Kill the main process
            let _ = child.kill();
            let _ = child.wait();
            
            // On Unix-like systems, try to ensure child processes are killed
            #[cfg(unix)]
            {
                use std::process::Command;
                let pid = child.id();  // This returns u32, not Option<u32>
                println!("Killing child processes of PID: {}", pid);
                let _ = Command::new("pkill")
                    .args(&["-P", &pid.to_string()])
                    .output();
            }
        }
        self.is_running.store(false, Ordering::SeqCst);
        *self.current_account.lock().unwrap() = None;  // Clear the current account
        
        // Add additional delay to ensure ports are released
        println!("Waiting for ports to be released after force kill...");
        thread::sleep(Duration::from_secs(1));
    }
}

/// Spawns the rgb-lightning-node process.
/// Returns a `Child` on success or an error message otherwise.
fn run_rgb_lightning_node(
    network: &str,
    datapath: &str,
    daemon_listening_port: &str,
    ldk_peer_listening_port: &str,
) -> Result<Child, String> {
    let executable_path = if cfg!(debug_assertions) {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../bin/rgb-lightning-node");
        println!("Debug mode: Looking for executable at {:?}", path);
        path
    } else {
        let exe_dir = env::current_exe()
            .map_err(|e| format!("Failed to get current executable path: {}", e))?;
        let path = exe_dir.parent()
            .ok_or_else(|| "Failed to get parent directory of executable".to_string())?
            .join("rgb-lightning-node");
        println!("Production mode: Looking for executable at {:?}", path);
        path
    };

    #[cfg(target_os = "windows")]
    {
        executable_path.set_extension("exe");
    }

    if !executable_path.exists() {
        return Err(format!(
            "rgb-lightning-node executable not found at: {:?}",
            executable_path
        ));
    }

    println!("Starting RGB Lightning Node with arguments:");
    println!("  Executable: {:?}", executable_path);
    println!("  Network: {}", network);
    println!("  Data path: {}", datapath);
    println!("  Daemon port: {}", daemon_listening_port);
    println!("  LDK peer port: {}", ldk_peer_listening_port);

    let child = Command::new(&executable_path)
        .arg(datapath)
        .args(&["--daemon-listening-port", daemon_listening_port])
        .args(&["--ldk-peer-listening-port", ldk_peer_listening_port])
        .args(&["--network", network])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    match child {
        Ok(child) => {
            println!("Successfully spawned RGB Lightning Node process");
            Ok(child)
        },
        Err(e) => {
            let err = format!("Failed to spawn rgb-lightning-node process: {}", e);
            println!("{}", err);
            Err(err)
        }
    }
}
