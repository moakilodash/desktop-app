CARGO = cargo
PROJECT_NAME = rgb-lightning-node
TARGET = $(PROJECT_NAME)/target/release/$(PROJECT_NAME)
BUILD_DIR = $(PROJECT_NAME)/target
ROOT_DIR = $(CURDIR)
ARCH = $(shell uname -m)
OS = $(shell uname -s)
REPO_URL = https://github.com/RGB-Tools/rgb-lightning-node
PROJECT_DIR = $(ROOT_DIR)/$(PROJECT_NAME)
BIN_DIR = $(ROOT_DIR)/bin

all: check_cargo debug

clone_repo:
	@if [ ! -d "$(PROJECT_NAME)" ]; then \
		git clone $(REPO_URL) --recurse-submodules --shallow-submodules; \
	fi

release: check_cargo clone_repo
	cd $(PROJECT_DIR) && $(CARGO) build --release --manifest-path $(PROJECT_DIR)/Cargo.toml
	@mkdir -p $(BIN_DIR)
	@mv $(BUILD_DIR)/release/$(PROJECT_NAME) $(BIN_DIR)/
	@rm -rf $(PROJECT_DIR)

debug: check_cargo clone_repo
	cd $(PROJECT_DIR) && $(CARGO) build --manifest-path $(PROJECT_DIR)/Cargo.toml
	@mkdir -p $(BIN_DIR)
	@mv $(BUILD_DIR)/debug/$(PROJECT_NAME) $(BIN_DIR)/
	@rm -rf $(PROJECT_DIR)

build: debug

run: release
	$(BIN_DIR)/$(PROJECT_NAME)

run-debug: debug
	$(BIN_DIR)/$(PROJECT_NAME)

clean:
	@rm -rf $(BUILD_DIR)
	@rm -rf $(PROJECT_DIR)
	@rm -rf $(BIN_DIR)

test: check_cargo clone_repo
	cd $(PROJECT_DIR) && $(CARGO) test --manifest-path $(PROJECT_DIR)/Cargo.toml
	@rm -rf $(BUILD_DIR)
	@rm -rf $(PROJECT_DIR)

check_cargo:
	@command -v cargo >/dev/null 2>&1 || { \
		echo >&2 "Cargo is not installed. Installing..."; \
		curl https://sh.rustup.rs -sSf | sh -s -- -y; \
		if [ -n "$$ZSH_VERSION" ]; then \
			echo "source $$HOME/.cargo/env" >> $$HOME/.zshrc; \
			source $$HOME/.zshrc; \
		elif [ -n "$$BASH_VERSION" ]; then \
			echo "source $$HOME/.cargo/env" >> $$HOME/.bashrc; \
			source $$HOME/.bashrc; \
		else \
			source $$HOME/.cargo/env; \
		fi; \
	}

help:
	@echo "Makefile for the Rust project"
	@echo "Available commands:"
	@echo "  make all         - Clone, check cargo and build the project in debug mode (default)"
	@echo "  make release     - Compile the project in release mode"
	@echo "  make debug       - Compile the project in debug mode"
	@echo "  make build       - Alias for 'make debug'"
	@echo "  make run         - Compile in release mode and run the program"
	@echo "  make run-debug   - Compile in debug mode and run the program"
	@echo "  make clean       - Clean the build files"
	@echo "  make test        - Run the tests"
	@echo "  make help        - Show this help message"

.PHONY: all release debug run run-debug clean test help check_cargo clone_repo build