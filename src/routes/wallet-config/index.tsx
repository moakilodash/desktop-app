//import { appWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import { EyeIcon } from '../../icons/Eye'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import {
  nodeSettingsActions,
  setSettingsAsync,
} from '../../slices/nodeSettings/nodeSettings.slice'

interface Fields {
  name: string
  network: 'regtest' | 'testnet' | 'mainnet'
  datapath: string
  rpc_connection_url: string
  password: string
  confirmPassword: string
  node_url: string
}

export const Component = () => {
  const [isStartingNode, setIsStartingNode] = useState(false)
  const [isRemoteNode, setIsRemoteNode] = useState(true)

  const [unlock, unlockResponse] = nodeApi.endpoints.unlock.useLazyQuery()
  const dispatch = useAppDispatch()

  const navigate = useNavigate()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const { data: nodeSettingsData } = useAppSelector(
    (state) => state.nodeSettings
  )
  console.log('Node Settings: ', nodeSettingsData)

  const form = useForm<Fields>({
    defaultValues: {
      datapath: 'dataldk',
      name: 'Test Account',
      network: 'regtest',
      node_url: 'http://localhost:3001',
      password: 'password',
      rpc_connection_url: 'user:password@localhost:18443',
    },
  })

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    if (data.node_url === '') {
      try {
        setIsStartingNode(true)
        await invoke('start_node', {
          datapath: data.datapath,
          network: data.network,
          rpcConnectionUrl: data.rpc_connection_url,
        })
        await new Promise((resolve) => setTimeout(resolve, 5000))
      } catch (error) {
        console.log(error)
        toast.error('Failed to start the node...')
      } finally {
        setIsStartingNode(false)
      }
    }

    console.log('Changing Node Settings')
    await dispatch(
      setSettingsAsync({
        datapath: data.datapath,
        name: data.name,
        network: data.network,
        node_url: data.node_url || 'http://localhost:3001',
        rpc_connection_url: data.rpc_connection_url,
      })
    )
    console.log('Node Settings: ', nodeSettingsData)

    console.log('Unlocking the node...')
    const unlockResponse = await unlock({ password: data.password })
    if (unlockResponse.isSuccess) {
      try {
        await invoke('insert_account', {
          datapath: data.datapath,
          name: data.name,
          network: data.network,
          nodeUrl: data.node_url || 'http://localhost:3001',
          rpcConnectionUrl: data.rpc_connection_url,
        })
        navigate(TRADE_PATH)
      } catch (error) {
        console.log(error)
        toast.error('Failed to insert account...')
        dispatch(nodeSettingsActions.resetNodeSettings())
        await invoke('stop_node')
      }
    } else if (unlockResponse.error && 'data' in unlockResponse.error) {
      const errorData = unlockResponse.error.data as {
        error?: string
        code?: number
      }
      if (
        errorData.error === 'Node is unlocked (hint: call lock)' &&
        errorData.code === 403
      ) {
        // Node is already unlocked, proceed to trade path
        try {
          await invoke('insert_account', {
            datapath: data.datapath,
            name: data.name,
            network: data.network,
            nodeUrl: data.node_url || 'http://localhost:3001',
            rpcConnectionUrl: data.rpc_connection_url,
          })
          navigate(TRADE_PATH)
        } catch (error) {
          console.log(error)
          toast.error('Failed to insert account...')
          dispatch(nodeSettingsActions.resetNodeSettings())
          await invoke('stop_node')
        }
      } else {
        console.log('Failed to unlock the node...')
        console.log(unlockResponse.error)
        toast.error('Failed to unlock the node...')
        dispatch(nodeSettingsActions.resetNodeSettings())
        await invoke('stop_node')
      }
    } else {
      // Handle other error cases
      console.log('Failed to unlock the node...')
      console.log(unlockResponse.error)
      toast.error('Failed to unlock the node...')
      dispatch(nodeSettingsActions.resetNodeSettings())
      await invoke('stop_node')
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {unlockResponse.isLoading || isStartingNode ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={10} />
            <div className="text-center">Configuring the node...</div>
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
                Configure your wallet
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
                    <div className="text-xs mb-3">
                      Remote Node (check if you have a remote node)
                    </div>
                    <div className="relative">
                      <input
                        checked={isRemoteNode}
                        className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                        onChange={(e) => setIsRemoteNode(e.target.checked)}
                        type="checkbox"
                      />
                    </div>
                  </div>
                  {!isRemoteNode ? (
                    <div>
                      <div className="text-xs mb-3">Datapath</div>
                      <div className="relative">
                        <input
                          className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          type="text"
                          {...form.register('datapath', {
                            required: 'Required',
                          })}
                        />
                      </div>
                      <div className="text-sm text-red mt-2">
                        {form.formState.errors.datapath?.message}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs mb-3">Node URL</div>
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
                  )}
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
                    <div className="text-xs mb-3">Your Password</div>
                    <div className="relative">
                      <input
                        className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                        type={isPasswordVisible ? 'text' : 'password'}
                        {...form.register('password', {
                          minLength: {
                            message: 'Password must be at least 8 characters',
                            value: 8,
                          },
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
                  </div>
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
