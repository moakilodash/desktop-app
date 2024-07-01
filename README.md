# Kaleidoswap Desktop App

## Overview
Kaleidoswap is an open-source desktop application that facilitates trustless digital asset trading on the Lightning Network. Utilizing a Tauri-based frontend, Kaleidoswap provides a seamless interface for connecting to an rgb-lightning-node. It offers a comprehensive LDK lightning node dashboard, enabling complete channel management within the app.

## Features

- [X] **RGB-Lightning Node Integration:** Connect with a node to manage your assets and trade on the Lightning Network.
- [X] **Real-time Price Streaming:** Subscribe to trading pairs like BTC/rUSDT and receive live price updates via websockets.
- [ ] **Lightning Channel Management:** Open and manage Lightning channels directly through the app.
- [ ] **Trustless Swaps:** Initiate and execute P2P swaps of RGB assets.

## Getting Started

### Prerequisites

- Ensure you have [Tauri](https://tauri.app/v1/guides/getting-started/prerequisites) installed on your system.
- Node.js and npm must be installed to run the Tauri app in the development environment.
- Rust (for Tauri backend)
- Docker (for arm64 systems like M1-M2 Macs)





## Setting Up `rgb-lightning-node`

The `rgb-lightning-node` can be set up for a regtest or testbet environment. There are two main approaches: compiling from source or using Docker.

### Compiling from Source

1. Clone the `rgb-lightning-node` repository:

```bash
git clone https://github.com/RGB-Tools/rgb-lightning-node --recurse-submodules --shallow-submodules
```

2. Compile the node :
```bash
cd rgb-lightning-node
cargo install --debug --path .
```

3. Run the node in regtest or testnet mode:

- **Regtest**

```bash
rgb-lightning-node user:password@localhost:18443 dataldk0/ --daemon-listening-port 3001 --ldk-peer-listening-port 9735 --network regtest
```

- **Testnet**

```bash
rgb-lightning-node user:password@electrum.iriswallet.com:18332 dataldk1/ --daemon-listening-port 3001 --ldk-peer-listening-port 9735 --network testnet
```


### Using Docker

For systems like M1 Macs where direct compilation might be problematic, Docker can be used.

1. Ensure Docker is installed and running on your system.

2. Build the Docker image for `rgb-lightning-node`:

```bash
docker build -t rgb-lightning-node:latest .
```

3. Add the following services to your `docker-compose.yml` to integrate `rgb-lightning-node` with other containers such as `bitcoind` and `electrs`:

```yaml
services:
  kaleidoswap-node:
    image: rgb-lightning-node:latest
    command: >
      user:password@bitcoind:18443
      /tmp/kaleidoswap/dataldk1/  
      --daemon-listening-port 3001
      --ldk-peer-listening-port 9735
      --network regtest
    depends_on:
      - bitcoind
      - electrs
    ports:
      - 3001:3001
      - 9735:9735
```

1. Start the regtest environment from rgb-lightning-node:

```bash
./regtest.sh start 
```

### Installation

1. **Clone the repository:**

```sh
git clone https://github.com/your-username/kaleidoswap.git
cd kaleidoswap
```

2. **Build the Tauri app:**

```sh
# Install Dependencies
npm install
```
3. **Run Kaleidoswap:**
```sh
# Start the Tauri app in the development environment:
tauri dev
```

### Usage

- Launch the Kaleidoswap app.
- Connect to your rgb-lightning-node through the provided interface.
- Manage your Lightning channels via the dashboard.
- Subscribe to trading pairs and monitor live price feeds.
- Use the Swap feature to securely trade assets without counterparty risk.

## API and Trading

### Websockets Subscription

- Subscribe to trading pairs for real-time price updates and rfq IDs.

### Swap Requests

- Initiate swaps with `POST /api/v1/swap/init` using the `SwapRequest` model.
  
### Confirm Swap

- Whitelist trades with the rgb-lightning-node and confirm execution with `POST /api/v1/swap/execute` using the `ConfirmSwapRequest` model.

### Trade Execution

- The maker instantiates the trade with `makerinit`, providing swap details.
- Upon successful execution, a 200 OK response confirms the trade.

## TODOs
- [ ] Integrate RGB Lightning Channel Request API .
- [ ] Multi-assets trading  
- [ ] Implement stable swaps functionality with an in-app rgb-lightning-node library.
- [ ] Introduce Liquidity Optimization features, including Rebalancing, Splicing, and Submarine Swaps, to streamline trading efficiency and saving fees.
- [ ] Backup and restore wallet functionality.
- 
## Contributing

Contributions to Kaleidoswap are welcome! Please refer to the contributing guidelines before making pull requests.

## Support

For support, questions, or feature requests, open an issue in the [Kaleidoswap repository issues](https://github.com/your-username/kaleidoswap/issues) section.

## License

Kaleidoswap is released under the [MIT License](LICENSE.md).

