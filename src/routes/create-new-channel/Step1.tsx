import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

import { useAppDispatch } from '../../app/store/hooks'
import { KALEIDOSWAP_LSP_URL } from '../../constants'
import { BitFinexBoxIcon } from '../../icons/BitFinexBox'
import { KaleidoswapBoxIcon } from '../../icons/KaleidoswapBox'
import {
  NewChannelFormSchema,
  channelSliceActions,
} from '../../slices/channel/channel.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { FormError } from './FormError'

interface Props {
  error: string
  onNext: VoidFunction
}

interface FormFields {
  pubKeyAndAddress: string
}

export const Step1 = (props: Props) => {
  const [lspConnectionUrl, setLspConnectionUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [getNetworkInfo] = nodeApi.endpoints.networkInfo.useLazyQuery()

  const form = useForm<FormFields>({
    defaultValues: {
      pubKeyAndAddress: '',
    },
    resolver: zodResolver(
      NewChannelFormSchema.pick({ pubKeyAndAddress: true })
    ),
  })

  const dispatch = useAppDispatch()

  useEffect(() => {
    const fetchLspInfo = async () => {
      setIsLoading(true)
      setError('')
      try {
        const networkInfo = await getNetworkInfo().unwrap()
        let apiUrl = KALEIDOSWAP_LSP_URL

        if (networkInfo.network === 'Regtest') {
          apiUrl = 'https://api.regtest.kaleidoswap.com'
        } else if (networkInfo.network === 'Testnet') {
          apiUrl = 'https://api.testnet.kaleidoswap.com'
        } else if (networkInfo.network === 'Signet') {
          apiUrl = 'https://api.signet.kaleidoswap.com'
        }

        const response = await axios.get(`${apiUrl}/api/v1/lsps1/get_info`)
        setLspConnectionUrl(response.data.lsp_connection_url)
      } catch (err) {
        console.error('Error fetching LSP info:', err)
        setError('Failed to fetch LSP connection information')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLspInfo()
  }, [getNetworkInfo])

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
              placeholder="Paste the node connection URL here: pubkey@host:port"
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
          disabled={isLoading || !lspConnectionUrl}
          onClick={() => {
            if (lspConnectionUrl) {
              dispatch(
                channelSliceActions.setNewChannelForm({
                  pubKeyAndAddress: lspConnectionUrl,
                })
              )
              props.onNext()
            } else {
              setError('LSP connection URL is not available')
            }
          }}
          type="button"
        >
          <KaleidoswapBoxIcon />
        </button>
      </div>

      {isLoading && <p>Loading LSP information...</p>}
      {error && <p className="text-red-500">{error}</p>}

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
