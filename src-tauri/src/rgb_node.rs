use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::mpsc::{channel, Sender, Receiver};
use std::time::Duration;
use std::thread;
use std::sync::{Arc, Mutex};

pub struct NodeProcess {
    child_process: Option<Child>,
    control_sender: Sender<ControlMessage>,
    control_receiver: Arc<Mutex<Receiver<ControlMessage>>>,
}

enum ControlMessage {
    Stop,
}

impl NodeProcess {
    pub fn new() -> Self {
        let (tx, rx) = channel();
        NodeProcess {
            child_process: None,
            control_sender: tx,
            control_receiver: Arc::new(Mutex::new(rx)),
        }
    }

    pub fn start(&mut self, network: String, datapath: String, rpc_connection_url: String) {
        let rx = Arc::clone(&self.control_receiver);

        std::thread::spawn(move || {
            let mut process = run_rgb_lightning_node(&network, &datapath, &rpc_connection_url);
            
            if let Some(mut child) = process {
                loop {
                    if let Ok(ControlMessage::Stop) = rx.lock().unwrap().try_recv() {
                        println!("Stopping the process...");
                        let _ = child.kill();
                        let _ = child.wait();
                        break;
                    }

                    match child.try_wait() {
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
            } else {
                println!("Failed to start the rgb-lightning-node daemon.");
            }
        });
    }

    pub fn stop(&mut self) {
        if let Err(e) = self.control_sender.send(ControlMessage::Stop) {
            println!("Failed to send stop signal: {:?}", e);
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
