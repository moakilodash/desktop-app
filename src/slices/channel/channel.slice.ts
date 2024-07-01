import {
  PayloadAction,
  createDraftSafeSelector,
  createSlice,
} from '@reduxjs/toolkit'
import * as z from 'zod'

import { RootState } from '../../app/store'
import { MIN_CHANNEL_CAPACITY } from '../../constants'

export const NewChannelFormSchema = z.object({
  capacitySat: z.z.number().min(MIN_CHANNEL_CAPACITY, "Minimum amount is 50000 satoshis").max(100000000, "Maximum amount is 100000000 satoshis"),
  assetAmount: z.z.number().gte(0),
  assetId: z.string(),
  assetTicker: z.string(),
  pubKeyAndAddress: z.string().regex(/^([a-zA-Z0-9]{66})@.+/),
})

export const ChannelRequestFormSchema = z.object({
  capacitySat: z.z.number().min(MIN_CHANNEL_CAPACITY, "Minimum amount is 50000 satoshis").max(100000000, "Maximum amount is 100000000 satoshis"),
  clientBalanceSat: z.z.number().gte(0),
  assetId: z.string(),
  assetAmount: z.z.number().gte(0),
  channelExpireBlocks: z.z.number().gte(0),
})

export type TNewChannelForm = z.infer<typeof NewChannelFormSchema>
export type TChannelRequestForm = z.infer<typeof ChannelRequestFormSchema>

interface SliceState {
  forms: {
    new: TNewChannelForm
    request: TChannelRequestForm
  }
}

const initialState: SliceState = {
  forms: {
    new:
     {
      capacitySat: MIN_CHANNEL_CAPACITY,
      assetAmount: 0,
      assetId: '',
      assetTicker: '',
      pubKeyAndAddress: '',
    },
    request: {
      capacitySat: MIN_CHANNEL_CAPACITY,
      clientBalanceSat: 0,
      assetAmount: 0,
      assetId: '',
      channelExpireBlocks: 1008, // 1 week
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
    setChannelRequestForm: (
      state,
      action: PayloadAction<Partial<SliceState['forms']['request']>>
    ) => {
      state.forms.request = {
        ...state.forms.request,
        ...action.payload,
      }
    }
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
