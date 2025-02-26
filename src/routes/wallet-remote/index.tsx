import { invoke } from '@tauri-apps/api/core'
import { Cloud, ArrowRight, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import {
  TRADE_PATH,
  WALLET_SETUP_PATH,
  WALLET_UNLOCK_PATH,
} from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Layout } from '../../components/Layout'
import { NetworkSelector } from '../../components/NetworkSelector'
import {
  Button,
  Card,
  Alert,
  SetupLayout,
  SetupSection,
  FormField,
  Input,
  PasswordInput,
  Spinner,
  AdvancedSettings,
  NetworkSettings,
} from '../../components/ui'
import { BitcoinNetwork } from '../../constants'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import {
  nodeSettingsActions,
  setSettingsAsync,
} from '../../slices/nodeSettings/nodeSettings.slice'

interface Fields {
  name: string
  network: BitcoinNetwork
  node_url: string
  rpc_connection_url: string
  indexer_url: string
  proxy_endpoint: string
  password: string
  useAuth: boolean
  authToken: string
  daemon_listening_port: string
  ldk_peer_listening_port: string
}

export const Component = () => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isNodeError, setIsNodeError] = useState(false)
  const [nodeErrorMessage, setNodeErrorMessage] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const dispatch = useAppDispatch()

  const navigate = useNavigate()

  const { data: nodeSettingsData } = useAppSelector(
    (state) => state.nodeSettings
  )
  console.log('Node Settings: ', nodeSettingsData)

  const form = useForm<Fields>({
    defaultValues: {
      authToken: '',
      daemon_listening_port: '3001',
      indexer_url: 'electrs:50001',
      ldk_peer_listening_port: '9735',
      name: 'Test Account',
      network: 'Regtest',
      node_url: `http://localhost:${NETWORK_DEFAULTS.Regtest.daemon_listening_port}`,
      password: 'password',
      proxy_endpoint: 'rpc://proxy:3000/json-rpc',
      rpc_connection_url: 'user:password@bitcoind:18443',
      useAuth: false,
    },
  })

  // Update effect to use network defaults
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'network' && value.network) {
        const defaults = NETWORK_DEFAULTS[value.network]
        if (value.network === 'Regtest') {
          form.setValue('rpc_connection_url', 'http://bitcoind:18443')
          form.setValue('indexer_url', 'electrs:50001')
          form.setValue('proxy_endpoint', 'http://proxy:3000/json-rpc')
        } else {
          form.setValue('rpc_connection_url', defaults.rpc_connection_url)
          form.setValue('indexer_url', defaults.indexer_url)
          form.setValue('proxy_endpoint', defaults.proxy_endpoint)
        }
        form.setValue(
          'node_url',
          `http://localhost:${defaults.daemon_listening_port}`
        )
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    setIsConnecting(true)
    setIsNodeError(false)

    // Check if account with the same name already exists
    try {
      const accountExists = await invoke('check_account_exists', {
        name: data.name,
      })
      if (accountExists) {
        setIsNodeError(true)
        setNodeErrorMessage('An account with this name already exists')
        toast.error('An account with this name already exists')
        setIsConnecting(false)
        return
      }
    } catch (error) {
      console.error('Failed to check account existence:', error)
      setIsNodeError(true)
      setNodeErrorMessage(
        'Failed to check account existence. Please try again.'
      )
      toast.error('Failed to check account existence. Please try again.')
      setIsConnecting(false)
      return
    }

    // Save node settings
    const defaultMakerUrl = NETWORK_DEFAULTS[data.network].default_maker_url

    await dispatch(
      setSettingsAsync({
        daemon_listening_port: data.daemon_listening_port,
        datapath: '',
        default_lsp_url: NETWORK_DEFAULTS[data.network].default_lsp_url,
        default_maker_url: defaultMakerUrl,
        indexer_url: data.indexer_url,
        ldk_peer_listening_port: data.ldk_peer_listening_port,
        maker_urls: [defaultMakerUrl],
        name: data.name,
        network: data.network,
        node_url: data.node_url,
        proxy_endpoint: data.proxy_endpoint,
        rpc_connection_url: data.rpc_connection_url,
      })
    )

    // Insert account
    await invoke('insert_account', {
      daemonListeningPort: '',
      datapath: '',
      defaultLspUrl: NETWORK_DEFAULTS[data.network].default_lsp_url,
      defaultMakerUrl,
      indexerUrl: data.indexer_url,
      // Empty for remote nodes
      ldkPeerListeningPort: '',

      makerUrls: defaultMakerUrl,

      name: data.name,

      network: data.network,

      nodeUrl: data.node_url,

      proxyEndpoint: data.proxy_endpoint,
      rpcConnectionUrl: data.rpc_connection_url, // Empty for remote nodes
    })

    // Set as current account
    await invoke('set_current_account', { accountName: data.name })

    try {
      // Check node status
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (data.useAuth && data.authToken) {
        headers['Authorization'] = `Bearer ${data.authToken}`
      }

      const response = await fetch(`${data.node_url}/nodeinfo`, {
        headers,
        method: 'GET',
      })

      if (response.status === 403) {
        navigate(WALLET_UNLOCK_PATH)
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      navigate(TRADE_PATH)
    } catch (error) {
      console.error('Failed to setup remote node:', error)
      toast.error('Failed to setup remote node. Please check your settings.')
      dispatch(nodeSettingsActions.resetNodeSettings())
    }
  }

  return (
    <Layout>
      <SetupLayout
        centered
        fullHeight
        icon={<Cloud />}
        maxWidth="3xl"
        onBack={() => navigate(WALLET_SETUP_PATH)}
        subtitle="Enter the details of your remote RGB Lightning node"
        title="Connect to Remote Node"
      >
        {isNodeError && (
          <Alert
            className="mb-4"
            icon={<AlertTriangle className="w-4 h-4" />}
            title="Connection Error"
            variant="error"
          >
            <p className="text-sm">{nodeErrorMessage}</p>
          </Alert>
        )}

        <div className="w-full">
          <p className="text-slate-400 mb-6 leading-relaxed">
            Configure your remote node connection settings. Enter the details of
            your existing RGB Lightning node.
          </p>

          <Card className="p-6 bg-blue-dark/40 border border-white/5">
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <SetupSection>
                <FormField
                  description="This name will be used to identify your remote node connection"
                  error={form.formState.errors.name?.message}
                  htmlFor="name"
                  label="Account Name"
                >
                  <Input
                    id="name"
                    placeholder="My Remote Node"
                    {...form.register('name', {
                      required: 'Account name is required',
                    })}
                    error={!!form.formState.errors.name}
                  />
                </FormField>

                <NetworkSelector
                  className="mb-2"
                  onChange={(network) => form.setValue('network', network)}
                  selectedNetwork={form.watch('network')}
                />

                <FormField
                  description="The URL of your remote RGB Lightning node"
                  error={form.formState.errors.node_url?.message}
                  htmlFor="node_url"
                  label="Node URL"
                >
                  <Input
                    id="node_url"
                    placeholder="http://your-node-url:3000"
                    {...form.register('node_url', {
                      required: 'Node URL is required',
                    })}
                    error={!!form.formState.errors.node_url}
                  />
                </FormField>

                <FormField
                  error={form.formState.errors.password?.message}
                  htmlFor="password"
                  label="Node Password"
                >
                  <PasswordInput
                    id="password"
                    isVisible={isPasswordVisible}
                    onToggleVisibility={() =>
                      setIsPasswordVisible(!isPasswordVisible)
                    }
                    placeholder="Password"
                    {...form.register('password', {
                      required: 'Password is required',
                    })}
                    error={!!form.formState.errors.password}
                  />
                </FormField>
              </SetupSection>

              <AdvancedSettings>
                <NetworkSettings form={form} />

                <div className="p-2.5 bg-blue-dark/40 rounded-lg border border-slate-700/30 mt-4">
                  <div className="flex items-center mb-2.5">
                    <input
                      className="w-3.5 h-3.5 text-cyan bg-blue-dark border-gray-600 rounded focus:ring-cyan"
                      id="useAuth"
                      type="checkbox"
                      {...form.register('useAuth')}
                    />
                    <label
                      className="ml-2 text-xs font-medium text-gray-300"
                      htmlFor="useAuth"
                    >
                      Use Authentication Token
                    </label>
                  </div>

                  {form.watch('useAuth') && (
                    <FormField
                      error={form.formState.errors.authToken?.message}
                      htmlFor="authToken"
                      label="Authentication Token"
                    >
                      <Input
                        id="authToken"
                        {...form.register('authToken', {
                          required: form.watch('useAuth')
                            ? 'Authentication token is required'
                            : false,
                        })}
                        error={!!form.formState.errors.authToken}
                      />
                    </FormField>
                  )}
                </div>
              </AdvancedSettings>

              <div className="pt-3">
                <Button
                  className="w-full"
                  disabled={isConnecting}
                  icon={
                    isConnecting ? (
                      <Spinner size="sm" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )
                  }
                  iconPosition="right"
                  size="lg"
                  type="submit"
                  variant="primary"
                >
                  {isConnecting ? 'Connecting...' : 'Connect to Node'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </SetupLayout>
    </Layout>
  )
}
