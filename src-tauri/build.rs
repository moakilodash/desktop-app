use std::process::Command;
use std::fs;
use std::path::PathBuf;

fn main() {
  let output = Command::new("make")
      .current_dir("../")
      .output()
      .expect("Failed to run make");

  if !output.status.success() {
      let stderr = String::from_utf8_lossy(&output.stderr);
      fs::write("../build_error.log", stderr.as_bytes())
          .expect("Failed to write build error log");
      panic!("Make command failed. Check build_error.log for details.");
  }

  let executable_path = PathBuf::from("../bin/rgb-lightning-node");
  let executable_path_absolute = fs::canonicalize(&executable_path)
        .expect("Failed to get absolute path of executable");

  println!("cargo:rerun-if-changed={}", executable_path.display());
  println!("cargo:rustc-env=EXECUTABLE_PATH={}", executable_path_absolute.display());

  tauri_build::build()
}