import { combineReducers, configureStore } from '@reduxjs/toolkit'

import { channelSlice } from '../../slices/channel/channel.slice'
import { makerApi } from '../../slices/makerApi/makerApi.slice.ts'
import { pairsSlice } from '../../slices/makerApi/pairs.slice.ts'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { uiSlice } from '../../slices/ui/ui.slice'
import { settingsSlice } from '../../slices/settings/settings.slice'
import { WebSocketService } from '../../app/hubs/websocketService';

const rootReducer = combineReducers({
  [nodeApi.reducerPath]: nodeApi.reducer,
  [makerApi.reducerPath]: makerApi.reducer,
  channel: channelSlice.reducer,
  pairs: pairsSlice.reducer,
  settings: settingsSlice.reducer,
  ui: uiSlice.reducer,
})

export const store: any = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(nodeApi.middleware)
      .concat(makerApi.middleware),
  reducer: rootReducer,
})

// Initialize the WebSocket service with the store
WebSocketService.getInstance().initializeStore(store);

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
