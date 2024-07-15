import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { useSelector } from 'react-redux'

// Data types defined in LSPS0 Common Schemas
type LSPS0Sat = number
type LSPS0Datetime = string
type LSPS0OnchainAddress = string
type LSPS0OnchainFee = number

// Errors
interface LSPS0ErrorHandling {
  code: number
  message: string
  data?: Record<string, any>
}

interface GetAssetsResponse {
  assets: {
    asset_id: string
    ticker: string
    name: string
    precision: number
    issued_supply: number
    timestamp: number
  }[]
}

interface InitSwapRequest {
  asset_id: string
  asset_amount: string
  side: 'Buy' | 'Sell'
}

interface InitSwapResponse {
  swapstring: string
}

interface ExecSwapRequest {
  swapstring: string
  pubkey: string
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

interface Lsps1GetInfoRequest {}

interface Lsps1GetInfoResponse {
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
  client_connection_url: string
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

interface Lsps1CreateOrderResponse {
  order_id: string
  client_connection_url: string
  lsp_balance_sat: LSPS0Sat
  client_balance_sat: LSPS0Sat
  required_channel_confirmations: number
  funding_confirms_within_blocks: number
  channel_expiry_blocks: number
  token: string
  created_at: LSPS0Datetime
  expires_at: LSPS0Datetime
  announce_channel: boolean
  order_state: OrderState
  payment: PaymentInfo
  channel?: string | null
  asset_id?: string
  lsp_asset_amount?: LSPS0Sat
  client_asset_amount?: LSPS0Sat
}

type OrderState = 'CREATED' | 'COMPLETED' | 'FAILED'

interface PaymentInfo {
  state: PaymentState
  fee_total_sat: LSPS0Sat
  order_total_sat: LSPS0Sat
  bolt11_invoice: string
  onchain_address: LSPS0OnchainAddress | null
  min_onchain_payment_confirmations: number | null
  min_fee_for_0conf: LSPS0OnchainFee
  onchain_payment: OnchainPaymentInfo | null
}

type PaymentState = 'EXPECT_PAYMENT' | 'HOLD' | 'PAID' | 'REFUNDED'

interface OnchainPaymentInfo {
  outpoint: string
  sat: LSPS0Sat
  confirmed: boolean
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

    // getassets: builder.query<GetAssetsResponse, void>({
    //   query: () => '/list_assets',
    // }),
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
  }),
  reducerPath: 'makerApi',
})
