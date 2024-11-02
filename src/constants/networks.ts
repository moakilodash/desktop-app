export interface NetworkDefaults {
  rpc_connection_url: string
  indexer_url: string
  proxy_endpoint: string
  node_port: string
}

export const NETWORK_DEFAULTS: Record<string, NetworkDefaults> = {
  mainnet: {
    indexer_url: '127.0.0.1:50001',
    node_port: '3001',
    proxy_endpoint: 'rpc://127.0.0.1:3000/json-rpc',
    rpc_connection_url: 'user:password@127.0.0.1:8332',
  },
  regtest: {
    indexer_url: 'electrum.rgbtools.org:50041',
    node_port: '3001',
    proxy_endpoint: 'rpcs://proxy.iriswallet.com/0.2/json-rpc',
    rpc_connection_url: 'user:password@regtest-bitcoind.rgbtools.org:80',
  },
  signet: {
    indexer_url: '127.0.0.1:60601',
    node_port: '3001',
    proxy_endpoint: 'rpc://127.0.0.1:3000/json-rpc',
    rpc_connection_url: 'user:password@127.0.0.1:38332',
  },
  testnet: {
    indexer_url: 'ssl://electrum.iriswallet.com:50013',
    node_port: '3001',
    proxy_endpoint: 'rpcs://proxy.iriswallet.com/0.2/json-rpc',
    rpc_connection_url: 'user:password@electrum.iriswallet.com:18332',
  },
}
