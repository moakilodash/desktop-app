import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { invoke } from '@tauri-apps/api'

export const readSettings = createAsyncThunk(
  'nodeSettings/readSettings',
  async () => {
    return (await invoke('get_config')) as NodeSettings
  }
)

export const writeSettings = createAsyncThunk(
  'nodeSettings/writeSettings',
  async (settings: NodeSettings) => {
    return await invoke('write_config', { config: settings })
  }
)

export type Account = {
  name: string
  datapath: string
}

export type NodeSettings = {
  network: 'regtest' | 'testnet' | 'signet' | 'mainnet'
  datapath: string
  rpc_connection_url: string
  accounts: Account[]
}

export interface NodeSettingsState {
  data: NodeSettings
  isLoading: boolean
}

const initialState: NodeSettingsState = {
  data: {
    accounts: [],
    datapath: '../bin/dataldk',
    network: 'regtest',
    rpc_connection_url: 'user:password@localhost:18443',
  },
  isLoading: false,
}

export const nodeSettingsSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(readSettings.fulfilled, (state, action) => {
      state.data = action.payload
      state.isLoading = false
    })
    builder.addCase(readSettings.pending, (state) => {
      state.isLoading = true
    })
    builder.addCase(readSettings.rejected, (state) => {
      state.isLoading = false
    })
    builder.addCase(writeSettings.fulfilled, (state, action) => {
      state.data = action.meta.arg
      state.isLoading = false
    })
    builder.addCase(writeSettings.pending, (state) => {
      state.isLoading = true
    })
    builder.addCase(writeSettings.rejected, (state) => {
      state.isLoading = false
    })
  },
  initialState,
  name: 'nodeSettings',
  reducers: {},
})

export const nodeSettingsReducer = nodeSettingsSlice.reducer
