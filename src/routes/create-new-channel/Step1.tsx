import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

import { Spinner } from '../../components/Spinner'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import { KaleidoswapBoxIcon } from '../../icons/KaleidoswapBox'
import {
  NewChannelFormSchema,
  TNewChannelForm,
} from '../../slices/channel/channel.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface Props {
  onNext: VoidFunction
  formData: TNewChannelForm
  onFormUpdate: (updates: Partial<TNewChannelForm>) => void
}

interface FormFields {
  pubKeyAndAddress: string
}

const isValidPubkeyAndAddress = (value: string): boolean => {
  // Check basic format: pubkey@host:port
  const parts = value.split('@')
  if (parts.length !== 2) return false

  const [pubkey, hostAndPort] = parts

  // Validate pubkey: 66 characters hex string
  const pubkeyRegex = /^[0-9a-fA-F]{66}$/
  if (!pubkeyRegex.test(pubkey)) return false

  // Validate host:port format
  const hostPortParts = hostAndPort.split(':')
  if (hostPortParts.length !== 2) return false

  const [host, port] = hostPortParts

  // Basic host validation
  if (!host || host.length < 1) return false

  // Port should be a number between 1-65535
  const portNum = parseInt(port, 10)
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) return false

  return true
}

export const Step1 = ({ onNext, formData, onFormUpdate }: Props) => {
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [showConnectionDialog, setShowConnectionDialog] = useState(false)
  const [selectedPeerInfo, setSelectedPeerInfo] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [getNetworkInfo] = nodeApi.endpoints.networkInfo.useLazyQuery()
  const [connectPeer] = nodeApi.endpoints.connectPeer.useMutation()
  const [listPeers] = nodeApi.endpoints.listPeers.useLazyQuery()

  const { handleSubmit, control, formState, clearErrors, setValue } =
    useForm<FormFields>({
      defaultValues: {
        pubKeyAndAddress: formData.pubKeyAndAddress || '',
      },
      mode: 'onChange',
      resolver: zodResolver(
        NewChannelFormSchema.pick({ pubKeyAndAddress: true }).refine(
          (data) => isValidPubkeyAndAddress(data.pubKeyAndAddress),
          {
            message:
              'Invalid peer format. Expected: <66-char-hex-pubkey>@hostname:port',
            path: ['pubKeyAndAddress'],
          }
        )
      ),
    })

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    // Clear any previous errors
    setLocalError('')

    if (!isValidPubkeyAndAddress(data.pubKeyAndAddress)) {
      setLocalError(
        'Invalid peer format. Expected format: <66-char-hex-pubkey>@hostname:port'
      )
      return
    }

    // First update the form data
    onFormUpdate({
      pubKeyAndAddress: data.pubKeyAndAddress,
    })

    // Then check connection
    const isConnected = await checkPeerConnection(data.pubKeyAndAddress)

    if (!isConnected) {
      setSelectedPeerInfo(data.pubKeyAndAddress)
      setShowConnectionDialog(true)
      return
    }

    // If already connected, proceed to next step
    onNext()
  }

  const fetchLspInfo = async () => {
    setIsLoading(true)
    setLocalError('')
    try {
      const networkInfo = await getNetworkInfo().unwrap()

      if (!networkInfo?.network) {
        throw new Error('Network information not available')
      }

      // Normalize network name to match NETWORK_DEFAULTS keys
      const network = networkInfo.network
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())

      if (!NETWORK_DEFAULTS[network]) {
        throw new Error(`Unsupported network: ${networkInfo.network}`)
      }

      const apiUrl = NETWORK_DEFAULTS[network].default_lsp_url
      if (!apiUrl) {
        throw new Error(`No default LSP URL configured for network: ${network}`)
      }

      const response = await axios.get(`${apiUrl}api/v1/lsps1/get_info`)
      const connectionUrl = response.data.lsp_connection_url

      // Update both form state and form data
      setValue('pubKeyAndAddress', connectionUrl)
      onFormUpdate({
        pubKeyAndAddress: connectionUrl,
      })

      // Check if we need to connect
      const isConnected = await checkPeerConnection(connectionUrl)
      if (!isConnected) {
        setSelectedPeerInfo(connectionUrl)
        setShowConnectionDialog(true)
      } else {
        onNext()
      }
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch LSP connection information'
      )
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
      return false
    }
  }

  const handleConnect = async () => {
    if (!selectedPeerInfo || !isValidPubkeyAndAddress(selectedPeerInfo)) {
      setLocalError('Invalid peer connection string')
      return
    }

    setIsConnecting(true)
    try {
      await connectPeer({ peer_pubkey_and_addr: selectedPeerInfo }).unwrap()

      // Update form data and proceed
      onFormUpdate({
        pubKeyAndAddress: selectedPeerInfo,
      })
      setValue('pubKeyAndAddress', selectedPeerInfo)
      setShowConnectionDialog(false)
      onNext()
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : 'Failed to connect to peer. Please try again.'
      )
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="text-center mb-10">
        <h3 className="text-3xl font-bold text-white mb-4">
          Open a Channel - Step 1
        </h3>
        <p className="text-gray-400">
          Open channels to other nodes on the network to start using the
          Lightning Network.
        </p>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
        <Controller
          control={control}
          name="pubKeyAndAddress"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <textarea
                className={`w-full px-4 py-3 bg-gray-700 text-white rounded-lg border 
                  ${
                    fieldState.error || localError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-600 focus:border-blue-500'
                  } 
                  focus:ring-1 focus:ring-blue-500 font-mono text-sm min-h-[6rem] resize-none`}
                placeholder="Example: 039257e0669aa5dea5df7c971048699a39f9023333d550a90800b9412f231ee8e7@lsp.signet.kaleidoswap.com:9735"
                {...field}
                onChange={(e) => {
                  field.onChange(e)
                  if (formState.errors.pubKeyAndAddress) {
                    clearErrors('pubKeyAndAddress')
                  }
                  if (localError) {
                    setLocalError('')
                  }
                  // Update form data as user types
                  onFormUpdate({
                    pubKeyAndAddress: e.target.value,
                  })
                }}
              />
              {(fieldState.error || localError) && (
                <p className="text-red-500 text-sm">
                  {localError || fieldState.error?.message}
                </p>
              )}
              <p className="text-gray-400 text-xs">
                The connection string should be a 66-character hex public key,
                followed by @ symbol, then the host address, and port number
                (e.g. :9735)
              </p>
            </div>
          )}
        />

        <div className="text-center py-6 font-medium text-gray-400">or</div>

        <div className="mb-6 text-center font-medium text-white">
          Select from Suggested Nodes
        </div>

        <div className="flex justify-center space-x-6">
          <button
            className="flex items-center space-x-2 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            disabled={isLoading}
            onClick={fetchLspInfo}
            type="button"
          >
            <KaleidoswapBoxIcon />
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center mt-4">
            <Spinner color="#3B82F6" size={24} />
            <span className="ml-2 text-gray-400">
              Loading LSP information...
            </span>
          </div>
        )}

        {localError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {localError}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-8">
        <button
          className="px-8 py-3 rounded-lg text-lg font-bold text-white
            bg-blue-600 hover:bg-blue-700
            transform transition-all duration-200
            focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            shadow-lg hover:shadow-xl
            flex items-center"
          disabled={!formState.isValid}
          type="submit"
        >
          Next
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      </div>

      {/* Connection Dialog */}
      {showConnectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700/50 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-4">
              Connect to Peer
            </h3>
            <p className="text-gray-400 mb-6">
              Would you like to connect to this peer before opening a channel?
            </p>

            {isConnecting && (
              <div className="flex items-center justify-center mb-4">
                <Spinner color="#3B82F6" size={24} />
                <span className="ml-2 text-gray-400">
                  Connecting to peer...
                </span>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                className="px-6 py-2 rounded-lg font-medium
                  bg-gray-700 hover:bg-gray-600 text-gray-300
                  transform transition-all duration-200
                  focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                onClick={() => setShowConnectionDialog(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 rounded-lg font-medium text-white
                  bg-blue-600 hover:bg-blue-700
                  transform transition-all duration-200
                  focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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
    </form>
  )
}
