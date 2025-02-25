import { invoke } from '@tauri-apps/api'
import { listen } from '@tauri-apps/api/event'
import {
  ChevronDown,
  ChevronLeft,
  AlertCircle,
  ArrowRight,
  Wallet,
} from 'lucide-react'
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
import { StepIndicator } from '../../components/StepIndicator'
import { UnlockProgress } from '../../components/UnlockProgress'
import { BitcoinNetwork } from '../../constants'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import { parseRpcUrl } from '../../helpers/utils'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { setSettingsAsync } from '../../slices/nodeSettings/nodeSettings.slice'

// Define the steps for the wallet initialization process
const WALLET_INIT_STEPS = [
  { id: 'setup', label: 'Node Setup' },
  { id: 'password', label: 'Password' },
  { id: 'mnemonic', label: 'Recovery Phrase' },
  { id: 'verify', label: 'Verification' },
  { id: 'unlock', label: 'Unlock' },
]

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

  const [init] = nodeApi.endpoints.init.useLazyQuery()
  const [unlock] = nodeApi.endpoints.unlock.useLazyQuery()
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

  // Handle back navigation based on current step
  const handleBackNavigation = () => {
    switch (currentStep) {
      case 'setup':
        navigate(WALLET_SETUP_PATH)
        break
      case 'password':
        handleStepChange('setup')
        break
      case 'mnemonic':
        handleStepChange('password')
        break
      case 'verify':
        handleStepChange('mnemonic')
        break
      case 'unlock':
        handleStepChange('verify')
        break
    }
  }

  // Get back button text based on current step
  const getBackButtonText = () => {
    switch (currentStep) {
      case 'setup':
        return 'Back to node selection'
      case 'password':
        return 'Back to node setup'
      case 'mnemonic':
        return 'Back to password setup'
      case 'verify':
        return 'Back to recovery phrase'
      case 'unlock':
        return 'Back to verification'
      default:
        return 'Back'
    }
  }

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
            onSubmit={handlePasswordSetup}
            setIsPasswordVisible={setIsPasswordVisible}
          />
        )
      case 'mnemonic':
        return (
          <MnemonicDisplay
            mnemonic={mnemonic}
            onCopy={copyMnemonicToClipboard}
            onNext={() => handleStepChange('verify')}
          />
        )
      case 'verify':
        return (
          <MnemonicVerifyForm
            errors={additionalErrors}
            form={mnemonicForm}
            onSubmit={handleMnemonicVerify}
          />
        )
      case 'unlock':
        return (
          <UnlockProgress
            onUnlockComplete={handleUnlockComplete}
            onUnlockError={handleUnlockError}
            unlockParams={{
              bitcoind_rpc_host: parseRpcUrl(
                nodeSetupForm.getValues('rpc_connection_url')
              ).host,
              bitcoind_rpc_password: 'password',
              bitcoind_rpc_port: parseRpcUrl(
                nodeSetupForm.getValues('rpc_connection_url')
              ).port,
              bitcoind_rpc_username: 'user',
              indexer_url: nodeSetupForm.getValues('indexer_url'),
              password: nodePassword,
              proxy_endpoint: nodeSetupForm.getValues('proxy_endpoint'),
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto w-full p-6">
        <div className="bg-blue-darkest/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 md:p-12 border border-white/5">
          {/* Main Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan">
              <Wallet className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-white">Initialize Wallet</h1>
          </div>

          {/* Back Button */}
          <div className="mb-8">
            <button
              className="text-cyan flex items-center gap-2 hover:text-cyan-600 
                       transition-colors group"
              disabled={isStartingNode}
              onClick={handleBackNavigation}
              type="button"
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              {getBackButtonText()}
            </button>
          </div>

          {/* Step Indicator - full width */}
          <div className="mb-8">
            <StepIndicator
              currentStep={currentStep}
              steps={WALLET_INIT_STEPS}
            />

            {/* Step Description */}
            <div className="mt-6 p-5 bg-blue-dark/40 rounded-xl border border-white/5 relative overflow-hidden">
              {/* Decorative accent */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan"></div>

              <h3 className="text-sm font-medium text-cyan mb-2 pl-3">
                {currentStep === 'setup' && 'Node Configuration'}
                {currentStep === 'password' && 'Secure Your Wallet'}
                {currentStep === 'mnemonic' && 'Backup Your Wallet'}
                {currentStep === 'verify' && 'Verify Your Backup'}
                {currentStep === 'unlock' && 'Access Your Wallet'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-3">
                {currentStep === 'setup' &&
                  'Configure your node settings to connect to the Bitcoin network.'}
                {currentStep === 'password' &&
                  'Create a strong password to protect your wallet from unauthorized access.'}
                {currentStep === 'mnemonic' &&
                  'Save your recovery phrase in a secure location to recover your wallet if needed.'}
                {currentStep === 'verify' &&
                  "Confirm you've correctly saved your recovery phrase for future wallet recovery."}
                {currentStep === 'unlock' &&
                  'Unlock your node to start using your wallet and access your funds.'}
              </p>
            </div>
          </div>

          {/* Current Step Content */}
          <div className="max-w-2xl mx-auto">{renderCurrentStep()}</div>
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
    <div className="w-full">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan">
          <Wallet className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold text-white">Configure Your Node</h2>
      </div>

      <p className="text-slate-400 mb-6 leading-relaxed">
        Set up your node configuration to connect to the Bitcoin network.
      </p>

      {/* Form Section */}
      <form
        className="bg-blue-dark/40 p-6 rounded-xl border border-white/5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-5">
          {/* Account Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Account Name
            </label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                        bg-slate-800/30 text-slate-300 
                        focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                        outline-none transition-all placeholder:text-slate-600"
              placeholder="Enter a name for your account"
              type="text"
              {...form.register('name', { required: 'Required' })}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              This name will be used to create your account folder
            </p>
            {form.formState.errors.name && (
              <p className="mt-1.5 text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Network
            </label>
            <div className="relative">
              <select
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
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
                     transition-colors w-full py-1.5"
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Bitcoind RPC Connection URL
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                            bg-slate-800/30 text-slate-300 
                            focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                            outline-none transition-all placeholder:text-slate-600"
                  placeholder="username:password@host:port"
                  type="text"
                  {...form.register('rpc_connection_url')}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Example: user:password@localhost:18443
                </p>
              </div>

              {/* Two-column layout for smaller fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Indexer URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Indexer URL
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                              bg-slate-800/30 text-slate-300 
                              focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                              outline-none transition-all placeholder:text-slate-600"
                    placeholder="Electrum server URL"
                    type="text"
                    {...form.register('indexer_url')}
                  />
                </div>

                {/* Proxy Endpoint */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    RGB Proxy Endpoint
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                              bg-slate-800/30 text-slate-300 
                              focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                              outline-none transition-all placeholder:text-slate-600"
                    placeholder="Proxy endpoint URL"
                    type="text"
                    {...form.register('proxy_endpoint')}
                  />
                </div>
              </div>

              {/* Two-column layout for port fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Daemon Listening Port */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Daemon Listening Port
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                              bg-slate-800/30 text-slate-300 
                              focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                              outline-none transition-all placeholder:text-slate-600"
                    placeholder="Default: 3001"
                    type="text"
                    {...form.register('daemon_listening_port')}
                  />
                </div>

                {/* LDK Peer Listening Port */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    LDK Peer Listening Port
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                              bg-slate-800/30 text-slate-300 
                              focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                              outline-none transition-all placeholder:text-slate-600"
                    placeholder="Default: 9735"
                    type="text"
                    {...form.register('ldk_peer_listening_port')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.length > 0 && (
            <div
              className="p-3 bg-red-500/10 border border-red-500/20 
                          rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <ul className="text-red-400 text-xs space-y-1">
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
            className="w-full mt-4 px-6 py-3 rounded-xl bg-cyan text-blue-darkest 
                     font-semibold hover:bg-cyan/90 transition-colors duration-200
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
