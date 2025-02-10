import { z } from 'zod'

import { MIN_CHANNEL_CAPACITY } from '../../constants'

export const NewChannelFormSchema = z.object({
  assetAmount: z.number().gte(0),
  assetId: z.string().optional(),
  assetTicker: z.string().optional(),
  capacitySat: z
    .number()
    .min(MIN_CHANNEL_CAPACITY, 'Minimum amount is 50000 satoshis')
    .max(100000000, 'Maximum amount is 100000000 satoshis'),
  fee: z.enum(['slow', 'medium', 'fast']),
  pubKeyAndAddress: z
    .string()
    .regex(
      /^([0-9a-fA-F]{66})@([^\s]+):(\d+)$/,
      'Invalid format. Expected format: <66-char-hex-pubkey>@<host>:<port>'
    ),
})

export type TNewChannelForm = z.infer<typeof NewChannelFormSchema>
