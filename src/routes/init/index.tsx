import { invoke } from '@tauri-apps/api'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import { EyeIcon } from '../../icons/Eye'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { readSettings } from '../../slices/nodeSettings/nodeSettings.slice'

interface Fields {
  name: String
  network: String
  datapath: String
  rpc_connection_url: String
  password: string
  confirmPassword: string
}

interface FieldsVerify {
  mnemonic: string
}

export const Component = () => {
  const [isStartingNode, setIsStartingNode] = useState(false)
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

  const form = useForm<Fields>({
    defaultValues: {
      confirmPassword: '',
      datapath: 'dataldk',
      name: 'Test Account',
      network: 'regtest',
      password: '',
      rpc_connection_url: 'user:password@localhost:18443',
    },
  })

  const formVerify = useForm<FieldsVerify>({
    defaultValues: {
      mnemonic: '',
    },
  })

  const onSubmit: SubmitHandler<Fields> = async (data) => {
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

    const initResponse = await init({ password: data.password })
    console.log(initResponse)
    if (!initResponse.isSuccess) {
      toast.error('Node has already been initialized...')
      await invoke('stop_node')
    } else {
      try {
        await invoke('insert_account', {
          datapath: data.datapath,
          name: data.name,
          network: data.network,
          rpcConnectionUrl: data.rpc_connection_url,
        })
      } catch (error) {
        console.log(error)
        await invoke('stop_node')
        toast.error('Failed to save account...')
      }
      setMnemonic(initResponse.data.mnemonic.split(' '))
      setPassword(data.password)
      setIsShowingMnemonic(true)
    }
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

  useEffect(() => {
    dispatch(readSettings())
  }, [])

  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {initResponse.isLoading ||
        unlockResponse.isLoading ||
        isStartingNode ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={10} />
            <div className="text-center">Initializing the node...</div>
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
                Backup your mnemonic in a secure place
              </h3>
              <p className="text-red-500">
                Warning: Do not share your mnemonic with anyone. If someone has
                your mnemonic, they can access your wallet.
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
                Copy Mnemonic
              </button>
              <div className="flex self-center justify-center mt-8">
                <button
                  className="px-6 py-3 mt-7 rounded border font-bold border-cyan"
                  onClick={onMnemonicSaved}
                >
                  I have saved my mnemonic!
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
                Go back to mnemonic
              </button>
            </div>
            <div className="text-center mb-10">
              <h3 className="text-2xl font-semibold mb-4">
                Verify your mnemonic
              </h3>
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
                Configure your wallet
              </h3>
              <p>
                Craft a robust password using a mix of elements like letters,
                numbers, and symbols. Your wallet's protection starts with a
                strong password.
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
                  {/* Datapath Field */}
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
                      <ul>
                        {additionalErrors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-3">Confirm Your Password</div>
                    <div className="relative">
                      <input
                        className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
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
