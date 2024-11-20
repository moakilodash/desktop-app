import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'

import { RootState } from '../../app/store'
import { DEFAULT_TRANSPORT_ENDPOINT } from '../../constants'

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
  peer_pubkey_and_opt_addr: string
  capacity_sat: number
  push_msat?: number
  asset_amount?: number
  asset_id?: string
  with_anchors?: boolean
  fee_rate_msat?: number
  fee_proportional_millionths?: number
  temporary_channel_id?: string
}

interface OpenChannelResponse {
  temporary_channel_id: string
}

interface Balance {
  settled: number
  future: number
  spendable: number
}

export interface NiaAsset {
  asset_id: string
  asset_iface: string
  ticker: string
  name: string
  details: string | null
  precision: number
  issued_supply: number
  timestamp: number
  added_at: number
  balance: Balance
  media: string | null
}

interface ListAssetsResponse {
  nia: NiaAsset[]
}

interface CloseChannelRequest {
  channel_id: string
  peer_pubkey: string
}

export interface Channel {
  channel_id: string
  funding_txid: string
  peer_pubkey: string
  peer_alias: string
  short_channel_id: number
  status: ChannelStatus
  ready: boolean
  capacity_sat: number
  local_balance_msat: number
  outbound_balance_msat: number
  inbound_balance_msat: number
  next_outbound_htlc_limit_msat: number
  next_outbound_htlc_minimum_msat: number
  is_usable: boolean
  public: boolean
  asset_id: string
  asset_local_amount: number
  asset_remote_amount: number
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

interface BtcBalanceRequest {
  skip_sync: boolean
}

interface CreateUTXOsRequest {
  num: number
  size: number
  fee_rate: number
  skip_sync: boolean
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

interface BTCBalanceResponse {
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

enum ChannelStatus {
  Opening = 'Opening',
  Opened = 'Opened',
  Closing = 'Closing',
}

interface RGBInvoiceRequest {
  asset_id: string
}

interface RGBInvoiceResponse {
  recipient_id: string
  invoice: string
  expiration_timestamp: number
}

interface LNInvoiceRequest {
  amt_msat?: number
  asset_id?: string
  asset_amount?: number
}

interface LNINvoiceResponse {
  invoice: string
}

interface SendBTCRequest {
  amount: number
  address: string
  fee_rate: number
}

interface SendBTCResponse {
  txid: string
}

interface SendAssetRequest {
  asset_id: string
  amount: number
  recipient_id: string
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

interface ListTransactionsRequest {
  skip_sync: boolean
}

interface ListTransactionsResponse {
  transactions: {
    transaction_type: string
    txid: string
    received: number
    sent: number
    fee: number
    confirmation_time: {
      height: number
      timestamp: number
    }
  }[]
}

interface ListPaymentsResponse {
  payments: {
    amt_msat: number
    asset_amount: number
    asset_id: string | null
    payment_hash: string
    inbound: boolean
    status: string
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

interface ListUnspentsRequest {
  skip_sync: boolean
}

interface RefreshTransfersRequest {
  skip_sync: boolean
}

export interface SwapDetails {
  qty_from: number
  qty_to: number
  from_asset: string | null
  to_asset: string | null
  payment_hash: string
  status: string
}

interface ListSwapsResponse {
  maker: SwapDetails[]
  taker: SwapDetails[]
}

enum Network {
  Mainnet = 'Mainnet',
  Testnet = 'Testnet',
  Regtest = 'Regtest',
  Signet = 'Signet',
}

interface NetworkInfoResponse {
  network: Network
  height: number
}

interface UnlockRequest {
  password: string
  bitcoind_rpc_username: string
  bitcoind_rpc_password: string
  bitcoind_rpc_host: string
  bitcoind_rpc_port: number
  indexer_url: string
  proxy_endpoint: string
}

interface InvoiceStatusRequest {
  invoice: string
}

interface InvoiceStatusResponse {
  status: 'Pending' | 'Succeeded' | 'Failed' | 'Expired'
}

interface EstimateFeeResponse {
  fee_rate: number
}

interface EstimateFeeRequest {
  blocks: number
}

const dynamicBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const state = api.getState() as RootState
  const node_url = state.nodeSettings.data.node_url

  if (!node_url) {
    return {
      error: {
        data: 'Node URL not set',
        status: 400,
        statusText: 'Bad Request',
      },
    }
  }

  const urlEnd = typeof args === 'string' ? args : args.url
  const adjustedUrl = `${node_url}${urlEnd}`
  const adjustedArgs =
    typeof args === 'string' ? adjustedUrl : { ...args, url: adjustedUrl }

  return fetchBaseQuery({ baseUrl: '' })(adjustedArgs, api, extraOptions)
}

export const nodeApi = createApi({
  baseQuery: dynamicBaseQuery,
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
    btcBalance: builder.query<BTCBalanceResponse, BtcBalanceRequest>({
      query: () => ({
        body: {
          skip_sync: false,
        },
        method: 'POST',
        url: '/btcbalance',
      }),
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
    connectPeer: builder.mutation<void, { peer_connection_string: string }>({
      query: (body) => ({
        body: {
          peer_pubkey_and_addr: body.peer_connection_string,
        },
        method: 'POST',
        url: '/connectpeer',
      }),
    }),
    createUTXOs: builder.query<AddressResponse, CreateUTXOsRequest>({
      query: (body) => ({
        body: {
          fee_rate: body.fee_rate,
          num: body.num,
          size: body.size,
          skip_sync: false,
          up_to: false,
        },
        method: 'POST',
        url: '/createutxos',
      }),
    }),
    estimateFee: builder.query<EstimateFeeResponse, EstimateFeeRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/estimatefee',
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
    invoiceStatus: builder.query<InvoiceStatusResponse, InvoiceStatusRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/invoicestatus',
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
      query: () => ({
        body: {
          filter_asset_schemas: ['Nia'],
        },
        method: 'POST',
        url: '/listassets',
      }),
    }),
    listChannels: builder.query<ListChannelsResponse, void>({
      query: () => '/listchannels',
    }),
    listPayments: builder.query<ListPaymentsResponse, void>({
      query: () => '/listpayments',
    }),
    listPeers: builder.query<ListPeersResponse, void>({
      query: () => '/listpeers',
    }),
    listSwaps: builder.query<ListSwapsResponse, void>({
      query: () => '/listswaps',
    }),
    listTransactions: builder.query<
      ListTransactionsResponse,
      ListTransactionsRequest
    >({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/listtransactions',
      }),
    }),
    listUnspents: builder.query<ListUnspentsResponse, ListUnspentsRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/listunspents',
      }),
    }),
    lnInvoice: builder.query<LNINvoiceResponse, LNInvoiceRequest>({
      query: (body) => ({
        body: { ...body, amt_msat: body.amt_msat || 3000000, expiry_sec: 420 },
        // body: {
        //   amt_msat: body.amt_msat || 3000000,
        //   asset_amount: body.asset_amount,
        //   asset_id: body.asset_id === 'btc' ? null : body.asset_id,
        //   expiry_sec: 420,
        // },
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
    networkInfo: builder.query<NetworkInfoResponse, void>({
      query: () => '/networkinfo',
    }),
    nodeInfo: builder.query<NodeInfoResponse, void>({
      query: () => '/nodeinfo',
    }),
    openChannel: builder.query<OpenChannelResponse, OpenChannelRequest>({
      query: (body) => {
        const requestBody: any = {
          capacity_sat: body.capacity_sat,
          fee_rate_msat: body.fee_rate_msat,
          peer_pubkey_and_opt_addr: body.peer_pubkey_and_opt_addr,
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
    refreshRgbTransfers: builder.query<void, RefreshTransfersRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/refreshtransfers',
      }),
    }),
    restore: builder.query<void, RestoreRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/restore',
      }),
    }),
    rgbInvoice: builder.query<RGBInvoiceResponse, RGBInvoiceRequest>({
      query: (body) => ({
        body: {
          asset_id: body.asset_id,
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
          donation: false,
          min_confirmations: 1,
          recipient_id: body.recipient_id,
          transport_endpoints: [DEFAULT_TRANSPORT_ENDPOINT],
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
          fee_rate: body.fee_rate,
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
    shutdown: builder.query<void, void>({
      query: () => ({
        method: 'POST',
        url: '/shutdown',
      }),
    }),
    sync: builder.query<void, void>({
      query: () => ({
        method: 'POST',
        url: '/sync',
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
          announce_addresses: [],
          announce_alias: '',
          bitcoind_rpc_host: body.bitcoind_rpc_host,
          bitcoind_rpc_password: body.bitcoind_rpc_password,
          bitcoind_rpc_port: body.bitcoind_rpc_port,
          bitcoind_rpc_username: body.bitcoind_rpc_username,
          indexer_url: body.indexer_url,
          password: body.password,
          proxy_endpoint: body.proxy_endpoint,
        },
        method: 'POST',
        url: '/unlock',
      }),
    }),
  }),
  reducerPath: 'nodeApi',
})
