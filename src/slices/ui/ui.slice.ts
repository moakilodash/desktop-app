import {
  PayloadAction,
  createDraftSafeSelector,
  createSlice,
} from '@reduxjs/toolkit'

export type DepositModal = {
  assetId: string | undefined
  type: 'deposit'
}

export type WithdrawModal = {
  assetId: string | undefined
  type: 'withdraw'
}
type Modal =
  | DepositModal
  | WithdrawModal
  | {
      type: 'none'
    }

interface SliceState {
  modal: Modal
}

const initialState: SliceState = {
  modal: {
    type: 'none',
  },
}

export const uiSlice = createSlice({
  initialState,
  name: 'ui',
  reducers: {
    setModal: (state, action: PayloadAction<Modal>) => {
      state.modal = action.payload
    },
  },
})

export const uiSliceActions = {
  ...uiSlice.actions,
}

// Selectors
const selfSelector = (state: { ui: SliceState }) => state.ui
const modalSelector = createDraftSafeSelector(
  selfSelector,
  (state) => state.modal
)

export const uiSliceSeletors = {
  modal: modalSelector,
}
