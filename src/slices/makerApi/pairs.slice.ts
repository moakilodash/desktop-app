import {
  PayloadAction,
  createAction,
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

import { WebSocketService } from '../../app/hubs/websocketService'
import { RootState } from '../../app/store'

// Initialize the WebSocket service
const wsService = WebSocketService.getInstance()

const jsonFromString = z.string().transform((s) => JSON.parse(s))

export const EXECUTION_PAIRS_SUBJECT = z.literal('execution.pairs')
export const ExecutionPairs = z.object({
  data: jsonFromString.pipe(
    z.array(
      z.object({
        asset: z.string(),
        currency: z.string(),
        maxSize: z.number(),
        minSize: z.number(),
        name: z.string(),
      })
    )
  ),
  subject: EXECUTION_PAIRS_SUBJECT,
})
export type TExecutionPairs = z.infer<typeof ExecutionPairs>

export const EXECUTION_FEEDS_PRICE_UPDATE = z.literal(
  'execution.feeds.priceUpdate'
)
export const ExecutionFeedsPriceUpdate = z.object({
  data: jsonFromString.pipe(
    z.object({
      buyPrice: z.number(),
      id: z.string(),
      markPrice: z.number(),
      pair: z.string(),
      sellPrice: z.number(),
      size: z.number(),
      timestamp: z.string().datetime(),
    })
  ),
  subject: EXECUTION_FEEDS_PRICE_UPDATE,
})
export type TExecutionFeedsPriceUpdate = z.infer<
  typeof ExecutionFeedsPriceUpdate
>

export interface PairFeed {
  buyPrice: number
  id: string
  pair: string
  sellPrice: number
  size: number
  timestamp: string
  markPrice: number
}

export type PairsState = {
  assets: string[]
  feed: Record<string, PairFeed>
  values: {
    asset: string
    currency: string
    isDisabled: boolean
    maxSize: number
    minSize: number
    name: string
  }[]
  ticker: Record<string, number>
}

const initialState: PairsState = {
  assets: [],
  feed: {},
  ticker: {},
  values: [],
}

const subscribePair = createAsyncThunk(
  'pairs/subscribe',
  async (payload: { pair: string; size: number }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState
    const pair = getFeedSelector(state, payload.pair)
    const clientId = uuidv4()

    if (pair && pair.size !== payload.size) {
      await thunkAPI.dispatch(
        unsubscribePair({ pair: payload.pair, size: pair.size })
      )
    }

    if (!pair || pair.size !== payload.size) {
      wsService.sendMessage('SubscribePairPriceChannel', {
        action: 'subscribe',
        clientId: clientId,
        pair: payload.pair,
        size: payload.size,
      })
    }
  }
)

const unsubscribePair = createAsyncThunk(
  'pairs/unsubscribe',
  async (payload: { pair: string; size: number }) => {
    const clientId = uuidv4()
    wsService.sendMessage('UnsubscribePairPriceChannel', {
      action: 'unsubscribe',
      clientId: clientId,
      pair: payload.pair,
      size: payload.size,
    })
  }
)

const resubscribeAll = createAsyncThunk(
  'pairs/resubscribeAll',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState() as RootState
    const activeFeedKeys = activeFeedsSelector(state)

    activeFeedKeys.forEach((k) => {
      const pair = getFeedSelector(state, k)
      if (pair) {
        thunkAPI.dispatch(subscribePair({ pair: k, size: pair.size }))
      }
    })
  }
)

const executionPairs = createAction<TExecutionPairs['data']>(
  EXECUTION_PAIRS_SUBJECT.value
)
const executionFeedsPriceUpdate = createAction<
  TExecutionFeedsPriceUpdate['data']
>(EXECUTION_FEEDS_PRICE_UPDATE.value)

// Slice
export const pairsSlice = createSlice({
  extraReducers: (builder) => {
    builder
      .addCase(executionPairs, (state, action) => {
        state.values = action.payload.map((p) => ({
          asset: p.asset,
          currency: p.currency,
          isDisabled: p.maxSize <= 0,
          maxSize: p.maxSize,
          minSize: p.minSize,
          name: p.name,
        }))
        state.assets = [...new Set(action.payload.map((p) => p.asset).sort())]
      })
      .addCase(executionFeedsPriceUpdate, (state, action) => {
        const { id, pair, size, ...otherValues } = action.payload

        state.feed[pair] = {
          id,
          pair,
          size,
          ...otherValues,
        }
        state.ticker[pair] = Date.now()
      })
  },
  initialState,
  name: 'pairs',
  reducers: {
    updatePrice: (state, action: PayloadAction<PairFeed>) => {
      const { pair, ...values } = action.payload
      if (state.feed[pair]) {
        state.feed[pair] = {
          ...state.feed[pair],
          ...values,
        }
      }
    },
  },
})

export const pairsSliceActions = {
  ...pairsSlice.actions,
  executionFeedsPriceUpdate,
  executionPairs,
  resubscribeAll,
  subscribePair,
  unsubscribePair,
}

// Selectors
export const getValuesSelector = (state: RootState): PairsState['values'] =>
  state.pairs.values

export const activeFeedsSelector = createDraftSafeSelector(
  (state: RootState) => state.pairs.feed,
  (feed) =>
    Object.keys(feed).filter((k) => {
      const f = feed[k]
      return f.size > 0
    })
)

export const getFeedSelector = createDraftSafeSelector(
  (state: RootState) => state.pairs.feed,
  (_state: RootState, pair: string) => pair,
  (feed, pair) => feed[pair]
)

// Export all selectors
export const pairsSliceSelectors = {
  activeFeedsSelector,
  getFeed: getFeedSelector,
  getValuesSelector,
}

export const pairsReducer = pairsSlice.reducer
