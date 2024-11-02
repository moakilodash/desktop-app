export interface NetworkDefaults {
  rpc_connection_url: string
  indexer_url: string
  proxy_endpoint: string
  daemon_listening_port: string
  ldk_peer_listening_port: string
}

export const NETWORK_DEFAULTS: Record<string, NetworkDefaults> = {
  mainnet: {
    daemon_listening_port: '3001',
    indexer_url: '127.0.0.1:50001',
    ldk_peer_listening_port: '9735',
    proxy_endpoint: 'rpc://127.0.0.1:3000/json-rpc',
    rpc_connection_url: 'user:password@127.0.0.1:8332',
  },
  regtest: {
    daemon_listening_port: '3001',
    indexer_url: 'electrum.rgbtools.org:50041',
    ldk_peer_listening_port: '9735',
    proxy_endpoint: 'rpcs://proxy.iriswallet.com/0.2/json-rpc',
    rpc_connection_url: 'user:password@regtest-bitcoind.rgbtools.org:80',
  },
  signet: {
    daemon_listening_port: '3001',
    indexer_url: '127.0.0.1:60601',
    ldk_peer_listening_port: '9735',
    proxy_endpoint: 'rpc://127.0.0.1:3000/json-rpc',
    rpc_connection_url: 'user:password@127.0.0.1:38332',
  },
  testnet: {
    daemon_listening_port: '3001',
    indexer_url: 'ssl://electrum.iriswallet.com:50013',
    ldk_peer_listening_port: '9735',
    proxy_endpoint: 'rpcs://proxy.iriswallet.com/0.2/json-rpc',
    rpc_connection_url: 'user:password@electrum.iriswallet.com:18332',
  },
}
