import { invoke } from '@tauri-apps/api'
import { ChevronDown } from 'lucide-react'
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
  network: 'regtest' | 'testnet' | 'mainnet' | 'signet'
  datapath: string
  rpc_connection_url: string
  indexer_url: string
  proxy_endpoint: string
  daemon_listening_port: string
  ldk_peer_listening_port: string
}

type SetupStep = 'setup' | 'password' | 'mnemonic' | 'verify'

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
      datapath: './kaleidoswap-node',
      name: 'Test Account',
      network: 'regtest',
      ...NETWORK_DEFAULTS['regtest'],
    },
  })

  const passwordForm = useForm<PasswordFields>({
    defaultValues: {
      confirmPassword: 'password',
      password: 'password',
    },
  })

  const mnemonicForm = useForm<MnemonicVerifyFields>({
    defaultValues: {
      mnemonic: '',
    },
  })

  const handleNodeSetup: SubmitHandler<NodeSetupFields> = async (data) => {
    try {
      const accountExists = await invoke('check_account_exists', {
        name: data.name,
      })
      if (accountExists) {
        setAdditionalErrors(['An account with this name already exists'])
        return
      }

      await dispatch(
        setSettingsAsync({
          datapath: data.datapath,
          indexer_url: data.indexer_url,
          name: data.name,
          network: data.network,
          node_url: `http://localhost:${data.daemon_listening_port}`,
          proxy_endpoint: data.proxy_endpoint,
          rpc_connection_url: data.rpc_connection_url,
        })
      )

      setCurrentStep('password')
    } catch (error) {
      console.error('Node setup failed:', error)
      toast.error('Failed to set up node. Please try again.')
    }
  }

  const handlePasswordSetup: SubmitHandler<PasswordFields> = async (data) => {
    setIsStartingNode(true)
    try {
      await invoke('start_node', {
        daemonListeningPort: '3001',
        datapath: nodeSetupForm.getValues('datapath'),
        ldkPeerListeningPort: '9735',
        network: nodeSetupForm.getValues('network'),
      })
      await new Promise((resolve) => setTimeout(resolve, 5000))
      console.log('init')
      const initResponse = await init({ password: data.password })
      if (!initResponse.isSuccess) {
        throw new Error(
          initResponse.error && 'data' in initResponse.error
            ? (initResponse.error.data as { error: string }).error
            : 'Initialization failed'
        )
      }

      await invoke('insert_account', {
        datapath: nodeSetupForm.getValues('datapath'),
        indexerUrl: nodeSetupForm.getValues('indexer_url'),
        name: nodeSetupForm.getValues('name'),
        network: nodeSetupForm.getValues('network'),
        nodeUrl: `http://localhost:${nodeSetupForm.getValues('daemon_listening_port')}`,
        proxyEndpoint: nodeSetupForm.getValues('proxy_endpoint'),
        rpcConnectionUrl: nodeSetupForm.getValues('rpc_connection_url'),
      })

      setNodePassword(data.password)
      setMnemonic(initResponse.data.mnemonic.split(' '))
      setCurrentStep('mnemonic')
      toast.success('Node initialized successfully!')
    } catch (error) {
      console.error('Password setup failed:', error)
      toast.error('Failed to initialize node. Please try again.')
      dispatch(nodeSettingsActions.resetNodeSettings())
      await invoke('stop_node')
    } finally {
      setIsStartingNode(false)
    }
  }

  const handleMnemonicVerify: SubmitHandler<MnemonicVerifyFields> = async (
    data
  ) => {
    if (mnemonic.join(' ') !== data.mnemonic.trim()) {
      setAdditionalErrors(['Mnemonic does not match'])
      return
    }

    const rpcConfig = parseRpcUrl(nodeSetupForm.getValues('rpc_connection_url'))
    const unlockResponse = await unlock({
      bitcoind_rpc_host: rpcConfig.host,
      bitcoind_rpc_password: rpcConfig.password,
      bitcoind_rpc_port: rpcConfig.port,
      bitcoind_rpc_username: rpcConfig.username,
      indexer_url: nodeSetupForm.getValues('indexer_url'),
      password: nodePassword,
      proxy_endpoint: nodeSetupForm.getValues('proxy_endpoint'),
    })

    if (unlockResponse.isSuccess) {
      const nodeInfoRes = await nodeInfo()
      if (nodeInfoRes.isSuccess) {
        navigate(TRADE_PATH)
      }
    } else {
      console.error('Node unlock failed:', unlockResponse.error)
      setAdditionalErrors(['Failed to unlock the node'])
    }
  }

  const copyMnemonicToClipboard = () => {
    navigator.clipboard
      .writeText(mnemonic.join(' '))
      .then(() => toast.success('Mnemonic copied to clipboard'))
      .catch(() => toast.error('Failed to copy mnemonic'))
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
            onBack={() => setCurrentStep('setup')}
            onSubmit={handlePasswordSetup}
            setIsPasswordVisible={setIsPasswordVisible}
          />
        )
      case 'mnemonic':
        return (
          <MnemonicDisplay
            mnemonic={mnemonic}
            onBack={() => setCurrentStep('password')}
            onCopy={copyMnemonicToClipboard}
            onNext={() => setCurrentStep('verify')}
          />
        )
      case 'verify':
        return (
          <MnemonicVerifyForm
            errors={additionalErrors}
            form={mnemonicForm}
            onBack={() => setCurrentStep('mnemonic')}
            onSubmit={handleMnemonicVerify}
          />
        )
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {/* <div> */}
        {/* <button
            className="px-3 py-1 rounded border text-sm border-gray-500"
            onClick={() => navigate(WALLET_SETUP_PATH)}
          >
            Go Back
          </button> */}
        {/* </div> */}
        {renderCurrentStep()}
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
    <>
      <div className="flex justify-between">
        <button
          className="px-4 py-2 rounded-full border text-sm border-gray-500 hover:bg-gray-700 transition-colors"
          onClick={() => navigate(WALLET_SETUP_PATH)}
          type="button"
        >
          ← Back
        </button>
      </div>
      <div className="text-center mb-10">
        <h3 className="text-2xl font-semibold mb-4">
          Set Up Your Kaleidoswap Node
        </h3>
        <p>Configure your node settings to begin the initialization process.</p>
      </div>
      <form
        className="flex items-center justify-center flex-col"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="w-80 space-y-4">
          {/* Account Name Field */}
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
            <div className="text-sm text-red mt-2">
              {form.formState.errors.name?.message}
            </div>
          </div>

          {/* Datapath Field */}
          <div>
            <div className="text-xs mb-3">Datapath</div>
            <div className="relative">
              <input
                className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                type="text"
                {...form.register('datapath', { required: 'Required' })}
              />
            </div>
            <div className="text-sm text-red mt-2">
              {form.formState.errors.datapath?.message}
            </div>
          </div>

          {/* Network Selection */}
          <div>
            <div className="text-xs mb-3">Network</div>
            <div className="relative">
              <select
                className="block w-full pl-3 pr-10 py-2 text-white bg-gray-700 border border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...form.register('network', { required: 'Required' })}
              >
                <option value="mainnet">Mainnet</option>
                <option value="testnet">Testnet</option>
                <option value="signet">Signet</option>
                <option value="regtest">Regtest</option>
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
            <div className="text-sm text-red mt-2">
              {form.formState.errors.network?.message}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
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

          {/* Advanced Settings Section */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-700">
              {/* RPC Connection URL */}
              <div>
                <div className="text-xs mb-3">Bitcoind RPC Connection URL</div>
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

              {/* Indexer URL */}
              <div>
                <div className="text-xs mb-3">
                  Indexer URL (electrum server)
                </div>
                <div className="relative">
                  <input
                    className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                    placeholder="Enter the indexer URL"
                    type="text"
                    {...form.register('indexer_url', { required: 'Required' })}
                  />
                </div>
                <div className="text-sm text-red mt-2">
                  {form.formState.errors.indexer_url?.message}
                </div>
              </div>

              {/* Proxy Endpoint */}
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

              {/* Node Port */}
              <div>
                <div className="text-xs mb-3">API Node Port</div>
                <div className="relative">
                  <input
                    className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                    placeholder="Enter the node port"
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
            </div>
          )}

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="text-sm text-red">
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex self-end justify-end mt-8">
          <button
            className="px-6 py-3 rounded border text-lg font-bold border-cyan"
            type="submit"
          >
            Continue to Password Setup
          </button>
        </div>
      </form>
    </>
  )
}
