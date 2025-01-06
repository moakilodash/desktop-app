import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { BitcoinNetwork } from '../../constants'

export interface Account {
  datapath: string
  default_lsp_url: string
  default_maker_url: string
  indexer_url: string
  maker_urls: string[]
  name: string
  network: BitcoinNetwork
  node_url: string
  proxy_endpoint: string
  rpc_connection_url: string
}

export interface NodeSettingsState {
  data: Account
}

export type NodeSettings = Account

const initialState: NodeSettingsState = {
  data: {
    datapath: '',
    default_lsp_url: '',
    default_maker_url: '',
    indexer_url: '',
    maker_urls: [],
    name: '',
    network: 'Regtest',
    node_url: '',
    proxy_endpoint: '',
    rpc_connection_url: '',
  },
}

export const setSettingsAsync = createAsyncThunk(
  'nodeSettings/setSettingsAsync',
  async (settings: Account) => {
    return settings
  }
)
export const nodeSettingsSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(setSettingsAsync.fulfilled, (state, action) => {
      state.data = action.payload
    })
  },
  initialState,
  name: 'nodeSettings',
  reducers: {
    resetNodeSettings: (state) => {
      state.data = initialState.data
    },
    setNodeSettings: (state, action) => {
      state.data = action.payload
    },
  },
})

export const nodeSettingsReducer = nodeSettingsSlice.reducer

export const nodeSettingsActions = {
  ...nodeSettingsSlice.actions,
}
