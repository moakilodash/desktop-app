import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  BaseDirectory,
  createDir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/api/fs'

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

export type NodeSettings = Account

const initialState: NodeSettingsState = {
  data: {
    datapath: '',
    name: '',
    network: 'regtest',
    node_url: '',
    rpc_connection_url: '',
  },
}

const SETTINGS_FILE = 'node_settings.json'

export const setSettingsAsync = createAsyncThunk(
  'nodeSettings/setSettingsAsync',
  async (settings: Account) => {
    return settings
  }
)

export const readSettings = createAsyncThunk(
  'nodeSettings/readSettings',
  async (): Promise<Account> => {
    try {
      // Ensure the directory exists
      await createDir('', { dir: BaseDirectory.AppConfig, recursive: true })

      // Read the settings file
      const contents = await readTextFile(SETTINGS_FILE, {
        dir: BaseDirectory.AppConfig,
      })
      return JSON.parse(contents) as Account
    } catch (error) {
      console.error('Error reading settings:', error)
      // If the file doesn't exist or there's an error, return default settings
      return {
        datapath: '',
        name: '',
        network: 'regtest',
        node_url: '',
        rpc_connection_url: '',
      }
    }
  }
)

export const writeSettings = createAsyncThunk(
  'nodeSettings/writeSettings',
  async (settings: Account): Promise<Account> => {
    try {
      // Ensure the directory exists
      await createDir('', { dir: BaseDirectory.AppConfig, recursive: true })

      // Write the settings to the file
      await writeTextFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), {
        dir: BaseDirectory.AppConfig,
      })
      return settings
    } catch (error) {
      console.error('Error writing settings:', error)
      throw new Error('Failed to save settings')
    }
  }
)

export const nodeSettingsSlice = createSlice({
  extraReducers: (builder) => {
    builder
      .addCase(setSettingsAsync.fulfilled, (state, action) => {
        state.data = action.payload
      })
      .addCase(readSettings.fulfilled, (state, action) => {
        state.data = action.payload
      })
      .addCase(writeSettings.fulfilled, (state, action) => {
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
