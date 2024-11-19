import { invoke } from '@tauri-apps/api'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import { BitcoinNetwork } from '../../constants'
import { NETWORK_DEFAULTS } from '../../constants/networks'
import { EyeIcon } from '../../icons/Eye'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface Fields {
  name: string
  datapath: string
  network: BitcoinNetwork
  rpc_connection_url: string
  backup_path: string
  password: string
}

export const Component = () => {
  const [isStartingNode, setIsStartingNode] = useState<boolean>(false)

  const [restore, restoreResponse] = nodeApi.endpoints.restore.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const navigate = useNavigate()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [additionalErrors, setAdditionalErrors] = useState<Array<string>>([])

  const form = useForm<Fields>({
    defaultValues: {
      backup_path: '/var/node_backups/user_node',
      datapath: '',
      name: '',
      network: 'regtest',
      password: '',
      rpc_connection_url: 'user:password@localhost:18443',
    },
  })

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    let nodeInfoRes = await nodeInfo()
    if (nodeInfoRes.isSuccess) {
      navigate(TRADE_PATH)
      return
    }

    try {
      setIsStartingNode(true)
      await invoke('start_node', {
        daemonListeningPort: '3001',
        datapath: data.datapath,
        ldkPeerListeningPort: '9735',
        network: data.network,
      })
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } catch (error) {
      console.log(error)
      toast.error('Failed to start the node...')
    } finally {
      setIsStartingNode(false)
    }

    const restoreResponse = await restore({
      backup_path: data.backup_path,
      password: data.password,
    })

    if (restoreResponse.isSuccess) {
      try {
        await invoke('insert_account', {
          datapath: data.datapath,
          defaultLspUrl: NETWORK_DEFAULTS[data.network].default_lsp_url,
          name: data.name,
          network: data.network,
          rpcConnectionUrl: data.rpc_connection_url,
        })
      } catch (error) {
        console.log(error)
        await invoke('stop_node')
        toast.error('Failed to insert the account...')
      }
      nodeInfoRes = await nodeInfo()
      if (nodeInfoRes.isSuccess) {
        navigate(TRADE_PATH)
      }
    } else {
      setAdditionalErrors((s) => [...s, 'Failed to restore wallet'])
      await invoke('stop_node')
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {restoreResponse.isLoading || isStartingNode ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={20} />

            <div className="text-center">Restoring the node...</div>
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
                      <ul>
                        {additionalErrors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
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
                      <ul>
                        {additionalErrors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
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
                      <ul>
                        {additionalErrors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
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
                      <ul>
                        {additionalErrors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-3">Backup Path</div>

                    <div className="relative">
                      <input
                        className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                        type="text"
                        {...form.register('backup_path')}
                      />
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
