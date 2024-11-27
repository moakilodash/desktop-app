import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface NodeState {
  isRunning: boolean
  logs: string[]
  isLoading: boolean
  error: string | null
}

const initialState: NodeState = {
  error: null,
  isLoading: false,
  isRunning: false,
  logs: [],
}

const nodeSlice = createSlice({
  initialState,
  name: 'node',
  reducers: {
    addLog: (state, action: PayloadAction<string>) => {
      state.logs.push(action.payload)
      // Keep only last 100 logs
      if (state.logs.length > 100) {
        state.logs = state.logs.slice(-100)
      }
    },
    clearLogs: (state) => {
      state.logs = []
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setNodeRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload
    },
  },
})

export const { setNodeRunning, addLog, clearLogs, setLoading, setError } =
  nodeSlice.actions
export const nodeReducer = nodeSlice.reducer
