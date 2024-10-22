import { invoke } from '@tauri-apps/api'
import { ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
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

interface FieldsVerify {
  mnemonic: string
}

export const Component = () => {
  const [isStartingNode, setIsStartingNode] = useState(false)
  const [isRemoteNode, setIsRemoteNode] = useState(true)

  const [init, initResponse] = nodeApi.endpoints.init.useLazyQuery()
  const [unlock, unlockResponse] = nodeApi.endpoints.unlock.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const dispatch = useAppDispatch()

  const navigate = useNavigate()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [additionalErrors, setAdditionalErrors] = useState<Array<string>>([])

  const [isShowingMnemonic, setIsShowingMnemonic] = useState(false)
  const [mnemonic, setMnemonic] = useState<Array<string>>([])
  const [password, setPassword] = useState('')

  const [isVerifyingMnemonic, setIsVerifyingMnemonic] = useState(false)

  const { data: nodeSettingsData } = useAppSelector(
    (state) => state.nodeSettings
  )
  console.log('Node Settings: ', nodeSettingsData)

  const form = useForm<Fields>({
    defaultValues: {
      confirmPassword: 'password',
      datapath: '',
      name: 'Test Account',
      network: 'regtest',
      node_url: 'http://localhost:3001',
      password: 'password',
      rpc_connection_url: 'user:password@localhost:18443',
    },
  })

  const formVerify = useForm<FieldsVerify>({
    defaultValues: {
      mnemonic: '',
    },
  })

  // Add this effect to update RPC connection URL when network changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'network' && value.network === 'testnet') {
        form.setValue(
          'rpc_connection_url',
          'user:password@electrum.iriswallet.com:18332'
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
        setAdditionalErrors((s) => [
          ...s,
          'An account with this name already exists',
        ])
        return
      }
    } catch (error) {
      console.error('Failed to check account existence:', error)
      toast.error('Failed to check account existence. Please try again.')
      return
    }

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
        console.error('Failed to start the node:', error)
        toast.error(
          'Failed to start the node. Please check your settings and try again.'
        )
        setIsStartingNode(false)
        return
      } finally {
        setIsStartingNode(false)
      }
    }

    console.log('Changing Node Settings')
    try {
      await dispatch(
        setSettingsAsync({
          datapath: data.datapath,
          name: data.name,
          network: data.network,
          node_url: data.node_url || 'http://localhost:3001',
          rpc_connection_url: data.rpc_connection_url,
        })
      )
    } catch (error) {
      console.error('Failed to set node settings:', error)
      toast.error('Failed to save node settings. Please try again.')
      return
    }

    console.log('Initializing the node...')
    const initResponse = await init({ password: data.password })
    if (!initResponse.isSuccess) {
      const error: any = initResponse.error
      if (error.data?.error === 'Node has already been initialized') {
        toast.error(
          'Node has already been initialized. Please use existing credentials.'
        )
      } else {
        toast.error(
          'Failed to initialize the node. Please check your settings and try again.'
        )
      }
      dispatch(nodeSettingsActions.resetNodeSettings())
      await invoke('stop_node')
      return
    }

    try {
      await invoke('insert_account', {
        datapath: data.datapath,
        name: data.name,
        network: data.network,
        nodeUrl: data.node_url || 'http://localhost:3001',
        rpcConnectionUrl: data.rpc_connection_url,
      })
    } catch (error) {
      console.error('Failed to save account:', error)
      dispatch(nodeSettingsActions.resetNodeSettings())
      await invoke('stop_node')
      toast.error('Failed to save account. Please try again.')
      return
    }

    setMnemonic(initResponse.data.mnemonic.split(' '))
    setPassword(data.password)
    setIsShowingMnemonic(true)
    toast.success('Node initialized successfully!')
  }

  const onMnemonicSaved = async () => {
    setIsVerifyingMnemonic(true)
    setIsShowingMnemonic(false)
  }

  const onMnemonicVerify: SubmitHandler<FieldsVerify> = async (data) => {
    if (mnemonic.join(' ') !== data.mnemonic.trim()) {
      setAdditionalErrors((s) => [...s, 'Mnemonic does not match...'])
      return
    }

    const unlockResponse = await unlock({ password })
    if (unlockResponse.isSuccess) {
      const nodeInfoRes = await nodeInfo()
      if (nodeInfoRes.isSuccess) {
        navigate(TRADE_PATH)
      }
    } else {
      console.log('Failed to unlock the node...')
      console.log(unlockResponse.error)
      setAdditionalErrors((s) => [...s, 'Failed to unlock the node...'])
    }
  }

  const copyMnemonicToClipboard = () => {
    navigator.clipboard.writeText(mnemonic.join(' ')).then(
      () => {
        toast.success('Mnemonic copied to clipboard')
      },
      () => {
        toast.error('Failed to copy mnemonic')
      }
    )
  }

  // useEffect(() => {
  //   dispatch(readSettings())
  // }, [])

  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {initResponse.isLoading ||
        unlockResponse.isLoading ||
        isStartingNode ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner />
            <div className="text-center">
              Initializing your node. This may take a few moments...
            </div>
          </div>
        ) : isShowingMnemonic ? (
          <>
            <div>
              <button
                className="px-3 py-1 rounded border text-sm border-gray-500"
                onClick={() => navigate(WALLET_SETUP_PATH)}
              >
                Go Back
              </button>
            </div>
            <div className="py-20 flex flex-col items-center space-y-4">
              <h3 className="text-2xl font-semibold mb-4">
                Secure Your Wallet: Save Your Recovery Phrase
              </h3>
              <p className="text-red-500 text-center">
                Warning: Your recovery phrase is the key to your wallet. Write
                it down and store it in a secure location. Never share it with
                anyone.
              </p>
              <div className="grid grid-cols-4 gap-4">
                {mnemonic.map((word, i) => (
                  <div
                    className="border p-4 text-center bg-gray-600 rounded"
                    key={i}
                  >
                    {i + 1}. {word}
                  </div>
                ))}
              </div>
              <button
                className="px-6 py-3 mt-4 rounded border font-bold border-cyan"
                onClick={copyMnemonicToClipboard}
              >
                Copy Recovery Phrase
              </button>
              <div className="flex self-center justify-center mt-8">
                <button
                  className="px-6 py-3 mt-7 rounded border font-bold border-cyan"
                  onClick={onMnemonicSaved}
                >
                  I've Securely Saved My Recovery Phrase
                </button>
              </div>
            </div>
          </>
        ) : isVerifyingMnemonic ? (
          <>
            <div>
              <button
                className="px-3 py-1 rounded border text-sm border-gray-500"
                onClick={() => {
                  setIsVerifyingMnemonic(false)
                  setIsShowingMnemonic(true)
                }}
              >
                Back to Recovery Phrase
              </button>
            </div>
            <div className="text-center mb-10">
              <h3 className="text-2xl font-semibold mb-4">
                Verify Your Recovery Phrase
              </h3>
              <p>
                Please enter your recovery phrase to confirm you've saved it
                correctly.
              </p>
            </div>
            <div>
              <form
                className="flex items-center justify-center flex-col"
                onSubmit={formVerify.handleSubmit(onMnemonicVerify)}
              >
                <div className="w-80 space-y-4">
                  <div>
                    <div className="text-xs mb-3">Mnemonic</div>
                    <div className="relative">
                      <textarea
                        className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                        {...formVerify.register('mnemonic', {
                          required: 'Required',
                        })}
                      />
                    </div>
                    <div className="text-sm text-red mt-2">
                      {formVerify.formState.errors.mnemonic?.message}
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
                Set Up Your Kaleidoswap Node
              </h3>
              <p>
                Configure your node settings and create a strong password to
                secure your wallet. This is a crucial step in ensuring the
                safety of your assets.
              </p>
            </div>
            <div>
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
                  {/* Updated Remote Node Checkbox */}
                  <div className="flex items-center">
                    <input
                      className="form-checkbox h-5 w-5 text-cyan border-gray-300 rounded"
                      id="remoteNode"
                      onChange={(e) => setIsRemoteNode(e.target.checked)}
                      type="checkbox"
                    />
                    <label className="ml-2 block text-sm" htmlFor="remoteNode">
                      Use Remote Node
                    </label>
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
                        <ul>
                          {additionalErrors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
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
                        <ul>
                          {additionalErrors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
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
                        <option value="signet">Signet</option>{' '}
                        {/* Added Signet */}
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
                  {/* RPC Connection URL Field */}
                  <div>
                    <div className="text-xs mb-3">
                      Bitcoind RPC Connection URL
                    </div>
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
                  {/* Password Fields */}
                  <div>
                    <div className="text-xs mb-3">Create Password</div>
                    <div className="relative">
                      <input
                        className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                        placeholder="Enter a strong password"
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
                      <ul>
                        {additionalErrors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-3">Confirm Password</div>
                    <div className="relative">
                      <input
                        className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                        placeholder="Re-enter your password"
                        type={isPasswordVisible ? 'text' : 'password'}
                        {...form.register('confirmPassword', {
                          minLength: {
                            message: 'Password must be at least 8 characters',
                            value: 8,
                          },
                          required: 'Required',
                          validate: (value) => {
                            if (value === form.getValues('password')) {
                              return true
                            }
                            return 'Passwords do not match'
                          },
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
                      {form.formState.errors.confirmPassword?.message}
                    </div>
                  </div>
                </div>
                <div className="flex self-end justify-end mt-8">
                  <button
                    className="px-6 py-3 rounded border text-lg font-bold border-cyan"
                    type="submit"
                  >
                    Initialize Node
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
