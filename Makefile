CARGO = cargo
PROJECT_NAME = rgb-lightning-node
TARGET = $(PROJECT_NAME)/target/release/$(PROJECT_NAME)
BUILD_DIR = $(PROJECT_NAME)/target
ROOT_DIR = $(CURDIR)
ARCH = $(shell uname -m)
OS = $(shell uname -s)
REPO_URL = https://github.com/kaleidoswap/rgb-lightning-node
PROJECT_DIR = $(ROOT_DIR)/$(PROJECT_NAME)
BIN_DIR = $(ROOT_DIR)/bin

all: check_dependencies check_cargo_env debug

clone_repo:
	@if [ ! -d "$(PROJECT_NAME)" ]; then \
		git clone $(REPO_URL) --recurse-submodules --shallow-submodules; \
	fi

update_repo:
	@if [ -d "$(PROJECT_NAME)" ]; then \
		cd $(PROJECT_DIR) && git pull && git submodule update --init --recursive; \
	else \
		$(MAKE) clone_repo; \
	fi

release: check_dependencies check_cargo_env update_repo
	cd $(PROJECT_DIR) && $(CARGO) build --release --manifest-path $(PROJECT_DIR)/Cargo.toml
	@mkdir -p $(BIN_DIR)
	@cp $(TARGET) $(BIN_DIR)/

debug: check_dependencies check_cargo_env update_repo
	cd $(PROJECT_DIR) && $(CARGO) build --manifest-path $(PROJECT_DIR)/Cargo.toml
	@mkdir -p $(BIN_DIR)
	@cp $(BUILD_DIR)/debug/$(PROJECT_NAME) $(BIN_DIR)/

build: debug

build-app: 
	npm run tauri build



run: release
	$(BIN_DIR)/$(PROJECT_NAME)

run-debug: debug
	$(BIN_DIR)/$(PROJECT_NAME)

clean:
	@rm -rf $(BUILD_DIR)
	@rm -rf $(PROJECT_DIR)
	@rm -rf $(BIN_DIR)

test: check_dependencies check_cargo_env update_repo
	cd $(PROJECT_DIR) && $(CARGO) test --manifest-path $(PROJECT_DIR)/Cargo.toml
	@rm -rf $(BUILD_DIR)

check_cargo:
	@command -v cargo >/dev/null 2>&1 || { \
		echo >&2 "Cargo is not installed."; \
		echo >&2 "Please install Cargo by following these steps:"; \
		echo >&2 "1. Download and install rustup: https://rustup.rs/"; \
		echo >&2 "2. After installation, run 'source $$HOME/.cargo/env' to configure your shell."; \
		exit 1; \
	}

check_cargo_env: check_cargo
	@command -v cargo >/dev/null 2>&1 || { \
		echo "source $$HOME/.cargo/env" >> $$HOME/.bashrc && \
		source $$HOME/.cargo/env; \
	}

check_curl:
	@command -v curl >/dev/null 2>&1 || { \
		echo >&2 "Error: 'curl' is not installed. Please install 'curl' and try again."; \
		exit 1; \
	}

check_openssl:
	@command -v pkg-config >/dev/null 2>&1 || { \
		echo >&2 "pkg-config is not installed."; \
		echo >&2 "Please install pkg-config by running:"; \
		echo >&2 "sudo apt-get install -y pkg-config"; \
		exit 1; \
	}
	@pkg-config --exists openssl || { \
		echo >&2 "OpenSSL development libraries are not installed."; \
		echo >&2 "Please install OpenSSL development libraries by running:"; \
		echo >&2 "sudo apt-get install -y libssl-dev"; \
		exit 1; \
	}

check_dependencies: check_curl check_openssl
	@if [ "$(OS)" = "Darwin" ]; then \
		command -v cc >/dev/null 2>&1 || { \
			echo >&2 "Compiler 'cc' not found. Installing Xcode command line tools..."; \
			xcode-select --install; \
		}; \
	elif [ "$(OS)" = "Linux" ]; then \
		command -v cc >/dev/null 2>&1 || { \
			echo >&2 "Compiler 'cc' not found. Installing gcc..."; \
			sudo apt-get update && sudo apt-get install -y build-essential; \
		}; \
	else \
		echo >&2 "Unsupported OS. Please install gcc or clang manually."; \
		exit 1; \
	fi

help:
	@echo "Makefile for the Rust project"
	@echo "Available commands:"
	@echo "  make all         - Clone or update, check dependencies, check cargo and build the project in debug mode (default)"
	@echo "  make release     - Update repo and compile the project in release mode"
	@echo "  make debug       - Update repo and compile the project in debug mode"
	@echo "  make build       - Alias for 'make debug'"
	@echo "  make run         - Update repo, compile in release mode and run the program"
	@echo "  make run-debug   - Update repo, compile in debug mode and run the program"
	@echo "  make clean       - Clean the build files"
	@echo "  make test        - Update repo and run the tests"
	@echo "  make help        - Show this help message"

.PHONY: all release debug run run-debug clean test help check_cargo check_cargo_env check_dependencies check_curl check_openssl clone_repo update_repo build