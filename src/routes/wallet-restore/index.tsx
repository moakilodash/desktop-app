import { invoke } from '@tauri-apps/api'
import { open } from '@tauri-apps/api/dialog'
import { ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import { BitcoinNetwork } from '../../constants'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import { EyeIcon } from '../../icons/Eye'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { setSettingsAsync } from '../../slices/nodeSettings/nodeSettings.slice'

interface Fields {
  name: string
  network: BitcoinNetwork
  rpc_connection_url: string
  backup_path: string
  password: string
  indexer_url: string
  proxy_endpoint: string
  daemon_listening_port: string
  ldk_peer_listening_port: string
}

export const Component = () => {
  const [isStartingNode, setIsStartingNode] = useState<boolean>(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [additionalErrors] = useState<Array<string>>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errorDetails, setErrorDetails] = useState('')

  const [restore, restoreResponse] = nodeApi.endpoints.restore.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const form = useForm<Fields>({
    defaultValues: {
      backup_path: '',
      name: 'Restored Account',
      network: 'regtest',
      password: '',
      ...NETWORK_DEFAULTS['regtest'],
    },
  })

  const network = form.watch('network')

  useEffect(() => {
    const defaults = NETWORK_DEFAULTS[network]
    form.setValue('rpc_connection_url', defaults.rpc_connection_url)
    form.setValue('indexer_url', defaults.indexer_url)
    form.setValue('proxy_endpoint', defaults.proxy_endpoint)
    form.setValue('daemon_listening_port', defaults.daemon_listening_port)
    form.setValue('ldk_peer_listening_port', defaults.ldk_peer_listening_port)
  }, [network, form])

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    if (isStartingNode) return

    let nodeInfoRes = await nodeInfo()
    if (nodeInfoRes.isSuccess) {
      navigate(TRADE_PATH)
      return
    }

    try {
      const formattedName = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const datapath = `kaleidoswap-${formattedName}`

      const accountExists = await invoke('check_account_exists', {
        name: data.name,
      })
      if (accountExists) {
        setErrorMessage('Account Already Exists')
        setErrorDetails(
          'An account with this name already exists. Please choose a different name.'
        )
        setShowErrorModal(true)
        return
      }

      setIsStartingNode(true)
      console.log('Starting node...')

      try {
        const defaultMakerUrl = NETWORK_DEFAULTS[data.network].default_maker_url
        await dispatch(
          setSettingsAsync({
            datapath: datapath,
            default_lsp_url: NETWORK_DEFAULTS[data.network].default_lsp_url,
            default_maker_url: defaultMakerUrl,
            indexer_url: data.indexer_url,
            maker_urls: [defaultMakerUrl],
            name: data.name,
            network: data.network,
            node_url: `http://localhost:${data.daemon_listening_port}`,
            proxy_endpoint: data.proxy_endpoint,
            rpc_connection_url: data.rpc_connection_url,
          })
        )

        await invoke('start_node', {
          daemonListeningPort: data.daemon_listening_port,
          datapath: datapath,
          ldkPeerListeningPort: data.ldk_peer_listening_port,
          network: data.network,
        })

        // Wait for node to be ready
        // TODO: Check if the node is ready
        await new Promise((resolve) => setTimeout(resolve, 5000))

        const restoreResponse = await restore({
          backup_path: data.backup_path,
          password: data.password,
        })

        if (restoreResponse.isSuccess) {
          await invoke('insert_account', {
            datapath: datapath,
            defaultLspUrl: NETWORK_DEFAULTS[data.network].default_lsp_url,
            defaultMakerUrl,
            indexerUrl: data.indexer_url,
            makerUrls: defaultMakerUrl,
            name: data.name,
            network: data.network,
            nodeUrl: `http://localhost:${data.daemon_listening_port}`,
            proxyEndpoint: data.proxy_endpoint,
            rpcConnectionUrl: data.rpc_connection_url,
          })

          await invoke('set_current_account', {
            accountName: data.name,
          })

          setShowSuccessModal(true)
          setTimeout(() => {
            setShowSuccessModal(false)
            navigate(TRADE_PATH)
          }, 3000)
        } else {
          setErrorMessage('Wallet Restore Failed')
          setErrorDetails(
            restoreResponse.error
              ? `Error restoring wallet: ${JSON.stringify(restoreResponse.error)}`
              : 'Failed to restore the wallet. Please check your backup file and password.'
          )
          setShowErrorModal(true)
          await invoke('stop_node')
        }
      } catch (error) {
        console.error('Node operation failed:', error)
        await invoke('stop_node')
        setErrorMessage('Node Operation Failed')
        setErrorDetails(
          `Failed to start or operate the node: ${error instanceof Error ? error.message : String(error)}`
        )
        setShowErrorModal(true)
        return
      }
    } catch (error) {
      console.error('Restore failed:', error)
      setErrorMessage('Unexpected Error')
      setErrorDetails(
        `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
      )
      setShowErrorModal(true)
      await invoke('stop_node')
    } finally {
      setIsStartingNode(false)
    }
  }

  const handleFileSelect = async () => {
    try {
      // Open file dialog and get the selected path
      const filePath = await open({
        filters: [
          {
            extensions: ['enc'],
            name: 'Backup Files',
          },
        ],
        multiple: false,
      })

      if (filePath && typeof filePath === 'string') {
        console.log('Selected file path:', filePath)

        // Update the form value with the real file path
        form.setValue('backup_path', filePath, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })

        console.log('Form value after setting:', form.getValues('backup_path'))
      }
    } catch (error) {
      console.error('Error selecting file:', error)
      toast.error('Failed to select backup file')
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {restoreResponse.isLoading || isStartingNode ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={30} />
            <div className="text-center">
              <div className="mb-2">Restoring your wallet...</div>
              <div className="text-sm text-gray-400">
                This process may take a few moments
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <button
                className="px-3 py-1 rounded border text-sm border-gray-500"
                onClick={() => navigate(WALLET_SETUP_PATH)}
              >
                Go Back
              </button>
            </div>

            <div className="text-center mb-10">
              <h3 className="text-2xl font-semibold mb-4">
                Restore your Wallet
              </h3>
            </div>

            <form
              className="flex items-center justify-center flex-col"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <div className="w-80 space-y-4">
                <div>
                  <div className="text-xs mb-3">Account Name</div>
                  <div className="relative">
                    <input
                      className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                      placeholder="Enter a name for your account"
                      type="text"
                      {...form.register('name', { required: 'Required' })}
                    />
                  </div>
                  <div className="text-sm text-gray-400">
                    This name will be used to create your account folder
                  </div>
                  <div className="text-sm text-red mt-2">
                    {form.formState.errors.name?.message}
                  </div>
                </div>

                <div>
                  <div className="text-xs mb-3">Network</div>
                  <div className="relative">
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-white bg-gray-700 border border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      {...form.register('network', { required: 'Required' })}
                    >
                      <option value="testnet">Testnet</option>
                      <option value="signet">Signet</option>
                      <option value="regtest">Regtest</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="text-sm text-red mt-2">
                    {form.formState.errors.network?.message}
                    <ul>
                      {additionalErrors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <div className="text-xs mb-3">Backup Path</div>
                  <div className="relative space-y-2">
                    <input
                      className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                      placeholder="Enter backup path or select a file"
                      type="text"
                      {...form.register('backup_path', {
                        required: 'Backup path is required',
                        validate: (value) => {
                          console.log('Validating backup path:', value)
                          return !!value || 'Backup path is required'
                        },
                      })}
                    />
                    <div className="text-sm text-gray-400">
                      Enter the path manually or select a file below
                    </div>
                    <button
                      className="w-full px-4 py-2
                        bg-blue-600 hover:bg-blue-700
                        text-white font-medium
                        rounded-md
                        transition-colors duration-200
                        border border-blue-700
                        flex items-center justify-center
                        space-x-2"
                      onClick={handleFileSelect}
                      type="button"
                    >
                      <span>Choose Backup File</span>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </button>
                    <div className="text-sm text-red mt-2">
                      {form.formState.errors.backup_path?.message}
                    </div>
                    {/* Debug display */}
                    <div className="text-xs text-gray-400">
                      Current path: {form.watch('backup_path')}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs mb-3">Password</div>

                  <div className="relative">
                    <input
                      className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                      type={isPasswordVisible ? 'text' : 'password'}
                      {...form.register('password', {
                        required: 'Required',
                      })}
                    />

                    <div
                      className="absolute top-0 right-4 h-full flex items-center cursor-pointer"
                      onClick={() => setIsPasswordVisible((a) => !a)}
                    >
                      <EyeIcon />
                    </div>
                  </div>

                  <div className="text-sm text-red mt-2">
                    {form.formState.errors.password?.message}
                  </div>

                  <div className="text-sm text-red mt-2">
                    {form.formState.errors.password?.message}
                    <ul>
                      {additionalErrors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    className="flex items-center text-sm text-gray-400 hover:text-white"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    type="button"
                  >
                    <ChevronDown
                      className={`h-4 w-4 mr-2 transform transition-transform ${
                        showAdvanced ? 'rotate-180' : ''
                      }`}
                    />
                    Advanced Settings
                  </button>
                </div>

                {showAdvanced && (
                  <div className="space-y-4 pt-2 border-t border-gray-700">
                    <div>
                      <div className="text-xs mb-3">
                        Bitcoind RPC Connection URL
                      </div>
                      <div className="relative">
                        <input
                          className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          placeholder="username:password@host:port"
                          type="text"
                          {...form.register('rpc_connection_url', {
                            pattern: {
                              message:
                                'Invalid RPC URL format. Expected: username:password@host:port',
                              value: /^[^:]+:[^@]+@[^:]+:\d+$/,
                            },
                            required: 'Required',
                          })}
                        />
                      </div>
                      <div className="text-sm text-gray-400">
                        Example: user:password@localhost:18443
                      </div>
                      <div className="text-sm text-red mt-2">
                        {form.formState.errors.rpc_connection_url?.message}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs mb-3">
                        Indexer URL (electrum server)
                      </div>
                      <div className="relative">
                        <input
                          className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          placeholder="Enter the indexer URL"
                          type="text"
                          {...form.register('indexer_url', {
                            required: 'Required',
                          })}
                        />
                      </div>
                      <div className="text-sm text-red mt-2">
                        {form.formState.errors.indexer_url?.message}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs mb-3">RGB Proxy Endpoint</div>
                      <div className="relative">
                        <input
                          className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          placeholder="Enter the proxy endpoint"
                          type="text"
                          {...form.register('proxy_endpoint', {
                            required: 'Required',
                          })}
                        />
                      </div>
                      <div className="text-sm text-red mt-2">
                        {form.formState.errors.proxy_endpoint?.message}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs mb-3">Daemon Listening Port</div>
                      <div className="relative">
                        <input
                          className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          placeholder="Enter the daemon listening port"
                          type="text"
                          {...form.register('daemon_listening_port', {
                            pattern: {
                              message: 'Please enter a valid port number',
                              value: /^\d+$/,
                            },
                            required: 'Required',
                          })}
                        />
                      </div>
                      <div className="text-sm text-gray-400">Default: 3001</div>
                      <div className="text-sm text-red mt-2">
                        {form.formState.errors.daemon_listening_port?.message}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs mb-3">
                        LDK Peer Listening Port
                      </div>
                      <div className="relative">
                        <input
                          className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          placeholder="Enter the LDK peer listening port"
                          type="text"
                          {...form.register('ldk_peer_listening_port', {
                            pattern: {
                              message: 'Please enter a valid port number',
                              value: /^\d+$/,
                            },
                            required: 'Required',
                          })}
                        />
                      </div>
                      <div className="text-sm text-gray-400">Default: 9735</div>
                      <div className="text-sm text-red mt-2">
                        {form.formState.errors.ldk_peer_listening_port?.message}
                      </div>
                    </div>
                  </div>
                )}

                {additionalErrors.length > 0 && (
                  <div className="text-sm text-red">
                    <ul>
                      {additionalErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex self-end justify-end mt-8">
                <button
                  className={`px-6 py-3 rounded border text-lg font-bold ${
                    isStartingNode
                      ? 'border-gray-600 text-gray-400 cursor-not-allowed'
                      : 'border-cyan hover:bg-cyan/10'
                  }`}
                  disabled={isStartingNode}
                  type="submit"
                >
                  {isStartingNode ? (
                    <div className="flex items-center space-x-2">
                      <Spinner size={20} />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Proceed'
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-blue-dark p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">
                  Wallet Restored Successfully
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  Redirecting to trading page...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Modal with detailed message */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-blue-dark p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">
                  {errorMessage}
                </h3>
                <div className="mt-2 text-sm text-red-400 max-h-40 overflow-y-auto">
                  <p className="whitespace-pre-wrap break-words">
                    {errorDetails}
                  </p>
                </div>
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => {
                    setShowErrorModal(false)
                    setErrorMessage('')
                    setErrorDetails('')
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
