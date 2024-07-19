use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use dotenv::dotenv;
use serde_json::Value;

fn main() {
    dotenv().ok();

    let build_rgb_lightning_node = env::var("BUILD_AND_RUN_RGB_LIGHTNING_NODE")
        .unwrap_or_else(|_| "true".to_string()) == "true";

    let config_path = PathBuf::from("./tauri.conf.json");

    let mut config: Value = serde_json::from_str(
        &fs::read_to_string(&config_path).expect("Failed to read tauri.conf.json"),
    ).expect("Failed to parse tauri.conf.json");

    let mut resources_modified = false;

    if build_rgb_lightning_node {
        if let Some(resources) = config["tauri"]["bundle"]["resources"].as_array_mut() {
            if !resources.contains(&Value::String("../bin/rgb-lightning-node".to_string())) {
                resources.push("../bin/rgb-lightning-node".into());
                resources_modified = true;
            }
        }
    } else {
        if let Some(resources) = config["tauri"]["bundle"]["resources"].as_array_mut() {
            let original_len = resources.len();
            resources.retain(|r| r != "../bin/rgb-lightning-node");
            resources_modified = resources.len() != original_len;
        }
    }

    if resources_modified {
        fs::write(
            &config_path,
            serde_json::to_string_pretty(&config).expect("Failed to serialize tauri.conf.json"),
        ).expect("Failed to write tauri.conf.json");
    }

    if build_rgb_lightning_node {
        let executable_path = PathBuf::from("../bin/rgb-lightning-node");

        if !executable_path.exists() {
            println!("Executable not found. Starting the build process...");

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
        }

        if executable_path.exists() {
            let executable_path_absolute = fs::canonicalize(&executable_path)
                .expect("Failed to get absolute path of executable");

            println!("cargo:rerun-if-changed={}", executable_path.display());
            println!("cargo:rustc-env=EXECUTABLE_PATH={}", executable_path_absolute.display());
        } else {
            panic!("Executable path does not exist after build process: {:?}", executable_path);
        }
    } else {
        println!("Skipping the build process for rgb-lightning-node as per the environment variable.");
    }

    tauri_build::build()
}