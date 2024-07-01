// settingsSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

interface SettingsState {
  bitcoinUnit: string;
  nodeConnectionString: string;
  defaultLspUrl: string;
}

const initialState: SettingsState = {
  bitcoinUnit: "SAT",
  nodeConnectionString: "http://localhost:3001",
  defaultLspUrl: "http://localhost:8000",
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setBitcoinUnit(state, action) {
      state.bitcoinUnit = action.payload;
    },
    setNodeConnectionString(state, action) {
      state.nodeConnectionString = action.payload;
    },
    setDefaultLspUrl(state, action) {
      state.defaultLspUrl = action.payload;
    },
  },
});

export const { setBitcoinUnit, setNodeConnectionString, setDefaultLspUrl } = settingsSlice.actions;
export const selectDefaultLspUrl = (state: RootState) => state.settings.defaultLspUrl;
export default settingsSlice.reducer;
