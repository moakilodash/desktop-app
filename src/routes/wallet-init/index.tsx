import { invoke } from '@tauri-apps/api'
import { listen } from '@tauri-apps/api/event'
import { ChevronDown, ChevronLeft, AlertCircle, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { SubmitHandler, UseFormReturn, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { Layout } from '../../components/Layout'
import { MnemonicDisplay } from '../../components/MnemonicDisplay'
import {
  MnemonicVerifyForm,
  MnemonicVerifyFields,
} from '../../components/MnemonicVerifyForm'
import {
  PasswordSetupForm,
  PasswordFields,
} from '../../components/PasswordSetupForm'
import { Spinner } from '../../components/Spinner'
import { UnlockProgress } from '../../components/UnlockProgress'
import { BitcoinNetwork } from '../../constants'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import { parseRpcUrl } from '../../helpers/utils'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import {
  nodeSettingsActions,
  setSettingsAsync,
} from '../../slices/nodeSettings/nodeSettings.slice'
// Separate interfaces for each step
interface NodeSetupFields {
  name: string
  network: BitcoinNetwork
  rpc_connection_url: string
  indexer_url: string
  proxy_endpoint: string
  daemon_listening_port: string
  ldk_peer_listening_port: string
}

type SetupStep = 'setup' | 'password' | 'mnemonic' | 'verify' | 'unlock'

export const Component = () => {
  const [currentStep, setCurrentStep] = useState<SetupStep>('setup')
  const [isStartingNode, setIsStartingNode] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [additionalErrors, setAdditionalErrors] = useState<Array<string>>([])
  const [mnemonic, setMnemonic] = useState<Array<string>>([])
  const [nodePassword, setNodePassword] = useState('')

  const [init, initResponse] = nodeApi.endpoints.init.useLazyQuery()
  const [unlock, unlockResponse] = nodeApi.endpoints.unlock.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  // Separate forms for each step
  const nodeSetupForm = useForm<NodeSetupFields>({
    defaultValues: {
      name: 'Test Account',
      network: 'Regtest',
      ...NETWORK_DEFAULTS['Regtest'],
    },
  })

  const passwordForm = useForm<PasswordFields>({
    defaultValues: {
      confirmPassword: '',
      password: '',
    },
  })

  const mnemonicForm = useForm<MnemonicVerifyFields>({
    defaultValues: {
      mnemonic: '',
    },
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      nodeSetupForm.reset()
      passwordForm.reset()
      mnemonicForm.reset()
      setAdditionalErrors([])
    }
  }, [])

  // Cleanup when changing steps
  const handleStepChange = (newStep: SetupStep) => {
    setAdditionalErrors([]) // Clear additional errors

    // Reset form errors based on step
    switch (newStep) {
      case 'setup':
        nodeSetupForm.clearErrors()
        break
      case 'password':
        passwordForm.clearErrors()
        break
      case 'mnemonic':
        // No form to clear for mnemonic display
        break
      case 'verify':
        mnemonicForm.clearErrors()
        break
      case 'unlock':
        // Handle unlock step cleanup
        break
    }

    setCurrentStep(newStep)
  }

  const handleNodeSetup: SubmitHandler<NodeSetupFields> = async (data) => {
    try {
      const formattedName = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

      const datapath = `kaleidoswap-${formattedName}`

      const accountExists = await invoke('check_account_exists', {
        name: data.name,
      })
      if (accountExists) {
        setAdditionalErrors(['An account with this name already exists'])
        return
      }
      const defaultMakerUrl = NETWORK_DEFAULTS[data.network].default_maker_url
      await dispatch(
        setSettingsAsync({
          daemon_listening_port: data.daemon_listening_port,
          datapath: datapath,
          // Use formatted name-based datapath
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

      handleStepChange('password')
    } catch (error) {
      console.error('Node setup failed:', error)
      toast.error('Failed to set up node. Please try again.')
    }
  }

  const formatAccountName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const getDatapath = (accountName: string): string => {
    return `kaleidoswap-${formatAccountName(accountName)}`
  }

  // Helper functions for node management
  const checkAndStopExistingNode = async (): Promise<void> => {
    const runningNodeAccount = await invoke<string | null>(
      'get_running_node_account'
    )
    const isNodeRunning = await invoke<boolean>('is_node_running')

    if (runningNodeAccount && isNodeRunning) {
      console.log('Stopping existing node for account:', runningNodeAccount)

      try {
        // Create a promise that will resolve when the node is stopped
        const nodeStoppedPromise = new Promise<void>((resolve, reject) => {
          let unlistenFn: (() => void) | null = null

          const timeoutId = setTimeout(() => {
            if (unlistenFn) unlistenFn()
            reject(new Error('Timeout waiting for node to stop'))
          }, 10000)

          listen('node-stopped', () => {
            if (unlistenFn) unlistenFn()
            clearTimeout(timeoutId)
            resolve()
          })
            .then((unlisten) => {
              unlistenFn = unlisten
            })
            .catch((error) => {
              clearTimeout(timeoutId)
              reject(new Error(`Failed to set up node stop listener: ${error}`))
            })
        })

        await invoke('stop_node')
        await nodeStoppedPromise
        // Additional delay to ensure resources are released
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error('Error stopping existing node:', error)
        throw new Error(`Failed to stop existing node: ${error}`)
      }
    } else if (runningNodeAccount) {
      console.log(
        'Node account exists but node is not running:',
        runningNodeAccount
      )
    }
  }

  const startLocalNode = async (
    accountName: string,
    network: BitcoinNetwork,
    datapath: string
  ): Promise<void> => {
    console.log('Starting local node with parameters:', {
      accountName,
      daemonListeningPort: nodeSetupForm.getValues('daemon_listening_port'),
      datapath,
      ldkPeerListeningPort: nodeSetupForm.getValues('ldk_peer_listening_port'),
      network,
    })

    try {
      // Create a promise that will resolve when the node is ready
      const nodeStartedPromise = new Promise<void>((resolve, reject) => {
        let unlistenFn: (() => void) | null = null

        console.log('Setting up node event listener...')

        const timeoutId = setTimeout(async () => {
          console.log('Timeout occurred, checking node status...')
          if (unlistenFn) unlistenFn()

          try {
            const isRunning = await invoke<boolean>('is_node_running')
            if (isRunning) {
              console.log('Node is running, proceeding...')
              resolve()
              return
            }
          } catch (error) {
            console.error('Error checking node status:', error)
          }

          reject(new Error('Timeout waiting for node to start'))
        }, 15000)

        listen('node-log', (event: { payload: string }) => {
          console.log('Node log:', event.payload)
          if (event.payload.includes('Listening on')) {
            console.log('Node is ready')
            if (unlistenFn) unlistenFn()
            clearTimeout(timeoutId)
            resolve()
          }
        })
          .then((unlisten) => {
            unlistenFn = unlisten
          })
          .catch((error) => {
            clearTimeout(timeoutId)
            reject(new Error(`Failed to set up node event listener: ${error}`))
          })
      })

      // Start the node
      await invoke('start_node', {
        accountName,
        daemonListeningPort: nodeSetupForm.getValues('daemon_listening_port'),
        datapath,
        ldkPeerListeningPort: nodeSetupForm.getValues(
          'ldk_peer_listening_port'
        ),
        network,
      })

      await nodeStartedPromise
    } catch (error) {
      console.error('Error starting local node:', error)
      throw new Error(`Failed to start node: ${error}`)
    }
  }

  const initializeNode = async (password: string): Promise<string[]> => {
    const initResult = await init({ password })

    if (!initResult.isSuccess) {
      if (
        initResult.error &&
        'status' in initResult.error &&
        initResult.error.status === 403
      ) {
        throw new Error('NODE_ALREADY_INITIALIZED')
      }
      throw new Error(
        initResult.error && 'data' in initResult.error
          ? (initResult.error.data as { error: string }).error
          : 'Node initialization failed'
      )
    }

    return initResult.data.mnemonic.split(' ')
  }

  const unlockExistingNode = async (password: string): Promise<void> => {
    const rpcConfig = parseRpcUrl(nodeSetupForm.getValues('rpc_connection_url'))

    const unlockResult = await unlock({
      bitcoind_rpc_host: rpcConfig.host,
      bitcoind_rpc_password: rpcConfig.password,
      bitcoind_rpc_port: rpcConfig.port,
      bitcoind_rpc_username: rpcConfig.username,
      indexer_url: nodeSetupForm.getValues('indexer_url'),
      password,
      proxy_endpoint: nodeSetupForm.getValues('proxy_endpoint'),
    }).unwrap()

    if (unlockResult === undefined) {
      throw new Error('Failed to unlock the node')
    }

    const nodeInfoResult = await nodeInfo()
    if (!nodeInfoResult.isSuccess) {
      throw new Error('Failed to verify node status after unlock')
    }
  }

  const handlePasswordSetup: SubmitHandler<PasswordFields> = async (data) => {
    setIsStartingNode(true)
    const accountName = nodeSetupForm.getValues('name')
    const network = nodeSetupForm.getValues('network')
    const datapath = getDatapath(accountName)

    try {
      // Step 1: Check and stop any existing node
      await checkAndStopExistingNode()

      // Step 2: Start the local node
      await startLocalNode(accountName, network, datapath)
      toast.info('Starting local node...', {
        autoClose: 2000,
        position: 'bottom-right',
      })

      // Step 3: Initialize or unlock the node
      try {
        const mnemonic = await initializeNode(data.password)
        setNodePassword(data.password)
        setMnemonic(mnemonic)
        await saveAccountSettings(accountName, network, datapath)
        handleStepChange('mnemonic')
        toast.success('Node initialized successfully!')
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'NODE_ALREADY_INITIALIZED'
        ) {
          toast.info('Node is already initialized, attempting to unlock...')
          setNodePassword(data.password)
          await unlockExistingNode(data.password)
          await saveAccountSettings(accountName, network, datapath)
          navigate(TRADE_PATH)
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error('Password setup failed:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to initialize node'
      )
    } finally {
      setIsStartingNode(false)
    }
  }

  const saveAccountSettings = async (
    accountName: string,
    network: BitcoinNetwork,
    datapath: string
  ) => {
    const defaultMakerUrl = NETWORK_DEFAULTS[network].default_maker_url

    await invoke('insert_account', {
      daemonListeningPort: nodeSetupForm.getValues('daemon_listening_port'),
      datapath,
      defaultLspUrl: NETWORK_DEFAULTS[network].default_lsp_url,
      defaultMakerUrl,
      indexerUrl: nodeSetupForm.getValues('indexer_url'),
      ldkPeerListeningPort: nodeSetupForm.getValues('ldk_peer_listening_port'),
      makerUrls: defaultMakerUrl,
      name: accountName,
      network,
      nodeUrl: `http://localhost:${nodeSetupForm.getValues('daemon_listening_port')}`,
      proxyEndpoint: nodeSetupForm.getValues('proxy_endpoint'),
      rpcConnectionUrl: nodeSetupForm.getValues('rpc_connection_url'),
    })

    await invoke('set_current_account', { accountName })

    await dispatch(
      setSettingsAsync({
        daemon_listening_port: nodeSetupForm.getValues('daemon_listening_port'),
        datapath,
        default_lsp_url: NETWORK_DEFAULTS[network].default_lsp_url,
        default_maker_url: defaultMakerUrl,
        indexer_url: nodeSetupForm.getValues('indexer_url'),
        ldk_peer_listening_port: nodeSetupForm.getValues(
          'ldk_peer_listening_port'
        ),
        maker_urls: [defaultMakerUrl],
        name: accountName,
        network,
        node_url: `http://localhost:${nodeSetupForm.getValues('daemon_listening_port')}`,
        proxy_endpoint: nodeSetupForm.getValues('proxy_endpoint'),
        rpc_connection_url: nodeSetupForm.getValues('rpc_connection_url'),
      })
    )
  }

  const handleMnemonicVerify: SubmitHandler<MnemonicVerifyFields> = async (
    data
  ) => {
    try {
      if (mnemonic.join(' ') !== data.mnemonic.trim()) {
        setAdditionalErrors(['Mnemonic does not match'])
        return
      }
      handleStepChange('unlock')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(errorMessage)
    }
  }

  const copyMnemonicToClipboard = () => {
    navigator.clipboard
      .writeText(mnemonic.join(' '))
      .then(() => toast.success('Mnemonic copied to clipboard'))
      .catch(() => toast.error('Failed to copy mnemonic'))
  }

  const handleUnlockComplete = async () => {
    try {
      const rpcConfig = parseRpcUrl(
        nodeSetupForm.getValues('rpc_connection_url')
      )

      await unlock({
        bitcoind_rpc_host: rpcConfig.host,
        bitcoind_rpc_password: rpcConfig.password,
        bitcoind_rpc_port: rpcConfig.port,
        bitcoind_rpc_username: rpcConfig.username,
        indexer_url: nodeSetupForm.getValues('indexer_url'),
        password: nodePassword,
        proxy_endpoint: nodeSetupForm.getValues('proxy_endpoint'),
      }).unwrap()

      // Format settings before dispatching
      const network = nodeSetupForm.getValues('network')
      const defaultMakerUrl = NETWORK_DEFAULTS[network].default_maker_url
      await dispatch(
        setSettingsAsync({
          daemon_listening_port: nodeSetupForm.getValues(
            'daemon_listening_port'
          ),
          datapath: `kaleidoswap-${nodeSetupForm.getValues('name')}`,
          default_lsp_url: NETWORK_DEFAULTS[network].default_lsp_url,
          default_maker_url: defaultMakerUrl,
          indexer_url: nodeSetupForm.getValues('indexer_url'),
          ldk_peer_listening_port: nodeSetupForm.getValues(
            'ldk_peer_listening_port'
          ),
          maker_urls: [defaultMakerUrl],
          name: nodeSetupForm.getValues('name'),
          network: network,
          node_url: `http://localhost:${nodeSetupForm.getValues('daemon_listening_port')}`,
          proxy_endpoint: nodeSetupForm.getValues('proxy_endpoint'),
          rpc_connection_url: nodeSetupForm.getValues('rpc_connection_url'),
        })
      )

      navigate(TRADE_PATH)
    } catch (error) {
      console.error('Unlock failed:', error)
      throw error
    }
  }

  const handleUnlockError = (error: Error) => {
    // Don't navigate back to verify anymore
    setAdditionalErrors([error.message])
  }

  const renderCurrentStep = () => {
    if (isStartingNode || initResponse.isLoading || unlockResponse.isLoading) {
      return (
        <div className="py-20 flex flex-col items-center space-y-4">
          <Spinner />
          <div className="text-center">
            Initializing your node. This may take a few moments...
          </div>
        </div>
      )
    }

    // Move variable declarations outside the switch
    const rpcConfig = parseRpcUrl(nodeSetupForm.getValues('rpc_connection_url'))

    switch (currentStep) {
      case 'setup':
        return (
          <NodeSetupForm
            errors={additionalErrors}
            form={nodeSetupForm}
            onSubmit={handleNodeSetup}
          />
        )
      case 'password':
        return (
          <PasswordSetupForm
            errors={additionalErrors}
            form={passwordForm}
            isPasswordVisible={isPasswordVisible}
            onBack={() => handleStepChange('setup')}
            onSubmit={handlePasswordSetup}
            setIsPasswordVisible={setIsPasswordVisible}
          />
        )
      case 'mnemonic':
        return (
          <MnemonicDisplay
            mnemonic={mnemonic}
            onBack={() => handleStepChange('password')}
            onCopy={copyMnemonicToClipboard}
            onNext={() => handleStepChange('verify')}
          />
        )
      case 'verify':
        return (
          <MnemonicVerifyForm
            errors={additionalErrors}
            form={mnemonicForm}
            onBack={() => handleStepChange('mnemonic')}
            onSubmit={handleMnemonicVerify}
          />
        )
      case 'unlock':
        return (
          <UnlockProgress
            onBack={() => handleStepChange('verify')}
            onUnlockComplete={handleUnlockComplete}
            onUnlockError={handleUnlockError}
            unlockParams={{
              bitcoind_rpc_host: rpcConfig.host,
              bitcoind_rpc_password: rpcConfig.password,
              bitcoind_rpc_port: rpcConfig.port,
              bitcoind_rpc_username: rpcConfig.username,
              indexer_url: nodeSetupForm.getValues('indexer_url'),
              password: nodePassword,
              proxy_endpoint: nodeSetupForm.getValues('proxy_endpoint'),
            }}
          />
        )
    }
  }

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-blue-darkest/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/5">
            <div className="max-w-3xl mx-auto">{renderCurrentStep()}</div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// Form Components Implementation
interface NodeSetupFormProps {
  form: UseFormReturn<NodeSetupFields>
  onSubmit: SubmitHandler<NodeSetupFields>
  errors: string[]
}

const NodeSetupForm = ({ form, onSubmit, errors }: NodeSetupFormProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const network = form.watch('network')
  const navigate = useNavigate()

  // Update form values when network changes
  useEffect(() => {
    const defaults = NETWORK_DEFAULTS[network]
    form.setValue('rpc_connection_url', defaults.rpc_connection_url)
    form.setValue('indexer_url', defaults.indexer_url)
    form.setValue('proxy_endpoint', defaults.proxy_endpoint)
    form.setValue('daemon_listening_port', defaults.daemon_listening_port)
    form.setValue('ldk_peer_listening_port', defaults.ldk_peer_listening_port)
  }, [network, form])

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Back Button */}
      <div className="mb-6">
        <button
          className="group px-3 py-1.5 rounded-xl border border-slate-700 
                     hover:bg-slate-800/50 transition-all duration-200 
                     flex items-center gap-2 text-slate-400 hover:text-white"
          onClick={() => navigate(WALLET_SETUP_PATH)}
          type="button"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>
      </div>

      {/* Header Section */}
      <div className="text-center mb-8">
        <h3
          className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan to-purple 
                       bg-clip-text text-transparent"
        >
          Set Up Your Kaleidoswap Node
        </h3>
        <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
          Configure your node settings to begin the initialization process.
        </p>
      </div>

      {/* Form Section */}
      <form
        className="max-w-md mx-auto bg-slate-900/50 p-6 rounded-2xl 
                   border border-slate-800/50 backdrop-blur-sm"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-6">
          {/* Account Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Account Name
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                        bg-slate-800/30 text-slate-300 
                        focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                        outline-none transition-all placeholder:text-slate-600"
              placeholder="Enter a name for your account"
              type="text"
              {...form.register('name', { required: 'Required' })}
            />
            <p className="mt-2 text-sm text-slate-400">
              This name will be used to create your account folder
            </p>
            {form.formState.errors.name && (
              <p className="mt-2 text-red-400 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Network
            </label>
            <div className="relative">
              <select
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                          bg-slate-800/30 text-slate-300 appearance-none
                          focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                          outline-none transition-all"
                {...form.register('network', { required: 'Required' })}
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

          {/* Advanced Settings Toggle */}
          <button
            className="flex items-center text-sm text-slate-400 hover:text-white 
                     transition-colors w-full py-2"
            onClick={() => setShowAdvanced(!showAdvanced)}
            type="button"
          >
            <ChevronDown
              className={`w-4 h-4 mr-2 transition-transform 
                         ${showAdvanced ? 'rotate-180' : ''}`}
            />
            Advanced Settings
          </button>

          {/* Advanced Settings Section */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-slate-700">
              {/* RPC Connection URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bitcoind RPC Connection URL
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                            bg-slate-800/30 text-slate-300 
                            focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                            outline-none transition-all placeholder:text-slate-600"
                  placeholder="username:password@host:port"
                  type="text"
                  {...form.register('rpc_connection_url')}
                />
                <p className="mt-2 text-sm text-slate-400">
                  Example: user:password@localhost:18443
                </p>
              </div>

              {/* Indexer URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Indexer URL (electrum server)
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                            bg-slate-800/30 text-slate-300 
                            focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                            outline-none transition-all placeholder:text-slate-600"
                  placeholder="Enter the indexer URL"
                  type="text"
                  {...form.register('indexer_url')}
                />
              </div>

              {/* Proxy Endpoint */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  RGB Proxy Endpoint
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                            bg-slate-800/30 text-slate-300 
                            focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                            outline-none transition-all placeholder:text-slate-600"
                  placeholder="Enter the proxy endpoint"
                  type="text"
                  {...form.register('proxy_endpoint')}
                />
              </div>

              {/* Daemon Listening Port */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Daemon Listening Port
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                            bg-slate-800/30 text-slate-300 
                            focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                            outline-none transition-all placeholder:text-slate-600"
                  placeholder="Enter the daemon listening port"
                  type="text"
                  {...form.register('daemon_listening_port')}
                />
                <p className="mt-2 text-sm text-slate-400">Default: 3001</p>
              </div>

              {/* LDK Peer Listening Port */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  LDK Peer Listening Port
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                            bg-slate-800/30 text-slate-300 
                            focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                            outline-none transition-all placeholder:text-slate-600"
                  placeholder="Enter the LDK peer listening port"
                  type="text"
                  {...form.register('ldk_peer_listening_port')}
                />
                <p className="mt-2 text-sm text-slate-400">Default: 9735</p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.length > 0 && (
            <div
              className="p-4 bg-red-500/10 border border-red-500/20 
                          rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <ul className="text-red-400 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li className="flex items-center gap-2" key={index}>
                    <span>•</span> {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <button
            className="w-full mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan to-purple 
                     text-white font-semibold hover:opacity-90 transition-all duration-200
                     focus:ring-2 focus:ring-cyan/20 focus:outline-none
                     flex items-center justify-center gap-2"
            type="submit"
          >
            Continue to Password Setup
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
