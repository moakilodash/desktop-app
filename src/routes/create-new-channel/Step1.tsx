import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

import { useAppDispatch } from '../../app/store/hooks'
import { Spinner } from '../../components/Spinner'
import { NETWORK_DEFAULTS } from '../../constants/networks'
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
  const [showConnectionDialog, setShowConnectionDialog] = useState(false)
  const [selectedPeerInfo, setSelectedPeerInfo] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)

  const [getNetworkInfo] = nodeApi.endpoints.networkInfo.useLazyQuery()
  const [connectPeer] = nodeApi.endpoints.connectPeer.useMutation()
  const [listPeers] = nodeApi.endpoints.listPeers.useLazyQuery()

  const form = useForm<FormFields>({
    defaultValues: {
      pubKeyAndAddress: '',
    },
    resolver: zodResolver(
      NewChannelFormSchema.pick({ pubKeyAndAddress: true })
    ),
  })

  const dispatch = useAppDispatch()

  const fetchLspInfo = async () => {
    setIsLoading(true)
    setError('')
    try {
      const networkInfo = await getNetworkInfo().unwrap()
      const apiUrl =
        NETWORK_DEFAULTS[networkInfo.network.toLowerCase()].default_lsp_url
      const response = await axios.get(`${apiUrl}api/v1/lsps1/get_info`)
      const connectionUrl = response.data.lsp_connection_url
      setLspConnectionUrl(connectionUrl)
      console.log('lspConnectionUrl', lspConnectionUrl)
      form.setValue('pubKeyAndAddress', connectionUrl)
    } catch (err) {
      console.error('Error fetching LSP info:', err)
      setError('Failed to fetch LSP connection information')
    } finally {
      setIsLoading(false)
    }
  }

  const checkPeerConnection = async (peerInfo: string) => {
    try {
      const peers = await listPeers().unwrap()
      const [pubkey] = peerInfo.split('@')
      return peers.peers.some((peer) => peer.pubkey === pubkey)
    } catch (error) {
      console.error('Error checking peer connection:', error)
      return false
    }
  }

  const handleConnect = async () => {
    if (!selectedPeerInfo) return

    setIsConnecting(true)
    try {
      await connectPeer({ pubkey_and_addr: selectedPeerInfo }).unwrap()
      dispatch(
        channelSliceActions.setNewChannelForm({
          pubKeyAndAddress: selectedPeerInfo,
        })
      )
      props.onNext()
    } catch (err) {
      console.error('Failed to connect to peer:', err)
      setError('Failed to connect to peer. Please try again.')
    } finally {
      setIsConnecting(false)
      setShowConnectionDialog(false)
    }
  }

  const handlePeerSelection = async (peerInfo: string) => {
    setSelectedPeerInfo(peerInfo)
    const isConnected = await checkPeerConnection(peerInfo)

    if (!isConnected) {
      setShowConnectionDialog(true)
    } else {
      dispatch(
        channelSliceActions.setNewChannelForm({ pubKeyAndAddress: peerInfo })
      )
      props.onNext()
    }
  }

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    await handlePeerSelection(data.pubKeyAndAddress)
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
          <div className="space-y-2">
            <textarea
              className="px-6 py-4 w-full border border-divider bg-blue-dark outline-none rounded font-mono text-sm break-all resize-none min-h-[6rem]"
              placeholder="Paste the node connection URL here: pubkey@host:port"
              {...field}
            />
            <p className="text-sm text-red">
              {form.formState.errors.pubKeyAndAddress?.message}
            </p>
          </div>
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
          disabled={isLoading}
          onClick={fetchLspInfo}
          type="button"
        >
          <KaleidoswapBoxIcon />
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center mt-4">
          <Spinner size={24} />
          <span className="ml-2">Loading LSP information...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded mt-4">
          {error}
        </div>
      )}

      <div className="flex justify-end mt-20">
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan"
          type="submit"
        >
          Next
        </button>
      </div>

      {/* Connection Dialog */}
      {showConnectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-blue-dark border border-divider rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Connect to Peer</h3>
            <p className="mb-6">
              Would you like to connect to this peer before opening a channel?
            </p>

            {isConnecting && (
              <div className="flex items-center justify-center mb-4">
                <Spinner size={24} />
                <span className="ml-2">Connecting to peer...</span>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 rounded border border-divider hover:bg-opacity-80"
                onClick={() => setShowConnectionDialog(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-purple text-white hover:bg-opacity-80"
                disabled={isConnecting}
                onClick={handleConnect}
                type="button"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {!form.formState.isSubmitSuccessful && form.formState.isSubmitted ? (
        <FormError />
      ) : null}
    </form>
  )
}
