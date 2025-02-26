import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import {
  ChevronDown,
  ChevronLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Folder,
  ArrowLeftRight,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import { StepIndicator } from '../../components/StepIndicator'
import { BitcoinNetwork } from '../../constants'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { setSettingsAsync } from '../../slices/nodeSettings/nodeSettings.slice'

// Define the steps for the wallet restoration process
const steps = [
  { id: 'backup-selection', label: 'Backup Selection' },
  { id: 'restoration', label: 'Restoration' },
  { id: 'completion', label: 'Completion' },
]

// Define types for modal state
const ModalType = {
  ERROR: 'error',
  NONE: 'none',
  SUCCESS: 'success',
  WARNING: 'warning',
} as const

type ModalTypeValues = (typeof ModalType)[keyof typeof ModalType]

interface ModalState {
  type: ModalTypeValues
  title: string
  message: string
  details: string
  isOpen: boolean
  autoClose: boolean
}

interface FormData {
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

interface StatusModalProps {
  type: ModalTypeValues
  title: string
  message: string
  details?: string
  onClose: () => void
  autoClose?: boolean
  autoCloseDelay?: number
  isOpen: boolean
}

// Modal component for better reusability
const StatusModal = ({
  type,
  title,
  message,
  details = '',
  onClose,
  autoClose = false,
  autoCloseDelay = 3000,
  isOpen,
}: StatusModalProps) => {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (autoClose && isOpen) {
      timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [autoClose, isOpen, onClose, autoCloseDelay])

  if (!isOpen) return null

  // Define icon and colors based on modal type
  const getModalConfig = () => {
    switch (type) {
      case ModalType.SUCCESS:
        return {
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-600/30',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          icon: <CheckCircle className="h-8 w-8 text-green-400" />,
        }
      case ModalType.ERROR:
        return {
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-600/30',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          icon: <XCircle className="h-8 w-8 text-red-400" />,
        }
      case ModalType.WARNING:
        return {
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-600/30',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
          icon: <AlertTriangle className="h-8 w-8 text-yellow-400" />,
        }
      default:
        return {
          bgColor: 'bg-blue-900/20',
          borderColor: 'border-blue-600/30',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          icon: <CheckCircle className="h-8 w-8 text-blue-400" />,
        }
    }
  }

  const config = getModalConfig()

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`max-w-md w-full rounded-xl shadow-2xl ${config.bgColor} border ${config.borderColor} p-6 transform transition-all duration-300 ease-in-out animate-fade-in`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-4">{config.icon}</div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-300 mb-3">{message}</p>

            {details && (
              <div className="mt-3 mb-4">
                <div className="bg-black/30 rounded-lg p-3 max-h-48 overflow-y-auto text-sm text-gray-400 font-mono border border-gray-700">
                  <p className="whitespace-pre-wrap break-words">{details}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                className={`px-4 py-2 rounded-lg ${config.buttonColor} text-white font-medium transition-colors duration-200`}
                onClick={onClose}
              >
                {type === ModalType.SUCCESS ? 'Continue' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Component = () => {
  const [isStartingNode, setIsStartingNode] = useState(false)
  const [additionalErrors] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('backup-selection')

  // Unified modal state
  const [modalState, setModalState] = useState<ModalState>({
    autoClose: false,
    details: '',
    isOpen: false,
    message: '',
    title: '',
    type: ModalType.NONE,
  })

  const [restore, restoreResponse] = nodeApi.endpoints.restore.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const form = useForm<FormData>({
    defaultValues: {
      backup_path: '',
      name: 'Restored Account',
      network: 'Regtest' as BitcoinNetwork,
      password: '',
      ...NETWORK_DEFAULTS['Regtest'],
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

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }))

    // Navigate if it was a success modal
    if (modalState.type === ModalType.SUCCESS) {
      navigate(TRADE_PATH)
    }
  }

  const showSuccessModal = () => {
    setCurrentStep('completion')
    setModalState({
      autoClose: true,
      details: '',
      isOpen: true,
      message: 'Your wallet has been restored and is ready to use.',
      title: 'Wallet Restored Successfully',
      type: ModalType.SUCCESS,
    })
  }

  const showErrorModal = (title: string, details: string) => {
    setModalState({
      autoClose: false,
      details,
      isOpen: true,
      message: 'There was a problem restoring your wallet.',
      title,
      type: ModalType.ERROR,
    })
  }

  const onSubmit = async (data: FormData) => {
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
        showErrorModal(
          'Account Already Exists',
          'An account with this name already exists. Please choose a different name.'
        )
        return
      }

      setIsStartingNode(true)
      setCurrentStep('restoration')
      console.log('Starting node...')

      try {
        const defaultMakerUrl = NETWORK_DEFAULTS[data.network].default_maker_url
        await dispatch(
          setSettingsAsync({
            daemon_listening_port: data.daemon_listening_port,
            datapath: datapath,
            default_lsp_url: NETWORK_DEFAULTS[data.network].default_lsp_url,
            default_maker_url: defaultMakerUrl,
            indexer_url: data.indexer_url,
            ldk_peer_listening_port: data.ldk_peer_listening_port,
            maker_urls: [defaultMakerUrl],
            name: data.name,
            network: data.network,
            node_url: `http://localhost:${data.daemon_listening_port}`,
            proxy_endpoint: data.proxy_endpoint,
            rpc_connection_url: data.rpc_connection_url,
          })
        )
        try {
          await invoke('start_node', {
            accountName: data.name,
            daemonListeningPort: data.daemon_listening_port,
            datapath: datapath,
            ldkPeerListeningPort: data.ldk_peer_listening_port,
            network: data.network,
          })
          toast.success('Node started successfully!')
        } catch (error) {
          toast.error(`Could not start node: ${error}`)
          throw new Error(`Could not start node: ${error}`)
        }

        // Wait for node to be ready
        await new Promise((resolve) => setTimeout(resolve, 5000))

        const restoreResponse = await restore({
          backup_path: data.backup_path,
          password: data.password,
        })

        if (restoreResponse.isSuccess) {
          await invoke('insert_account', {
            daemonListeningPort: data.daemon_listening_port,
            datapath: datapath,
            defaultLspUrl: NETWORK_DEFAULTS[data.network].default_lsp_url,
            defaultMakerUrl,
            indexerUrl: data.indexer_url,
            ldkPeerListeningPort: data.ldk_peer_listening_port,
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

          showSuccessModal()
        } else {
          showErrorModal(
            'Wallet Restore Failed',
            restoreResponse.error
              ? `Error restoring wallet: ${JSON.stringify(restoreResponse.error)}`
              : 'Failed to restore the wallet. Please check your backup file and password.'
          )
          await invoke('stop_node')
        }
      } catch (error) {
        console.error('Node operation failed:', error)
        await invoke('stop_node')
        showErrorModal(
          'Node Operation Failed',
          `Failed to start or operate the node: ${error instanceof Error ? error.message : String(error)}`
        )
        return
      }
    } catch (error) {
      console.error('Restore failed:', error)
      showErrorModal(
        'Unexpected Error',
        `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
      )
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
      <div className="max-w-6xl mx-auto w-full p-6">
        <div className="bg-blue-darkest/80 backdrop-blur-sm rounded-3xl shadow-xl p-12 border border-white/5">
          <button
            className="text-cyan mb-8 flex items-center gap-2 hover:text-cyan-600 
              transition-colors group"
            onClick={() => navigate(WALLET_SETUP_PATH)}
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to node selection
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-white">Restore Wallet</h1>
          </div>

          {/* Step Indicator */}
          <div className="mb-8">
            <StepIndicator currentStep={currentStep} steps={steps} />
          </div>

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
              <form
                className="flex items-center justify-center flex-col"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="max-w-xl mx-auto w-full">
                  <div className="bg-blue-dark/40 p-8 rounded-xl border border-white/5 space-y-6">
                    {/* Account Name Field */}
                    <div>
                      <div className="text-sm font-medium mb-2 text-slate-300">
                        Account Name
                      </div>
                      <div className="relative">
                        <input
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                                    bg-slate-800/30 text-slate-300 
                                    focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                                    outline-none transition-all placeholder:text-slate-600"
                          placeholder="Enter a name for your account"
                          type="text"
                          {...form.register('name', { required: 'Required' })}
                        />
                      </div>
                      <div className="text-sm text-slate-400 mt-2">
                        This name will be used to create your account folder
                      </div>
                      {form.formState.errors.name && (
                        <p className="mt-2 text-red-400 text-sm flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Network Selection */}
                    <div>
                      <div className="text-sm font-medium mb-2 text-slate-300">
                        Network
                      </div>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                                    bg-slate-800/30 text-slate-300 appearance-none
                                    focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                                    outline-none transition-all"
                          {...form.register('network', {
                            required: 'Required',
                          })}
                        >
                          <option value="Testnet">Testnet</option>
                          <option value="Signet">Signet</option>
                          <option value="Regtest">Regtest</option>
                        </select>
                        <ChevronDown
                          className="absolute right-3 top-1/2 -translate-y-1/2 
                                    w-5 h-5 text-slate-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* Backup File Selection */}
                    <div>
                      <div className="text-sm font-medium mb-2 text-slate-300">
                        Backup File
                      </div>
                      <div className="relative">
                        <input
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                                    bg-slate-800/30 text-slate-300 
                                    focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                                    outline-none transition-all placeholder:text-slate-600"
                          placeholder="Select your backup file"
                          readOnly
                          type="text"
                          {...form.register('backup_path', {
                            required: 'Backup file is required',
                          })}
                        />
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5
                                   text-slate-400 hover:text-white rounded-lg
                                   hover:bg-slate-700/50 transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            handleFileSelect()
                          }}
                          type="button"
                        >
                          <Folder className="w-5 h-5" />
                        </button>
                      </div>
                      {form.formState.errors.backup_path && (
                        <p className="mt-2 text-red-400 text-sm flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          {form.formState.errors.backup_path.message}
                        </p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div>
                      <div className="text-sm font-medium mb-2 text-slate-300">
                        Password
                      </div>
                      <div className="relative">
                        <input
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                                    bg-slate-800/30 text-slate-300 
                                    focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                                    outline-none transition-all placeholder:text-slate-600"
                          placeholder="Enter your backup password"
                          type="password"
                          {...form.register('password', {
                            required: 'Password is required',
                          })}
                        />
                      </div>
                      {form.formState.errors.password && (
                        <p className="mt-2 text-red-400 text-sm flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          {form.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="pt-2">
                      <button
                        className="flex items-center text-sm text-slate-400 hover:text-white
                                 px-4 py-2 rounded-lg hover:bg-slate-800/50 transition-all w-full"
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

                    {/* Advanced Settings Panel */}
                    {showAdvanced && (
                      <div className="space-y-6 pt-4 border-t border-slate-800">
                        {/* RPC Connection URL */}
                        <div>
                          <div className="text-xs mb-3">
                            Bitcoind RPC Connection URL
                          </div>
                          <div className="relative">
                            <input
                              className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
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

                        {/* Indexer URL */}
                        <div>
                          <div className="text-xs mb-3">
                            Indexer URL (electrum server)
                          </div>
                          <div className="relative">
                            <input
                              className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
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

                        {/* RGB Proxy Endpoint */}
                        <div>
                          <div className="text-xs mb-3">RGB Proxy Endpoint</div>
                          <div className="relative">
                            <input
                              className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
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

                        {/* Daemon Listening Port */}
                        <div>
                          <div className="text-xs mb-3">
                            Daemon Listening Port
                          </div>
                          <div className="relative">
                            <input
                              className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
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
                          <div className="text-sm text-gray-400">
                            Default: 3001
                          </div>
                          <div className="text-sm text-red mt-2">
                            {
                              form.formState.errors.daemon_listening_port
                                ?.message
                            }
                          </div>
                        </div>

                        {/* LDK Peer Listening Port */}
                        <div>
                          <div className="text-xs mb-3">
                            LDK Peer Listening Port
                          </div>
                          <div className="relative">
                            <input
                              className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
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
                          <div className="text-sm text-gray-400">
                            Default: 9735
                          </div>
                          <div className="text-sm text-red mt-2">
                            {
                              form.formState.errors.ldk_peer_listening_port
                                ?.message
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Errors Display */}
                    {additionalErrors.length > 0 && (
                      <div className="text-sm text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                        <ul className="space-y-1">
                          {additionalErrors.map((error, index) => (
                            <li className="flex items-center gap-2" key={index}>
                              <span>•</span> {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    className="w-full mt-6 px-6 py-3 rounded-xl bg-cyan text-blue-darkest 
                             font-semibold hover:bg-cyan/90 transition-colors duration-200
                             focus:ring-2 focus:ring-cyan/20 focus:outline-none
                             flex items-center justify-center gap-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={form.formState.isSubmitting}
                    type="submit"
                  >
                    Restore Wallet
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Unified Modal Component */}
          <StatusModal
            autoClose={modalState.autoClose}
            autoCloseDelay={3000}
            details={modalState.details}
            isOpen={modalState.isOpen}
            message={modalState.message}
            onClose={closeModal}
            title={modalState.title}
            type={modalState.type}
          />
        </div>
      </div>
    </Layout>
  )
}
