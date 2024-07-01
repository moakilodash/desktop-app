use crate::main::init_process;

#[test]
fn test_init_process() {
  init_process();
  tauri::Builde
  // Assert docker run command was called with expected args
  assert!(Command::new("docker").called_with([
    "run", "--rm", "rgb-lightning-node:latest", 
    "user:password@electrum.iriswallet.com:18332", "/tmp/kaleidoswap/dataldk1/", 
    "--daemon-listening-port", "3001", "--ldk-peer-listening-port", "9736", 
    "--network", "testnet"
  ]));

  // Assert docker run command spawned a process
  assert!(Command::new("docker").spawned()); 
}
