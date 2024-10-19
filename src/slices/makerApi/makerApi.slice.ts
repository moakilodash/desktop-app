import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Data types defined in LSPS0 Common Schemas
type LSPS0Sat = number
type LSPS0Datetime = string
type LSPS0OnchainAddress = string
type LSPS0OnchainFee = number

interface InitSwapRequest {
  rfq_id: string
  from_asset: string
  to_asset: string
  from_amount: number
  to_amount: number
}

interface InitSwapResponse {
  swapstring: string
  payment_hash: string
}

interface ExecSwapRequest {
  swapstring: string
  taker_pubkey: string
  payment_hash: string
}

interface AssetInfo {
  name: string
  ticker: string
  asset_id: string
  precision: number
  min_initial_client_amount: number
  max_initial_client_amount: number
  min_initial_lsp_amount: number
  max_initial_lsp_amount: number
  min_channel_amount: number
  max_channel_amount: number
}

//interface Lsps1GetInfoRequest {}

interface Lsps1GetInfoResponse {
  lsp_connection_url: string
  options: {
    min_required_channel_confirmations: number
    min_funding_confirms_within_blocks: number
    min_onchain_payment_confirmations: number
    supports_zero_channel_reserve: boolean
    min_onchain_payment_size_sat: number
    max_channel_expiry_blocks: number
    min_initial_client_balance_sat: number
    max_initial_client_balance_sat: number
    min_initial_lsp_balance_sat: number
    max_initial_lsp_balance_sat: number
    min_channel_balance_sat: number
    max_channel_balance_sat: number
  }
  assets: Record<string, Record<string, AssetInfo>>
}

// Request and response interfaces for lsps1.create_order
interface Lsps1CreateOrderRequest {
  client_pubkey: string
  lsp_balance_sat: LSPS0Sat
  client_balance_sat: LSPS0Sat
  required_channel_confirmations: number
  funding_confirms_within_blocks: number
  channel_expiry_blocks: number
  token?: string
  refund_onchain_address?: LSPS0OnchainAddress
  announce_channel: boolean
  asset_id?: string
  lsp_asset_amount?: LSPS0Sat
  client_asset_amount?: LSPS0Sat
}

export interface Lsps1CreateOrderResponse {
  order_id: string
  client_pubkey: string
  lsp_balance_sat: LSPS0Sat
  client_balance_sat: LSPS0Sat
  required_channel_confirmations: number
  funding_confirms_within_blocks: number
  channel_expiry_blocks: number
  token: string
  created_at: LSPS0Datetime
  announce_channel: boolean
  order_state: OrderState
  payment: PaymentDetails
  channel?: ChannelDetails | null
  asset_id?: string
  lsp_asset_amount?: LSPS0Sat
  client_asset_amount?: LSPS0Sat
}

type OrderState = 'CREATED' | 'COMPLETED' | 'FAILED'

interface ChannelDetails {
  funded_at?: string
  funding_outpoint?: string
  expires_at?: string
}

type PaymentState = 'EXPECT_PAYMENT' | 'HOLD' | 'PAID' | 'REFUNDED'

interface PaymentDetails {
  bolt11: PaymentBolt11
  onchain: PaymentOnchain
}

interface PaymentBolt11 {
  state: PaymentState
  expires_at: string
  fee_total_sat: number
  order_total_sat: number
  invoice: string
}

interface PaymentOnchain {
  state: PaymentState
  expires_at: string
  fee_total_sat: number
  order_total_sat: number
  address: string
  min_fee_for_0conf: LSPS0OnchainFee
  min_onchain_payment_confirmations: number
  refund_onchain_address?: string
}

// Request and response interfaces for lsps1.get_order
interface Lsps1GetOrderRequest {
  order_id: string
}

interface Lsps1GetOrderResponse extends Lsps1CreateOrderResponse {}

// List trading pairs
export interface TradingPair {
  base_asset: string
  base_asset_id: string
  quote_asset: string
  quote_asset_id: string
  is_active: boolean
  min_order_size: number
  max_order_size: number
  price_precision: number
  quantity_precision: number
}

interface GetPairsResponse {
  pairs: TradingPair[]
}

interface StatusRequest {
  payment_hash: string
}

type SwapStatus = 'Waiting' | 'Pending' | 'Succeeded' | 'Expired' | 'Failed'

interface Swap {
  qty_from: number
  qty_to: number
  from_asset: number
  to_asset: number
  payment_hash: number
  status: SwapStatus
  requested_at: number
  initiated_at: number | undefined
  expires_at: number | undefined
  completed_at: number | undefined
}

interface StatusResponse {
  swap: Swap
}

const dynamicBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const state = api.getState()
  const baseUrl = state.settings.defaultLspUrl || 'http://localhost:8000'
  const rawBaseQuery = fetchBaseQuery({ baseUrl })
  return rawBaseQuery(args, api, extraOptions)
}

export const makerApi = createApi({
  baseQuery: dynamicBaseQuery,
  endpoints: (builder) => ({
    create_order: builder.query<
      Lsps1CreateOrderResponse,
      Lsps1CreateOrderRequest
    >({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/api/v1/lsps1/create_order',
      }),
    }),
    execSwap: builder.query<void, ExecSwapRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/api/v1/swaps/execute',
      }),
    }),
    getPairs: builder.query<GetPairsResponse, void>({
      query: () => '/api/v1/market/pairs',
    }),

    get_info: builder.query<Lsps1GetInfoResponse, void>({
      query: () => '/api/v1/lsps1/get_info',
    }),
    get_order: builder.query<Lsps1GetOrderResponse, Lsps1GetOrderRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/api/v1/lsps1/get_order',
      }),
    }),
    initSwap: builder.query<InitSwapResponse, InitSwapRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/api/v1/swaps/init',
      }),
    }),
    status: builder.query<StatusResponse, StatusRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/api/v1/swaps/status',
      }),
    }),
  }),
  reducerPath: 'makerApi',
})
