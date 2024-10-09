import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

export type Account = {
  name: string
  datapath: string
  network: 'regtest' | 'testnet' | 'mainnet'
  rpc_connection_url: string
  node_url: string
}

export interface NodeSettingsState {
  data: Account
}

const initialState: NodeSettingsState = {
  data: {
    datapath: '',
    name: '',
    network: 'regtest',
    node_url: '',
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
