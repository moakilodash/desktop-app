import { combineReducers, configureStore } from '@reduxjs/toolkit'

import { channelSlice } from '../../slices/channel/channel.slice'
import { makerApi } from '../../slices/makerApi/makerApi.slice.ts'
import { pairsSlice } from '../../slices/makerApi/pairs.slice.ts'
import { nodeReducer } from '../../slices/node/node.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { nodeSettingsSlice } from '../../slices/nodeSettings/nodeSettings.slice.ts'
import { settingsSlice } from '../../slices/settings/settings.slice'
import { uiSlice } from '../../slices/ui/ui.slice'

const rootReducer = combineReducers({
  [nodeApi.reducerPath]: nodeApi.reducer,
  [makerApi.reducerPath]: makerApi.reducer,
  channel: channelSlice.reducer,
  node: nodeReducer,
  nodeSettings: nodeSettingsSlice.reducer,
  pairs: pairsSlice.reducer,
  settings: settingsSlice.reducer,
  ui: uiSlice.reducer,
})

export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(nodeApi.middleware)
      .concat(makerApi.middleware),
  reducer: rootReducer,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
