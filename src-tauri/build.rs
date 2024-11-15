use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus};
use std::thread;
use std::time::Duration;
use dotenv::dotenv;
use serde_json::Value;

fn main() {
    dotenv().ok();

    let build_rgb_lightning_node = env::var("BUILD_AND_RUN_RGB_LIGHTNING_NODE")
        .unwrap_or_else(|_| "true".to_string()) == "true";

    // Load the Tauri configuration
    let config_path = PathBuf::from("./tauri.conf.json");
    let mut config = TauriConfig::load(&config_path);

    // Manage the build process for rgb-lightning-node
    if build_rgb_lightning_node {
        let build_manager = BuildManager::new();

        // Determine the path of the binary
        let project_root = build_manager.project_builder.find_project_root();
        let bin_dir = project_root.join("bin");
        let executable_path = bin_dir.join("rgb-lightning-node");

        // Recursively add directives to monitor source files
        let src_dir = project_root.join("src-tauri").join("rgb-lightning-node");
        visit_dirs(&src_dir, &|path: &Path| {
            if path.is_file() && path.extension().unwrap_or_default() != "toml" {
                println!("cargo:rerun-if-changed={}", path.display());
            }
        });

        // Rebuild only if the binary does not exist or if the sources have changed
        if !executable_path.exists() {
            build_manager.build_rgb_lightning_node();
        }

        config.add_resource("../bin/rgb-lightning-node");
    } else {
        config.remove_resource("../bin/rgb-lightning-node");
    }

    // Save any changes to the Tauri configuration
    config.save(&config_path);

    // Trigger the Tauri build
    tauri_build::build();
}

// Recursively visits directories and applies the given function to each file
fn visit_dirs(dir: &Path, cb: &dyn Fn(&Path)) {
    if dir.is_dir() {
        for entry in fs::read_dir(dir).expect("read_dir failed") {
            let entry = entry.expect("read_dir entry failed");
            let path = entry.path();
            if path.is_dir() {
                visit_dirs(&path, cb);
            } else {
                cb(&path);
            }
        }
    }
}

// Responsible for handling the Tauri configuration
struct TauriConfig {
    config: Value,
}

impl TauriConfig {
    fn load(path: &Path) -> Self {
        let config_str = fs::read_to_string(path).expect("Failed to read tauri.conf.json");
        let config: Value = serde_json::from_str(&config_str).expect("Failed to parse tauri.conf.json");
        TauriConfig { config }
    }

    fn add_resource(&mut self, resource: &str) {
        if let Some(resources) = self.config["tauri"]["bundle"]["resources"].as_array_mut() {
            if !resources.contains(&Value::String(resource.to_string())) {
                resources.push(resource.into());
            }
        }
    }

    fn remove_resource(&mut self, resource: &str) {
        if let Some(resources) = self.config["tauri"]["bundle"]["resources"].as_array_mut() {
            resources.retain(|r| r != resource);
        }
    }

    fn save(&self, path: &Path) {
        let current_config_str = fs::read_to_string(path).unwrap_or_default();
        let new_config_str = serde_json::to_string_pretty(&self.config)
            .expect("Failed to serialize tauri.conf.json");

        if current_config_str != new_config_str {
            fs::write(path, new_config_str).expect("Failed to write tauri.conf.json");
        }
    }
}

// Manages the overall build process
struct BuildManager {
    dependency_checker: DependencyChecker,
    project_builder: ProjectBuilder,
    cleaner: Cleaner,
}

impl BuildManager {
    fn new() -> Self {
        BuildManager {
            dependency_checker: DependencyChecker::new(),
            project_builder: ProjectBuilder::new(),
            cleaner: Cleaner::new(),
        }
    }

    fn build_rgb_lightning_node(&self) {
        let project_root = self.project_builder.find_project_root();
        let bin_dir = project_root.join("bin");
        let executable_path = bin_dir.join("rgb-lightning-node");
    
        // Checks if the executable already exists
        if executable_path.exists() {
            println!("Executable already exists at: {}", executable_path.display());
            return; // Exit the function to avoid redoing the build
        }
    
        // Check all required dependencies
        self.dependency_checker.check_all();
    
        // Clone the rgb-lightning-node repository
        self.project_builder.clone_repo();
    
        // Determine if the build is a release build
        let is_release = env::var("PROFILE").unwrap_or_else(|_| "debug".to_string()) == "release";
        
        // Build the project
        self.project_builder.build(is_release);
    
        // Clean up after the build
        self.cleaner.clean_project();
    }
}

// Responsible for checking dependencies
struct DependencyChecker;

impl DependencyChecker {
    fn new() -> Self {
        DependencyChecker
    }

    fn check_all(&self) {
        self.check_cargo();
        self.check_curl();
        self.check_openssl();
        self.check_compiler();
    }

    fn check_cargo(&self) {
        if !self.command_exists("cargo") {
            panic!("Cargo is not installed. Please install Cargo by following these steps:\n\
                    1. Download and install rustup: https://rustup.rs/\n\
                    2. After installation, run 'source $HOME/.cargo/env' to configure your shell.");
        }
    }

    fn check_curl(&self) {
        if !self.command_exists("curl") {
            panic!("'curl' is not installed. Please install 'curl' and try again.");
        }
    }

    fn check_openssl(&self) {
        let (openssl_include_dir, openssl_lib_dir) = if cfg!(target_os = "macos") {
            // Default path on macOS when OpenSSL is installed via Homebrew
            (
                "/opt/homebrew/opt/openssl@3/include".to_string(),
                "/opt/homebrew/opt/openssl@3/lib".to_string()
            )
        } else if cfg!(target_os = "linux") {
            // Default path on Linux
            (
                "/usr/include/openssl".to_string(),
                "/usr/lib".to_string() // Standard path for libraries on Linux
            )
        } else if cfg!(target_os = "windows") {
            // Path on Windows, based on the default installation by Chocolatey
            let include_dir = env::var("OPENSSL_INCLUDE_DIR")
                .unwrap_or_else(|_| "C:\\Program Files\\OpenSSL\\include".to_string());
            let lib_dir = env::var("OPENSSL_LIB_DIR")
                .unwrap_or_else(|_| "C:\\Program Files\\OpenSSL\\lib".to_string());
            (include_dir, lib_dir)
        } else {
            panic!("Unsupported operating system");
        };
    
        // Check if the include path exists
        let include_path = PathBuf::from(&openssl_include_dir);
        if !include_path.exists() {
            panic!("OpenSSL include directory does not exist: {:?}", include_path);
        }
    
        // Check if lib path exists
        let lib_path = PathBuf::from(&openssl_lib_dir);
        if !lib_path.exists() {
            panic!("OpenSSL lib directory does not exist: {:?}", lib_path);
        }
    
        // Additional checks for Windows
        if cfg!(target_os = "windows") {
            if !self.command_exists("vcpkg") {
                panic!("vcpkg is not installed. Please install vcpkg and OpenSSL via vcpkg:\n\
                        1. Install vcpkg: https://github.com/microsoft/vcpkg\n\
                        2. Install OpenSSL: `vcpkg install openssl:x64-windows`");
            }
        } else {
            if !self.command_exists("pkg-config") {
                panic!("pkg-config is not installed. Please install pkg-config by running:\n\
                        sudo apt-get install -y pkg-config");
            }
    
            let openssl_check = Command::new("pkg-config")
                .args(&["--exists", "openssl"])
                .status()
                .expect("Failed to run pkg-config");
    
            if !openssl_check.success() {
                panic!("OpenSSL development libraries are not installed. Please install OpenSSL development libraries by running:\n\
                        sudo apt-get install -y libssl-dev");
            }
        }
    }    

    fn check_compiler(&self) {
        if cfg!(target_os = "macos") {
            if !self.command_exists("cc") {
                panic!("Compiler 'cc' not found. Please install Xcode command line tools by running:\n\
                        xcode-select --install");
            }
        } else if cfg!(target_os = "linux") {
            if !self.command_exists("cc") {
                println!("Compiler 'cc' not found. Installing gcc...");
                let install_gcc = Command::new("sudo")
                    .args(&["apt-get", "update", "-y"])
                    .status()
                    .and_then(|_| Command::new("sudo")
                    .args(&["apt-get", "install", "-y", "build-essential"])
                    .status())
                    .expect("Failed to install gcc");
                if !install_gcc.success() {
                    panic!("Failed to install gcc. Please install it manually.");
                }
            }
        } else if cfg!(target_os = "windows") {
            if !self.command_exists("cl") {
                panic!("MSVC compiler not found. Please install Visual Studio with C++ build tools.");
            }
        } else {
            panic!("Unsupported OS. Please install the appropriate compiler manually.");
        }
    }

    fn command_exists(&self, command: &str) -> bool {
        if cfg!(target_os = "windows") {
            Command::new("where")
                .arg(command)
                .output()
                .map_or(false, |output| output.status.success())
        } else {
            Command::new("which")
                .arg(command)
                .output()
                .map_or(false, |output| output.status.success())
        }
    }
}

// Handles the project building process
struct ProjectBuilder;

impl ProjectBuilder {
    fn new() -> Self {
        ProjectBuilder
    }

    fn clone_repo(&self) {
        let project_root = self.find_project_root();
        let project_dir = project_root.join("rgb-lightning-node");

        // Remove existing directory, if any
        if project_dir.exists() {
            println!("Directory already exists. Removing...");
            if let Err(e) = self.retry_remove_dir_all(&project_dir) {
                panic!("Failed to remove existing directory: {:?}", e);
            }
        }

        // Clone the repository into the project root
        let clone_status = Command::new("git")
            .args(&["clone", "https://github.com/kaleidoswap/rgb-lightning-node", "--recurse-submodules", "--shallow-submodules"])
            .current_dir(&project_root) // Ensure the working directory is set to the project root
            .status()
            .expect("Failed to clone the repository");

        if !clone_status.success() {
            panic!("Failed to clone repository");
        }
    }

    fn retry_remove_dir_all(&self, path: &Path) -> std::io::Result<()> {
        for _ in 0..3 {
            match fs::remove_dir_all(path) {
                Ok(_) => return Ok(()),
                Err(_) => {
                    println!("Failed to remove directory. Retrying in 1 second...");
                    thread::sleep(Duration::from_secs(1));
                }
            }
        }
        fs::remove_dir_all(path) // Final attempt without retrying
    }

    fn build(&self, release: bool) {
        let project_root = self.find_project_root();
        let project_dir = project_root.join("rgb-lightning-node");
        let bin_dir = project_root.join("bin");
        let target_dir = project_dir.join("target");

        // Clean the target directory before building
        if target_dir.exists() {
            println!("Cleaning target directory...");
            if let Err(e) = self.retry_remove_dir_all(&target_dir) {
                panic!("Failed to clean target directory: {:?}", e);
            }
        }

        // Ensure target directory exists
        fs::create_dir_all(&target_dir).expect("Failed to create target directory");

        let status = if release {
            self.run_cargo_build(&project_dir, true)
        } else {
            self.run_cargo_build(&project_dir, false)
        };

        if !status.success() {
            panic!("Failed to build rgb-lightning-node");
        }

        self.copy_executable(&target_dir, &bin_dir, release);
    }

    fn run_cargo_build(&self, project_dir: &PathBuf, release: bool) -> ExitStatus {
        let mut cmd = Command::new("cargo");
        if release {
            cmd.args(&["build", "--release", "--manifest-path"]);
        } else {
            cmd.args(&["build", "--manifest-path"]);
        }
        cmd.arg(project_dir.join("Cargo.toml"))
            .status()
            .expect("Failed to run cargo build")
    }

    fn copy_executable(&self, target_dir: &PathBuf, bin_dir: &PathBuf, release: bool) {
        fs::create_dir_all(&bin_dir).expect("Failed to create bin directory");
        let executable_path = if release {
            target_dir.join("release/rgb-lightning-node")
        } else {
            target_dir.join("debug/rgb-lightning-node")
        };

        if let Err(e) = fs::copy(&executable_path, bin_dir.join("rgb-lightning-node")) {
            panic!("Failed to copy binary to bin directory: {}", e);
        }

        println!("cargo:rerun-if-changed={}", bin_dir.join("rgb-lightning-node").display());
    }

    fn find_project_root(&self) -> PathBuf {
        let current_dir = env::current_dir().expect("Failed to get current directory");

        // Traverse up the directory tree to find the project root
        let project_root = current_dir
            .ancestors()
            .find(|dir| dir.join("src-tauri").exists())
            .expect("Failed to find project root");

        println!("Project root found at: {}", project_root.display());

        project_root.to_path_buf()
    }
}

// Handles project cleanup
struct Cleaner;

impl Cleaner {
    fn new() -> Self {
        Cleaner
    }

    fn clean_project(&self) {
        let project_root = ProjectBuilder::new().find_project_root();
        let project_dir = project_root.join("rgb-lightning-node");
        if let Err(e) = ProjectBuilder::new().retry_remove_dir_all(&project_dir) {
            panic!("Failed to clean project directory: {:?}", e);
        }
    }
}