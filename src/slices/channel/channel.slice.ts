import {
  PayloadAction,
  createDraftSafeSelector,
  createSlice,
} from '@reduxjs/toolkit'
import * as z from 'zod'

import { RootState } from '../../app/store'
import { MIN_CHANNEL_CAPACITY } from '../../constants'

export const NewChannelFormSchema = z.object({
  assetAmount: z.z.number().gte(0),
  assetId: z.string(),
  assetTicker: z.string(),
  capacitySat: z.z
    .number()
    .min(MIN_CHANNEL_CAPACITY, 'Minimum amount is 50000 satoshis')
    .max(100000000, 'Maximum amount is 100000000 satoshis'),
  fee: z.enum(['slow', 'medium', 'fast']),
  pubKeyAndAddress: z.string().regex(/^([a-zA-Z0-9]{66})@.+/),
})

export type TNewChannelForm = z.infer<typeof NewChannelFormSchema>

interface SliceState {
  forms: {
    new: TNewChannelForm
  }
}

export const initialState: SliceState = {
  forms: {
    new: {
      assetAmount: 0,
      assetId: '',
      assetTicker: '',
      capacitySat: MIN_CHANNEL_CAPACITY,
      fee: 'medium',
      pubKeyAndAddress: '', // Default to medium
    },
  },
}

export const channelSlice = createSlice({
  initialState,
  name: 'channel',
  reducers: {
    setNewChannelForm: (
      state,
      action: PayloadAction<Partial<SliceState['forms']['new']>>
    ) => {
      state.forms.new = {
        ...state.forms.new,
        ...action.payload,
      }
    },
  },
})

export const channelSliceActions = {
  ...channelSlice.actions,
}

// Selectors
const selfSelector = (state: { channel: SliceState }) => state.channel
const formSelector = createDraftSafeSelector(
  selfSelector,
  (_state: RootState, formKey: keyof SliceState['forms']) => formKey,
  (state, formKey) => state.forms[formKey]
)
export const channelSliceSelectors = {
  form: formSelector,
}
