import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
//import { satoshiToBTC } from '../../helpers/number'

interface InitRequest {
  password: string
}

interface InitResponse {
  mnemonic: string
}

interface UnlockRequest {
  password: string
}

interface RestoreRequest {
  backup_path: string
  password: string
}

interface BackupRequest {
  backup_path: string
  password: string
}

interface OpenChannelRequest {
  asset_amount?: number
  asset_id?: string
  capacity_sat: number
  peer_pubkey_and_addr: string
}

interface OpenChannelResponse {
  temporary_channel_id: string
}

interface ListAssetsResponse {
  assets: {
    asset_id: string
    ticker: string
    name: string
    precision: number
    issued_supply: number
    timestamp: number
  }[]
}
interface CloseChannelRequest {
  channel_id: string
  peer_pubkey: string
}

export interface Channel {
  channel_id: string
  funding_txid: string
  peer_pubkey: string
  ready: boolean
  capacity_sat: number
  local_balance_msat: number
  is_usable: boolean
  public: boolean
  asset_id: string
  asset_local_amount: number
  asset_remote_amount: number
  outbound_balance_msat: number
  inbound_balance_msat: number
}
interface ListChannelsResponse {
  channels: Channel[]
}

interface NodeInfoResponse {
  pubkey: string
  num_channels: number
  num_usable_channels: number
  local_balance_msat: number
  num_peers: number
}

interface ConnectPeerRequest {
  pubkey_and_addr: string
}

interface ListPeersResponse {
  peers: [
    {
      pubkey: string
    },
  ]
}

interface AddressResponse {
  address: string
}

interface IssueAssetRequest {
  amounts: number[]
  ticker: string
  name: string
  precision: number
}

interface IssueAssetResponse {
  asset_id: string
}

// interface BTCBalanceResponse {
//   vanilla: {
//     settled: number
//     future: number
//     spendable: number
//   }
//   colored: {
//     settled: number
//     future: number
//     spendable: number
//   }
// }

interface BTCBalanceResponseTransformed {
  vanilla: {
    settled: number
    future: number
    spendable: number
  }
  colored: {
    settled: number
    future: number
    spendable: number
  }
}

interface AssetBalanceRequest {
  asset_id: string
}

interface AssetBalanceResponse {
  settled: number
  future: number
  spendable: number
  offchain_outbound: number
  offchain_inbound: number
}

interface RGBInvoiceResponse {
  recipient_id: string
  invoice: string
  expiration_timestamp: number
}

interface LNInvoiceRequest {
  asset_id: string
  asset_amount: number
}

interface LNINvoiceResponse {
  invoice: string
}

interface SendBTCRequest {
  amount: number
  address: string
}

interface SendBTCResponse {
  txid: string
}

interface SendAssetRequest {
  asset_id: string
  amount: number
  blinded_utxo: string
}

interface SendAssetResponse {
  txid: string
}

interface SendPaymentRequest {
  invoice: string
}

interface SendPaymentResponse {
  payment_hash: string
  payment_secret: string
  status: string
}

// interface ListTransactionsResponse {
//   transactions: {
//     transaction_type: string
//     txid: string
//     received: number
//     sent: number
//     fee: number
//     confirmation_time: {
//       height: number
//       timestamp: number
//     }
//   }[]
// }

interface ListTransactionsResponseTransformed {
  transactions: {
    transaction_type: string
    txid: string
    received: string
    sent: string
    fee: number
    confirmation_time: {
      height: number
      timestamp: number
    }
  }[]
}

interface TakerRequest {
  swapstring: string
}

interface ListUnspentsResponse {
  unspents: [
    {
      utxo: {
        outpoint: string
        btc_amount: string
        colorable: boolean
      }
      rgb_allocations: [
        {
          asset_id: string
          amount: number
          settled: boolean
        },
      ]
    },
  ]
}

export const nodeApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:3001' }),
  endpoints: (builder) => ({
    address: builder.query<AddressResponse, void>({
      query: () => ({
        body: {},
        method: 'POST',
        url: '/address',
      }),
    }),
    assetBalance: builder.query<AssetBalanceResponse, AssetBalanceRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/assetbalance',
      }),
    }),
    backup: builder.query<void, BackupRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/backup',
      }),
    }),
    btcBalance: builder.query<BTCBalanceResponseTransformed, void>({
      query: () => '/btcbalance',
    }),
    closeChannel: builder.query<void, CloseChannelRequest>({
      query: (body) => ({
        body: {
          channel_id: body.channel_id,
          force: false,
          peer_pubkey: body.peer_pubkey,
        },
        method: 'POST',
        url: '/closechannel',
      }),
    }),
    connectPeer: builder.query<void, ConnectPeerRequest>({
      query: (body) => ({
        body: {
          peer_pubkey_and_addr: body.pubkey_and_addr,
        },
        method: 'POST',
        url: '/connectpeer',
      }),
    }),
    createUTXOs: builder.query<AddressResponse, void>({
      query: () => ({
        body: {
          num: 4,
          up_to: false,
        },
        method: 'POST',
        url: '/createutxos',
      }),
    }),
    init: builder.query<InitResponse, InitRequest>({
      query: (body) => ({
        body: {
          password: body.password,
        },
        method: 'POST',
        url: '/init',
      }),
    }),
    issueAsset: builder.query<IssueAssetResponse, IssueAssetRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/issueasset',
      }),
    }),
    listAssets: builder.query<ListAssetsResponse, void>({
      query: () => '/listassets',
    }),
    listChannels: builder.query<ListChannelsResponse, void>({
      query: () => '/listchannels',
    }),
    listPeers: builder.query<ListPeersResponse, void>({
      query: () => '/listpeers',
    }),
    listTransactions: builder.query<ListTransactionsResponseTransformed, void>({
      query: () => '/listtransactions',
    }),
    listUnspents: builder.query<ListUnspentsResponse, void>({
      query: () => '/listunspents',
    }),
    lnInvoice: builder.query<LNINvoiceResponse, LNInvoiceRequest>({
      query: (body) => ({
        body: {
          amt_msat: 3000000,
          asset_amount: body.asset_amount,
          asset_id: body.asset_id,
          expiry_sec: 420,
        },
        method: 'POST',
        url: '/lninvoice',
      }),
    }),
    lock: builder.query<void, void>({
      query: () => ({
        method: 'POST',
        url: '/lock',
      }),
    }),
    nodeInfo: builder.query<NodeInfoResponse, void>({
      query: () => '/nodeinfo',
    }),
    openChannel: builder.query<OpenChannelResponse, OpenChannelRequest>({
      query: (body) => {
        const requestBody: any = {
          capacity_sat: body.capacity_sat,
          peer_pubkey_and_addr: body.peer_pubkey_and_addr,
          public: true,
          push_msat: 3100000,
          with_anchors: true,
        }
        if (body.asset_amount && body.asset_amount > 0) {
          requestBody.asset_amount = body.asset_amount
          requestBody.asset_id = body.asset_id
        }
        return {
          body: requestBody,
          method: 'POST',
          url: '/openchannel',
        }
      },
    }),
    restore: builder.query<void, RestoreRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/restore',
      }),
    }),
    rgbInvoice: builder.query<RGBInvoiceResponse, void>({
      query: () => ({
        body: {
          min_confirmations: 0,
        },
        method: 'POST',
        url: '/rgbinvoice',
      }),
    }),
    sendAsset: builder.query<SendAssetResponse, SendAssetRequest>({
      query: (body) => ({
        body: {
          amount: body.amount,
          asset_id: body.asset_id,
          blinded_utxo: body.blinded_utxo,
          donation: false,
          min_confirmations: 1,
          transport_endpoints: ['rpc://localhost:3000/json-rpc'],
        },
        method: 'POST',
        url: '/sendasset',
      }),
    }),
    sendBtc: builder.query<SendBTCResponse, SendBTCRequest>({
      query: (body) => ({
        body: {
          address: body.address,
          amount: body.amount,
          fee_rate: 1.0,
        },
        method: 'POST',
        url: '/sendbtc',
      }),
    }),
    sendPayment: builder.query<SendPaymentResponse, SendPaymentRequest>({
      query: (body) => ({
        body: {
          invoice: body.invoice,
        },
        method: 'POST',
        url: '/sendbtc',
      }),
    }),
    taker: builder.query<void, TakerRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/taker',
      }),
    }),
    unlock: builder.query<void, UnlockRequest>({
      query: (body) => ({
        body: {
          password: body.password,
        },
        method: 'POST',
        url: '/unlock',
      }),
    }),
  }),
  reducerPath: 'nodeApi',
})
