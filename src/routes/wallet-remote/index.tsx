import { invoke } from '@tauri-apps/api/core'
import { ChevronDown, ChevronLeft, Cloud } from 'lucide-react'
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
  const [isStartingNode] = useState(false)

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

  const [showAdvanced, setShowAdvanced] = useState(false)

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
              <Cloud className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Connect Remote Node
            </h1>
          </div>

          {isStartingNode ? (
            <div className="py-20 flex flex-col items-center space-y-4">
              <Spinner />
              <div className="text-center text-gray-300">
                Connecting to your node. This may take a few moments...
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="max-w-3xl mx-auto">
                  <div className="max-w-xl mx-auto w-full">
                    <div className="w-full max-w-md mx-auto space-y-6">
                      <div>
                        <div className="text-sm font-medium mb-2 text-slate-300">
                          Account Name
                        </div>
                        <div className="relative">
                          <input
                            className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
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
                        <div className="text-sm font-medium mb-2 text-slate-300">
                          RGB Lightning Node URL
                        </div>
                        <div className="relative">
                          <input
                            className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
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
                        <div className="text-sm font-medium mb-2 text-slate-300">
                          Network
                        </div>
                        <div className="relative">
                          <select
                            className="w-full px-4 py-3 appearance-none
                                       bg-blue-dark/40 border border-divider/20 rounded-lg 
                                       focus:outline-none focus:ring-2 focus:ring-cyan 
                                       text-slate-300 cursor-pointer
                                       transition-all"
                            {...form.register('network', {
                              required: 'Required',
                            })}
                          >
                            <option
                              className="bg-blue-darkest text-slate-300"
                              value="Testnet"
                            >
                              Testnet
                            </option>
                            <option
                              className="bg-blue-darkest text-slate-300"
                              value="Regtest"
                            >
                              Regtest
                            </option>
                            <option
                              className="bg-blue-darkest text-slate-300"
                              value="Signet"
                            >
                              Signet
                            </option>
                          </select>
                          <div
                            className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none
                                          text-slate-400 border-l border-divider/20"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="text-sm text-red mt-2">
                          {form.formState.errors.network?.message}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 px-1">
                        <input
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan focus:ring-cyan/20"
                          id="useAuth"
                          type="checkbox"
                          {...form.register('useAuth')}
                        />
                        <label
                          className="text-sm text-slate-300"
                          htmlFor="useAuth"
                        >
                          Use Authentication for Remote Node
                        </label>
                      </div>

                      {form.watch('useAuth') && (
                        <div>
                          <div className="text-sm font-medium mb-2 text-slate-300">
                            Authentication Token
                          </div>
                          <div className="relative">
                            <input
                              className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
                              placeholder="Enter your auth token"
                              type="password"
                              {...form.register('authToken', {
                                required: form.watch('useAuth')
                                  ? 'Required when using authentication'
                                  : false,
                              })}
                            />
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            Token will be used to authenticate with the remote
                            node
                          </div>
                          <div className="text-sm text-red mt-2">
                            {form.formState.errors.authToken?.message}
                          </div>
                        </div>
                      )}

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

                      {showAdvanced && (
                        <div className="space-y-6 pt-4 border-t border-slate-800">
                          <div>
                            <div className="text-sm font-medium mb-2 text-slate-300">
                              RPC Connection URL
                            </div>
                            <div className="relative">
                              <input
                                className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
                                type="text"
                                {...form.register('rpc_connection_url', {
                                  required: 'Required',
                                })}
                              />
                            </div>
                            <div className="text-sm text-slate-400 mt-1">
                              Example: user:password@localhost:18443
                            </div>
                            <div className="text-sm text-red mt-2">
                              {
                                form.formState.errors.rpc_connection_url
                                  ?.message
                              }
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium mb-2 text-slate-300">
                              Indexer URL (electrum server)
                            </div>
                            <div className="relative">
                              <input
                                className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
                                type="text"
                                {...form.register('indexer_url', {
                                  required: 'Required',
                                })}
                              />
                            </div>
                            <div className="text-sm text-slate-400 mt-1">
                              Example: 127.0.0.1:50001
                            </div>
                            <div className="text-sm text-red mt-2">
                              {form.formState.errors.indexer_url?.message}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium mb-2 text-slate-300">
                              RGB Proxy Endpoint
                            </div>
                            <div className="relative">
                              <input
                                className="w-full px-4 py-3 bg-blue-dark/40 border border-divider/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
                                type="text"
                                {...form.register('proxy_endpoint', {
                                  required: 'Required',
                                })}
                              />
                            </div>
                            <div className="text-sm text-slate-400 mt-1">
                              Example: rpc://127.0.0.1:3000/json-rpc
                            </div>
                            <div className="text-sm text-red mt-2">
                              {form.formState.errors.proxy_endpoint?.message}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end mt-8">
                      <button
                        className="px-6 py-3 rounded-lg bg-cyan text-blue-darkest font-semibold 
                          hover:bg-cyan/90 transition-colors duration-200
                          focus:ring-2 focus:ring-cyan/20 focus:outline-none
                          flex items-center justify-center gap-2 min-w-[160px]
                          disabled:opacity-50 disabled:cursor-not-allowed"
                        type="submit"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
