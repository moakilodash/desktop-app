import { PayloadAction, createSlice } from '@reduxjs/toolkit'

import { TradingPair } from '../makerApi/makerApi.slice'

export interface PairFeed {
  buyPrice: number
  id: string
  pair: string
  sellPrice: number
  size: number
  timestamp: string
  markPrice: number
}

export interface PairsState {
  assets: string[]
  feed: Record<string, PairFeed>
  values: TradingPair[]
  ticker: Record<string, number>
  subscribedPairs: string[]
  wsConnected: boolean
}

const initialState: PairsState = {
  assets: [],
  feed: {},
  subscribedPairs: [],
  ticker: {},
  values: [],
  wsConnected: false,
}

export const pairsSlice = createSlice({
  initialState,
  name: 'pairs',
  reducers: {
    setTradingPairs: (state, action: PayloadAction<TradingPair[]>) => {
      state.values = action.payload
      state.assets = [
        ...new Set(action.payload.map((p) => p.base_asset).sort()),
      ]
    },
    setWsConnected: (state, action: PayloadAction<boolean>) => {
      state.wsConnected = action.payload
    },
    subscribeToPair: (state, action: PayloadAction<string>) => {
      if (!state.subscribedPairs.includes(action.payload)) {
        state.subscribedPairs.push(action.payload)
      }
    },
    unsubscribeFromPair: (state, action: PayloadAction<string>) => {
      state.subscribedPairs = state.subscribedPairs.filter(
        (pair) => pair !== action.payload
      )
    },
    updatePrice: (state, action: PayloadAction<PairFeed>) => {
      const { pair, ...values } = action.payload
      state.feed[pair] = {
        ...state.feed[pair],
        ...values,
      }
      state.ticker[pair] = Date.now()
    },
  },
})

export const {
  setTradingPairs,
  updatePrice,
  subscribeToPair,
  unsubscribeFromPair,
  setWsConnected,
} = pairsSlice.actions

export const pairsReducer = pairsSlice.reducer
