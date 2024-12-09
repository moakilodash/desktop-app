import { createSlice } from '@reduxjs/toolkit'

interface SettingsState {
  bitcoinUnit: string
  nodeConnectionString: string
}

const initialState: SettingsState = {
  bitcoinUnit: 'SAT',
  nodeConnectionString: 'http://localhost:3001',
}

export const settingsSlice = createSlice({
  initialState,
  name: 'settings',
  reducers: {
    setBitcoinUnit(state, action) {
      state.bitcoinUnit = action.payload
    },
    setNodeConnectionString(state, action) {
      state.nodeConnectionString = action.payload
    },
  },
})

export const { setBitcoinUnit, setNodeConnectionString } = settingsSlice.actions
export const settingsReducer = settingsSlice.reducer
