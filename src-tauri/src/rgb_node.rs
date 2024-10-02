use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;

pub struct NodeThread {
    child_process: Arc<Mutex<Option<Child>>>,
    thread_handle: Option<JoinHandle<()>>,
}

impl NodeThread {
    pub fn new() -> Self {
        NodeThread {
            child_process: Arc::new(Mutex::new(None)),
            thread_handle: None,
        }
    }

    pub fn start(&mut self, network: String, datapath: String, rpc_connection_url: String) {
        let child_process = Arc::clone(&self.child_process);

        let handle = thread::spawn(move || {
            let process = run_rgb_lightning_node(&network, &datapath, &rpc_connection_url);
            if let Some(child) = process {
                *child_process.lock().unwrap() = Some(child);

                loop {
                    thread::sleep(Duration::from_secs(5));
                    if let Some(child_ref) = child_process.lock().unwrap().as_mut() {
                        if let Ok(Some(status)) = child_ref.try_wait() {
                            println!("Process finished with status: {:?}", status);
                            break;
                        }
                    }
                }
            } else {
                println!("Failed to start the rgb-lightning-node daemon.");
            }
        });

        self.thread_handle = Some(handle);
    }

    pub fn stop(&mut self) {
        if let Some(_) = self.thread_handle.take() {
            println!("handle found...");
            if let Some(mut child) = self.child_process.lock().unwrap().take() {
                println!("child found");
                let _ = child.kill();
                println!("killed child");
                let _ = child.wait();
                println!("waited for child");
            }

            self.thread_handle = None;
        } else {
            println!("Thread handle not found.");
        }
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
