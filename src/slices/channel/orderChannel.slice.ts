import {
  PayloadAction,
  createDraftSafeSelector,
  createSlice,
} from '@reduxjs/toolkit'
import * as z from 'zod'

import { RootState } from '../../app/store'
import { MIN_CHANNEL_CAPACITY } from '../../constants'

export const OrderChannelFormSchema = z.object({
  assetAmount: z.z.number().gte(0),
  assetId: z.string(),
  capacitySat: z.z
    .number()
    .min(MIN_CHANNEL_CAPACITY, 'Minimum amount is 50000 satoshis')
    .max(100000000, 'Maximum amount is 100000000 satoshis'),
  channelExpireBlocks: z.z.number().gte(0),
  clientBalanceSat: z.z.number().gte(0),
})

export type TChannelRequestForm = z.infer<typeof OrderChannelFormSchema>

interface SliceState {
  forms: {
    request: TChannelRequestForm
  }
}

export const initialState: SliceState = {
  forms: {
    request: {
      assetAmount: 0,
      assetId: '',
      capacitySat: MIN_CHANNEL_CAPACITY,
      channelExpireBlocks: 1008,
      clientBalanceSat: 0, // 1 week
    },
  },
}

export const orderChannelSlice = createSlice({
  initialState,
  name: 'channel',
  reducers: {
    setChannelRequestForm: (
      state,
      action: PayloadAction<Partial<SliceState['forms']['request']>>
    ) => {
      state.forms.request = {
        ...state.forms.request,
        ...action.payload,
      }
    },
  },
})

export const orderChannelSliceActions = {
  ...orderChannelSlice.actions,
}

// Selectors
const selfSelector = (state: { channel: SliceState }) => state.channel
const formSelector = createDraftSafeSelector(
  selfSelector,
  (_state: RootState, formKey: keyof SliceState['forms']) => formKey,
  (state, formKey) => state.forms[formKey]
)
export const orderChannelSliceSelectors = {
  form: formSelector,
}
