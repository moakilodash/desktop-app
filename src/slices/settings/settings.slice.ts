import { createSlice } from '@reduxjs/toolkit'

import { RootState } from '../../app/store'

interface SettingsState {
  bitcoinUnit: string
  nodeConnectionString: string
  defaultLspUrl: string
}

const initialState: SettingsState = {
  bitcoinUnit: 'SAT',
  defaultLspUrl: 'http://localhost:8000',
  nodeConnectionString: 'http://localhost:3001',
}

export const settingsSlice = createSlice({
  initialState,
  name: 'settings',
  reducers: {
    setBitcoinUnit(state, action) {
      state.bitcoinUnit = action.payload
    },
    setDefaultLspUrl(state, action) {
      state.defaultLspUrl = action.payload
    },
    setNodeConnectionString(state, action) {
      state.nodeConnectionString = action.payload
    },
  },
})

export const { setBitcoinUnit, setNodeConnectionString, setDefaultLspUrl } =
  settingsSlice.actions
export const selectDefaultLspUrl = (state: RootState) =>
  state.settings.defaultLspUrl
export const settingsReducer = settingsSlice.reducer
