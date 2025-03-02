import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  AlertCircle,
  ArrowRight,
  Wallet,
  Lock,
  FileText,
  CheckCircle,
  AlertTriangle,
  Zap,
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
import { NetworkSelector } from '../../components/NetworkSelector'
import {
  PasswordSetupForm,
  PasswordFields,
} from '../../components/PasswordSetupForm'
import { StepIndicator } from '../../components/StepIndicator'
import {
  Button,
  Card,
  Alert,
  SetupSection,
  FormField,
  Input,
  SetupLayout,
  AdvancedSettings,
  NetworkSettings,
} from '../../components/ui'
import { UnlockingProgress } from '../../components/UnlockingProgress'
import { BitcoinNetwork } from '../../constants'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import { parseRpcUrl } from '../../helpers/utils'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { setSettingsAsync } from '../../slices/nodeSettings/nodeSettings.slice'

const WALLET_INIT_STEPS = [
  { id: 'setup', label: 'Node Setup' },
  { id: 'password', label: 'Password' },
  { id: 'mnemonic', label: 'Recovery Phrase' },
  { id: 'verify', label: 'Verification' },
  { id: 'unlock', label: 'Unlock' },
]

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
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const [isNodeError, setIsNodeError] = useState(false)
  const [nodeErrorMessage, setNodeErrorMessage] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [nodePassword, setNodePassword] = useState('')
  const [isCancellingUnlock, setIsCancellingUnlock] = useState(false)

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
      setErrors([])
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

  // Cleanup when changing steps
  const handleStepChange = (newStep: SetupStep) => {
    setErrors([]) // Clear additional errors

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
        setErrors(['An account with this name already exists'])
        return
      }
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
    const accountName = nodeSetupForm.getValues('name')
    const network = nodeSetupForm.getValues('network')
    const datapath = getDatapath(accountName)

    try {
      // Step 1: Check and stop any existing node
      await checkAndStopExistingNode()

      // Step 2: Start the local node
      toast.info(
        `Starting RLN node on port ${nodeSetupForm.getValues('daemon_listening_port')}...`,
        {
          autoClose: 2000,
          position: 'bottom-right',
        }
      )
      await startLocalNode(accountName, network, datapath)

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
        setErrors(['Mnemonic does not match'])
        return
      }

      // Clear any previous errors
      setErrors([])
      setIsNodeError(false)
      setNodeErrorMessage('')

      // Move to unlock step
      handleStepChange('unlock')

      // Start the unlock process
      setIsUnlocking(true)

      try {
        await handleUnlockComplete()
      } catch (error) {
        console.error('Unlock failed:', error)
      }
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
      setIsUnlocking(true)

      const rpcConfig = parseRpcUrl(
        nodeSetupForm.getValues('rpc_connection_url')
      )

      const unlockResult = await unlock({
        bitcoind_rpc_host: rpcConfig.host,
        bitcoind_rpc_password: rpcConfig.password,
        bitcoind_rpc_port: rpcConfig.port,
        bitcoind_rpc_username: rpcConfig.username,
        indexer_url: nodeSetupForm.getValues('indexer_url'),
        password: nodePassword,
        proxy_endpoint: nodeSetupForm.getValues('proxy_endpoint'),
      }).unwrap()

      if (unlockResult === undefined) {
        throw new Error('Failed to unlock the node')
      }

      // Verify node status after unlock
      const nodeInfoResult = await nodeInfo()
      if (!nodeInfoResult.isSuccess) {
        throw new Error('Failed to verify node status after unlock')
      }

      // Format settings before dispatching
      const network = nodeSetupForm.getValues('network')
      const defaultMakerUrl = NETWORK_DEFAULTS[network].default_maker_url
      await dispatch(
        setSettingsAsync({
          daemon_listening_port: nodeSetupForm.getValues(
            'daemon_listening_port'
          ),
          datapath: `kaleidoswap-${formatAccountName(nodeSetupForm.getValues('name'))}`,
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

      // Show success message
      toast.success('Wallet unlocked successfully!')

      // Navigate to trade path
      navigate(TRADE_PATH)
    } catch (error) {
      console.error('Unlock failed:', error)
      setIsNodeError(true)
      setNodeErrorMessage(
        error instanceof Error ? error.message : 'Failed to unlock node'
      )
      throw error
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleCancelUnlocking = async () => {
    setIsCancellingUnlock(true)
    try {
      // Stop the node
      await invoke('stop_node')
      toast.info('Node unlocking cancelled')
      handleStepChange('verify')
    } catch (error) {
      console.error('Error cancelling unlock:', error)
      toast.error('Failed to cancel unlocking')
    } finally {
      setIsUnlocking(false)
      setIsCancellingUnlock(false)
    }
  }

  const renderCurrentStep = () => {
    const renderStepLayout = (
      title: string,
      subtitle: string,
      icon: React.ReactNode,
      content: React.ReactNode,
      onBack?: () => void,
      maxWidth:
        | 'sm'
        | 'md'
        | 'lg'
        | 'xl'
        | '2xl'
        | '3xl'
        | '4xl'
        | '5xl'
        | '6xl' = '3xl',
      centered: boolean = false
    ) => (
      <SetupLayout
        centered={centered}
        fullHeight
        icon={icon}
        maxWidth={maxWidth}
        onBack={onBack}
        subtitle={subtitle}
        title={title}
      >
        <div className="mb-5">
          <StepIndicator currentStep={currentStep} steps={WALLET_INIT_STEPS} />
        </div>

        <div className="flex-1">{content}</div>
      </SetupLayout>
    )

    switch (currentStep) {
      case 'setup':
        return renderStepLayout(
          'Create New Wallet',
          'Set up your local node to create a new RGB Lightning wallet',
          <Wallet />,
          <div className="w-full">
            <NodeSetupForm
              errors={errors}
              form={nodeSetupForm}
              onSubmit={handleNodeSetup}
            />
          </div>,
          () => navigate(WALLET_SETUP_PATH)
        )

      case 'password':
        return renderStepLayout(
          'Create Password',
          'Set a strong password to secure your node',
          <Lock />,
          <div className="w-full">
            <PasswordSetupForm
              errors={errors}
              form={passwordForm}
              isPasswordVisible={isPasswordVisible}
              onSubmit={handlePasswordSetup}
              setIsPasswordVisible={setIsPasswordVisible}
            />
          </div>,
          () => handleBackNavigation()
        )

      case 'mnemonic':
        return renderStepLayout(
          'Recovery Phrase',
          'Save your recovery phrase in a secure location',
          <FileText />,
          <div className="w-full">
            <MnemonicDisplay
              mnemonic={mnemonic}
              onCopy={copyMnemonicToClipboard}
              onNext={() => handleStepChange('verify')}
            />
          </div>,
          () => handleBackNavigation()
        )

      case 'verify':
        return renderStepLayout(
          'Verify Recovery Phrase',
          "Confirm you've saved your recovery phrase correctly",
          <CheckCircle />,
          <div className="w-full">
            <MnemonicVerifyForm
              errors={errors}
              form={mnemonicForm}
              onSubmit={handleMnemonicVerify}
            />
          </div>,
          () => handleBackNavigation()
        )

      case 'unlock':
        return renderStepLayout(
          isNodeError ? 'Node Error' : 'Starting Node',
          isNodeError
            ? 'There was an error initializing your node'
            : 'Your node is being initialized',
          isNodeError ? <AlertTriangle /> : <Zap />,
          isNodeError ? (
            <Alert
              className="mb-4"
              icon={<AlertTriangle className="w-4 h-4" />}
              title="Node Error"
              variant="error"
            >
              <p className="text-sm">{nodeErrorMessage}</p>
              <div className="mt-4">
                <Button
                  onClick={() => handleStepChange('verify')}
                  size="sm"
                  variant="outline"
                >
                  Back to Verification
                </Button>
              </div>
            </Alert>
          ) : (
            <div className="w-full">
              <UnlockingProgress
                isUnlocking={isUnlocking}
                onBack={() => handleBackNavigation()}
                onCancel={
                  isUnlocking && !isCancellingUnlock
                    ? handleCancelUnlocking
                    : undefined
                }
              />
            </div>
          ),
          isNodeError ? () => handleStepChange('verify') : undefined,
          '3xl',
          false
        )

      default:
        return null
    }
  }

  return <Layout>{renderCurrentStep()}</Layout>
}

interface NodeSetupFormProps {
  form: UseFormReturn<NodeSetupFields>
  onSubmit: SubmitHandler<NodeSetupFields>
  errors: string[]
}

const NodeSetupForm = ({ form, onSubmit, errors }: NodeSetupFormProps) => {
  const selectedNetwork = form.watch('network')

  // Update effect to use network defaults
  useEffect(() => {
    const defaults = NETWORK_DEFAULTS[selectedNetwork]
    form.setValue('daemon_listening_port', defaults.daemon_listening_port)
    form.setValue('ldk_peer_listening_port', defaults.ldk_peer_listening_port)
    form.setValue('rpc_connection_url', defaults.rpc_connection_url)
    form.setValue('indexer_url', defaults.indexer_url)
    form.setValue('proxy_endpoint', defaults.proxy_endpoint)
  }, [selectedNetwork, form])

  return (
    <div className="w-full">
      <p className="text-slate-400 mb-6 leading-relaxed">
        Configure your node settings to create a new RGB Lightning wallet.
        Choose a name and network for your wallet.
      </p>

      <Card className="p-6 bg-blue-dark/40 border border-white/5">
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          {errors.length > 0 && (
            <Alert
              icon={<AlertCircle className="w-4 h-4" />}
              title="Error"
              variant="error"
            >
              <ul className="text-xs space-y-1">
                {errors.map((error, index) => (
                  <li className="flex items-center gap-1.5" key={index}>
                    <span>•</span> {error}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <SetupSection>
            <FormField
              description="This name will be used to identify your wallet"
              error={form.formState.errors.name?.message}
              htmlFor="name"
              label="Account Name"
            >
              <Input
                id="name"
                placeholder="My Bitcoin Wallet"
                {...form.register('name', {
                  required: 'Account name is required',
                })}
                error={!!form.formState.errors.name}
              />
            </FormField>

            <NetworkSelector
              className="mb-2"
              onChange={(network) => form.setValue('network', network)}
              selectedNetwork={selectedNetwork}
            />
          </SetupSection>

          <AdvancedSettings>
            <NetworkSettings form={form} />
          </AdvancedSettings>

          <div className="pt-3">
            <Button
              className="w-full"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              size="lg"
              type="submit"
              variant="primary"
            >
              Continue
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
