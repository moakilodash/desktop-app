import { invoke } from '@tauri-apps/api'
import { ChevronDown } from 'lucide-react'
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
import { Spinner } from '../../components/Spinner'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import {
  nodeSettingsActions,
  setSettingsAsync,
} from '../../slices/nodeSettings/nodeSettings.slice'

interface Fields {
  name: string
  network: 'regtest' | 'testnet' | 'mainnet' | 'signet'
  node_url: string
  rpc_connection_url: string
  indexer_url: string
  proxy_endpoint: string
  password: string
  useAuth: boolean
  authToken: string
}

export const Component = () => {
  const [isStartingNode] = useState(false)

  const dispatch = useAppDispatch()

  const navigate = useNavigate()

  const { data: nodeSettingsData } = useAppSelector(
    (state) => state.nodeSettings
  )
  console.log('Node Settings: ', nodeSettingsData)

  const form = useForm<Fields>({
    defaultValues: {
      name: 'Test Account',
      network: 'regtest',
      node_url: `http://localhost:${NETWORK_DEFAULTS.regtest.node_port}`,
      password: 'password',
      ...NETWORK_DEFAULTS.regtest,
      authToken: '',
      useAuth: false,
    },
  })

  // Update effect to use network defaults
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'network' && value.network) {
        const defaults = NETWORK_DEFAULTS[value.network]
        form.setValue('rpc_connection_url', defaults.rpc_connection_url)
        form.setValue('indexer_url', defaults.indexer_url)
        form.setValue('proxy_endpoint', defaults.proxy_endpoint)
        form.setValue('node_url', `http://localhost:${defaults.node_port}`)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    // Check if account with the same name already exists
    try {
      const accountExists = await invoke('check_account_exists', {
        name: data.name,
      })
      if (accountExists) {
        toast.error('An account with this name already exists')
        return
      }
    } catch (error) {
      console.error('Failed to check account existence:', error)
      toast.error('Failed to check account existence. Please try again.')
      return
    }

    // Save node settings first
    try {
      await dispatch(
        setSettingsAsync({
          datapath: '',
          indexer_url: data.indexer_url,
          name: data.name,
          network: data.network,
          node_url: data.node_url,
          proxy_endpoint: data.proxy_endpoint,
          rpc_connection_url: data.rpc_connection_url,
        })
      )

      // Check node status with direct fetch
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      // Add auth token if enabled
      if (data.useAuth && data.authToken) {
        headers['Authorization'] = `Bearer ${data.authToken}`
      }

      const response = await fetch(`${data.node_url}/nodeinfo`, {
        headers,
        method: 'GET',
      })

      try {
        await invoke('insert_account', {
          datapath: '',
          indexerUrl: data.indexer_url,
          name: data.name,
          network: data.network,
          nodeUrl: data.node_url,
          proxyEndpoint: data.proxy_endpoint,
          rpcConnectionUrl: data.rpc_connection_url,
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
        console.error('Failed to insert account:', error)
        toast.error('Failed to insert account...')
        dispatch(nodeSettingsActions.resetNodeSettings())
      }
    } catch (error: any) {
      console.error('Failed to connect to node:', error)
      toast.error('Failed to connect to node. Please check your settings.')
      dispatch(nodeSettingsActions.resetNodeSettings())
    }
  }

  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {isStartingNode ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={20} />
            <div className="text-center">Connecting to the node...</div>
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
                Connect to your remote node
              </h3>
            </div>
            <div>
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
                        type="text"
                        {...form.register('name', {
                          required: 'Required',
                        })}
                      />
                    </div>
                    <div className="text-sm text-red mt-2">
                      {form.formState.errors.name?.message}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-3">RGB Lightning Node URL</div>
                    <div className="relative">
                      <input
                        className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                        type="text"
                        {...form.register('node_url', {
                          required: 'Required',
                        })}
                      />
                    </div>
                    <div className="text-sm text-red mt-2">
                      {form.formState.errors.node_url?.message}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-3">Network</div>
                    <div className="relative">
                      <select
                        className="block w-full pl-3 pr-10 py-2 text-white bg-gray-700 border border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...form.register('network', { required: 'Required' })}
                      >
                        <option value="mainnet">Mainnet</option>
                        <option value="testnet">Testnet</option>
                        <option value="regtest">Regtest</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="text-sm text-red mt-2">
                      {form.formState.errors.network?.message}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      className="w-4 h-4 rounded border-gray-300"
                      id="useAuth"
                      type="checkbox"
                      {...form.register('useAuth')}
                    />
                    <label className="text-sm text-gray-300" htmlFor="useAuth">
                      Use Authentication for Remote Node
                    </label>
                  </div>
                  {form.watch('useAuth') && (
                    <div>
                      <div className="text-xs mb-3">Authentication Token</div>
                      <div className="relative">
                        <input
                          className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          placeholder="Enter your auth token"
                          type="password"
                          {...form.register('authToken', {
                            required: form.watch('useAuth')
                              ? 'Required when using authentication'
                              : false,
                          })}
                        />
                      </div>
                      <div className="text-sm text-gray-400">
                        Token will be used to authenticate with the remote node
                      </div>
                      <div className="text-sm text-red mt-2">
                        {form.formState.errors.authToken?.message}
                      </div>
                    </div>
                  )}
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
                        <div className="text-xs mb-3">RPC Connection URL</div>
                        <div className="relative">
                          <input
                            className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                            type="text"
                            {...form.register('rpc_connection_url', {
                              required: 'Required',
                            })}
                          />
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
                            type="text"
                            {...form.register('indexer_url', {
                              required: 'Required',
                            })}
                          />
                        </div>
                        <div className="text-sm text-gray-400">
                          Example: 127.0.0.1:50001
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
                            type="text"
                            {...form.register('proxy_endpoint', {
                              required: 'Required',
                            })}
                          />
                        </div>
                        <div className="text-sm text-gray-400">
                          Example: rpc://127.0.0.1:3000/json-rpc
                        </div>
                        <div className="text-sm text-red mt-2">
                          {form.formState.errors.proxy_endpoint?.message}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex self-end justify-end mt-8">
                  <button
                    className="px-6 py-3 rounded border text-lg font-bold border-cyan"
                    type="submit"
                  >
                    Proceed
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
