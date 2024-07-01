import {
  PayloadAction,
  createAction,
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from '@reduxjs/toolkit'
import { z } from 'zod'

import { RootState } from '../../app/store'
import { WebSocketService } from '../../app/hubs/websocketService';
import { v4 as uuidv4 } from 'uuid';


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

const STARRED_PAIRS_LOCAL_STORAGE_KEY = 'starredPairs'

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
  starred: string[]
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

const getStarredPairs = (): string[] => {
  const localStorageValue = localStorage.getItem(
    STARRED_PAIRS_LOCAL_STORAGE_KEY
  )
  return localStorageValue ? JSON.parse(localStorageValue) : []
}

const initialState: PairsState = {
  assets: [],
  feed: {},
  starred: getStarredPairs(),
  ticker: {},
  values: [],
}

const subscribePair = createAsyncThunk(
  'pairs/subscribe',
  async (payload: { pair: string; size: number }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState
    const pair = getFeedSelector(state, payload.pair)
    const clientId = uuidv4();

    if (pair && pair.size !== payload.size) {
      await thunkAPI.dispatch(unsubscribePair({ pair: payload.pair, size: pair.size }));
    }

    if (!pair || pair.size !== payload.size) {
      wsService.sendMessage('SubscribePairPriceChannel', 
      {
        action: 'subscribe',
        pair: payload.pair,
        size: payload.size,
        clientId: clientId,
      });
      
    }
  }
)

const unsubscribePair = createAsyncThunk(
  'pairs/unsubscribe',
  async (payload: { pair: string; size: number }) => {
    const clientId = uuidv4();
    wsService.sendMessage('UnsubscribePairPriceChannel', 
      {
        action: 'unsubscribe',
        pair: payload.pair,
        size: payload.size,
        clientId: clientId,
      }
    );
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
        subscribePair({ pair: k, size: pair.size })
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
          isDisabled: false,
          maxSize: p.maxSize,
          minSize: p.minSize,
          name: p.name,
        }))
        state.assets = Array.from(
          new Set(
            action.payload.reduce<string[]>(
              (acc, p) => [...acc, p.asset, p.currency],
              []
            )
          )
        )
      })
      .addCase(executionFeedsPriceUpdate, (state, action) => {
        /** If the feed is not in the state, add it
         * else if the feed is in the state, check if the timestamp is more than 1 second old
         **/
        const feed = state.feed[action.payload.pair]

        if (
          !feed ||
          (feed &&
            feed.size !== action.payload.size &&
            feed.pair !== action.payload.pair)
        ) {
          state.feed[action.payload.pair] = {
            buyPrice: action.payload.buyPrice,
            id: action.payload.id,
            markPrice: action.payload.markPrice,
            pair: action.payload.pair,
            sellPrice: action.payload.sellPrice,
            size: action.payload.size,
            timestamp: action.payload.timestamp,
          }
        } else {
          const lastFeedTimestamp = new Date(feed.timestamp).getTime()

          if (
            new Date(action.payload.timestamp).getTime() - lastFeedTimestamp >=
            1000
          ) {
            state.feed[action.payload.pair] = {
              buyPrice: action.payload.buyPrice,
              id: action.payload.id,
              markPrice: action.payload.markPrice,
              pair: action.payload.pair,
              sellPrice: action.payload.sellPrice,
              size: action.payload.size,
              timestamp: action.payload.timestamp,
            }
          }
        }
      })
  },
  initialState,
  name: 'pairs',
  reducers: {
    toggleStarred: (state, action) => {
      const pair = action.payload
      const isStarred = state.starred.includes(pair)
      if (isStarred) {
        state.starred = state.starred.filter((p) => p !== pair)
      } else {
        state.starred.push(pair)
      }
      localStorage.setItem(
        STARRED_PAIRS_LOCAL_STORAGE_KEY,
        JSON.stringify(state.starred)
      )
    },
    updatePrice: (state, action: PayloadAction<PairFeed>) => {
      const { pair, ...priceData } = action.payload;
      console.log('updatePrice', pair, priceData);
      state.feed[pair] = { ...state.feed[pair], ...priceData };
    },
  },
})

// Selectors
type State = { pairs: PairsState }

const selfSelector = (state: State) => state.pairs
const starredSelector = (state: State) => state.pairs?.starred

const pairSelector = (_state: { pairs: PairsState }, pair: string) => pair
const getFeedSelector = createDraftSafeSelector(
  [selfSelector, pairSelector, starredSelector],
  (state, pair, starred) => {
    const pairFeed = state?.feed[pair]
    return pairFeed
      ? { ...pairFeed, isStarred: starred.includes(pair) }
      : undefined
  }
)

const activeFeedsSelector = createDraftSafeSelector([selfSelector], (state) =>
  Object.keys(state.feed)
)

export const pairsSliceSelectors = {
  getFeed: getFeedSelector,
}

// Actions
export const pairsSliceActions = {
  ...pairsSlice.actions,
  resubscribeAll,
  subscribePair,
  unsubscribePair,
  updatePrice: createAction<PairFeed>('pairs/updatePrice'),
}
