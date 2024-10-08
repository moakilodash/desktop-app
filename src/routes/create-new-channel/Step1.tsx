import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'


import { useAppDispatch } from '../../app/store/hooks'
import { BitFinexBoxIcon } from '../../icons/BitFinexBox'
import { KaleidoswapBoxIcon } from '../../icons/KaleidoswapBox'
import {
  NewChannelFormSchema,
  channelSliceActions,
} from '../../slices/channel/channel.slice'
import { selectNodeInfo } from '../../slices/nodeApi/nodeApi.slice'

import { FormError } from './FormError'

const KALEIDOSWAP_SIGNET_CONNECTION_URL =
  '036cc53caf12741ca006d63121301b580659dbb6e0101f8b981cfc4496e21097ff@kaleidoswap.com'

interface Props {
  error: string
  onNext: VoidFunction
}

interface FormFields {
  pubKeyAndAddress: string
}

export const Step1 = (props: Props) => {
  const form = useForm<FormFields>({
    defaultValues: {
      pubKeyAndAddress: '',
    },
    resolver: zodResolver(
      NewChannelFormSchema.pick({ pubKeyAndAddress: true })
    ),
  })

  const dispatch = useAppDispatch()

  const onSubmit: SubmitHandler<FormFields> = (data) => {
    dispatch(channelSliceActions.setNewChannelForm(data))
    props.onNext()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="text-center mb-10">
        <h3 className="text-2xl font-semibold mb-4">Open a Channel - Step 1</h3>

        <p>
          Open channels to other nodes on the network to start using the
          Lightning Network.
        </p>
      </div>

      <Controller
        control={form.control}
        name="pubKeyAndAddress"
        render={({ field }) => (
          <>
            <input
              className="px-6 py-4 w-full border border-divider bg-blue-dark outline-none rounded"
              placeholder="Paste the Public Key Here"
              type="text"
              {...field}
            />
            <p className="text-sm text-red mt-2">
              {form.formState.errors.pubKeyAndAddress?.message}
            </p>
          </>
        )}
      />

      <div className="text-center py-6 font-medium text-grey-light">or</div>

      <div className="mb-6 text-center font-medium">
        Select from Suggested Nodes
      </div>

      <div className="flex justify-center space-x-6">
        <button
          className="flex items-center space-x-2 opacity-50 cursor-not-allowed"
          disabled
        >
          <BitFinexBoxIcon />
        </button>
        <button
          className="flex items-center space-x-2"
          onClick={() => {
            dispatch(
              channelSliceActions.setNewChannelForm({
                pubKeyAndAddress: KALEIDOSWAP_SIGNET_CONNECTION_URL,
              })
            )
            props.onNext()
          }}
          type="button"
        >
          <KaleidoswapBoxIcon />
        </button>
      </div>

      <div className="flex justify-end mt-20">
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan"
          type="submit"
        >
          Next
        </button>
      </div>

      {!form.formState.isSubmitSuccessful && form.formState.isSubmitted ? (
        <FormError />
      ) : null}
    </form>
  )
}
