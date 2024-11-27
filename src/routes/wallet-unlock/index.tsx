import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { useState, useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { useAppSelector } from '../../app/store/hooks'
import { Layout } from '../../components/Layout'
import { MnemonicDisplay } from '../../components/MnemonicDisplay'
import {
  MnemonicVerifyForm,
  MnemonicVerifyFields,
} from '../../components/MnemonicVerifyForm'
import { Modal } from '../../components/Modal'
import {
  PasswordSetupForm,
  PasswordFields,
} from '../../components/PasswordSetupForm'
import { Spinner } from '../../components/Spinner'
import { parseRpcUrl } from '../../helpers/utils'
import { EyeIcon } from '../../icons/Eye'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
interface Fields {
  password: string
}

type UnlockStep = 'unlock' | 'init-password' | 'mnemonic' | 'verify'

export const Component = () => {
  const [unlock] = nodeApi.endpoints.unlock.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const nodeSettings = useAppSelector((state) => state.nodeSettings.data)

  const navigate = useNavigate()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [currentStep, setCurrentStep] = useState<UnlockStep>('unlock')
  const [mnemonic, setMnemonic] = useState<Array<string>>([])
  const [nodePassword, setNodePassword] = useState('')

  const [init] = nodeApi.endpoints.init.useLazyQuery()

  const [showInitModal, setShowInitModal] = useState(false)

  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    const checkNodeStatus = async () => {
      const nodeInfoRes = await nodeInfo()
      if (nodeInfoRes.isSuccess) {
        navigate(TRADE_PATH)
      }
    }
    checkNodeStatus()
  }, [])

  const unlockForm = useForm<Fields>({
    defaultValues: {
      password: '',
    },
  })

  const passwordSetupForm = useForm<PasswordFields>({
    defaultValues: {
      confirmPassword: '',
      password: '',
    },
  })

  const mnemonicVerifyForm = useForm<MnemonicVerifyFields>({
    defaultValues: {
      mnemonic: '',
    },
  })

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    setIsUnlocking(true)

    try {
      const rpcConfig = parseRpcUrl(nodeSettings.rpc_connection_url)
      console.log(
        'Unlocking the node with params: ',
        rpcConfig.host,
        rpcConfig.password,
        rpcConfig.port,
        rpcConfig.username,
        nodeSettings.indexer_url,
        data.password,
        nodeSettings.proxy_endpoint
      )
      const unlockResponse = await unlock({
        bitcoind_rpc_host: rpcConfig.host,
        bitcoind_rpc_password: rpcConfig.password,
        bitcoind_rpc_port: rpcConfig.port,
        bitcoind_rpc_username: rpcConfig.username,
        indexer_url: nodeSettings.indexer_url,
        password: data.password,
        proxy_endpoint: nodeSettings.proxy_endpoint,
      })

      if (unlockResponse.isSuccess) {
        const nodeInfoRes = await nodeInfo()
        if (nodeInfoRes.isSuccess) {
          navigate(TRADE_PATH)
        } else {
          throw new Error('Failed to get node info after unlock')
        }
      } else {
        if (
          'error' in unlockResponse &&
          unlockResponse.error &&
          isFetchBaseQueryError(unlockResponse.error) &&
          unlockResponse.error.status === 403 &&
          (unlockResponse.error.data as { error?: string })?.error ===
            'Wallet has not been initialized (hint: call init)'
        ) {
          setShowInitModal(true)
          return
        }
        if ('error' in unlockResponse && unlockResponse.error) {
          const errorData = isFetchBaseQueryError(unlockResponse.error)
            ? (unlockResponse.error.data as { error?: string })?.error ||
              'Unknown error'
            : unlockResponse.error.message || 'Unknown error'
          throw new Error(errorData)
        }
        throw new Error('Failed to unlock the node')
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(errorMessage, {
        autoClose: 5000,
        closeOnClick: false,
        draggable: false,
        hideProgressBar: false,
        pauseOnHover: false,
        position: 'top-right',
      })
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleInitPassword: SubmitHandler<PasswordFields> = async (data) => {
    setIsUnlocking(true)
    try {
      const initResponse = await init({ password: data.password })
      if (!initResponse.isSuccess) {
        throw new Error(
          initResponse.error && 'data' in initResponse.error
            ? (initResponse.error.data as { error: string }).error
            : 'Initialization failed'
        )
      }

      setNodePassword(data.password)
      setMnemonic(initResponse.data.mnemonic.split(' '))
      setCurrentStep('mnemonic')
      toast.success('Node initialized successfully!')
    } catch (error) {
      console.error('Initialization failed:', error)
      toast.error('Failed to initialize node. Please try again.', {
        autoClose: 5000,
        closeOnClick: false,
        draggable: false,
        hideProgressBar: false,
        pauseOnHover: false,
        position: 'top-right',
      })
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleMnemonicVerify: SubmitHandler<MnemonicVerifyFields> = async (
    data
  ) => {
    setIsVerifying(true)
    try {
      if (mnemonic.join(' ') !== data.mnemonic.trim()) {
        toast.error('Mnemonic does not match')
        return
      }

      const rpcConfig = parseRpcUrl(nodeSettings.rpc_connection_url)
      const unlockResponse = await unlock({
        bitcoind_rpc_host: rpcConfig.host,
        bitcoind_rpc_password: rpcConfig.password,
        bitcoind_rpc_port: rpcConfig.port,
        bitcoind_rpc_username: rpcConfig.username,
        indexer_url: nodeSettings.indexer_url,
        password: nodePassword,
        proxy_endpoint: nodeSettings.proxy_endpoint,
      })

      if (unlockResponse.isSuccess) {
        const nodeInfoRes = await nodeInfo()
        if (nodeInfoRes.isSuccess) {
          navigate(TRADE_PATH)
        }
      } else {
        toast.error('Failed to unlock the node')
      }
    } catch (error) {
      toast.error('An error occurred during verification')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-md w-full bg-blue-dark py-12 px-8 rounded-lg shadow-lg">
        {isUnlocking || isVerifying ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={30} />
            <div className="text-center text-lg">
              {isUnlocking
                ? 'Unlocking your wallet...'
                : 'Verifying your recovery phrase...'}
            </div>
          </div>
        ) : currentStep === 'unlock' ? (
          <form
            className="space-y-6"
            onSubmit={unlockForm.handleSubmit(onSubmit)}
          >
            <div className="mb-8">
              <button
                className="px-4 py-2 rounded-full border text-sm border-gray-500 hover:bg-gray-700 transition-colors"
                onClick={() => navigate(WALLET_SETUP_PATH)}
              >
                ← Back
              </button>
            </div>
            <div className="text-center mb-10">
              <h3 className="text-3xl font-bold mb-2">Unlock your Wallet</h3>
              <p className="text-gray-400">Enter your password to continue</p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="password"
              >
                Your Password
              </label>
              <div className="relative">
                <input
                  className="border border-gray-600 rounded-lg bg-blue-dark px-4 py-3 w-full outline-none focus:ring-2 focus:ring-cyan transition-shadow"
                  id="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  {...unlockForm.register('password', {
                    required: 'Password is required',
                  })}
                />
                <button
                  className="absolute top-0 right-3 h-full flex items-center text-gray-400 hover:text-white transition-colors"
                  onClick={() => setIsPasswordVisible((prev) => !prev)}
                  type="button"
                >
                  <EyeIcon />
                </button>
              </div>
              {unlockForm.formState.errors.password && (
                <p className="mt-2 text-sm text-red-500">
                  {unlockForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <button
                className="w-full px-6 py-3 rounded-lg bg-cyan text-blue-dark text-lg font-bold hover:bg-cyan-light transition-colors"
                disabled={isUnlocking}
                type="submit"
              >
                {isUnlocking ? 'Unlocking...' : 'Unlock Wallet'}
              </button>
            </div>
          </form>
        ) : currentStep === 'init-password' ? (
          <PasswordSetupForm
            errors={[]}
            form={passwordSetupForm}
            isPasswordVisible={isPasswordVisible}
            onBack={() => setCurrentStep('unlock')}
            onSubmit={handleInitPassword}
            setIsPasswordVisible={setIsPasswordVisible}
          />
        ) : currentStep === 'mnemonic' ? (
          <MnemonicDisplay
            mnemonic={mnemonic}
            onBack={() => setCurrentStep('init-password')}
            onCopy={() => {
              navigator.clipboard
                .writeText(mnemonic.join(' '))
                .then(() => toast.success('Mnemonic copied to clipboard'))
                .catch(() => toast.error('Failed to copy mnemonic'))
            }}
            onNext={() => setCurrentStep('verify')}
          />
        ) : (
          <MnemonicVerifyForm
            errors={[]}
            form={mnemonicVerifyForm}
            onBack={() => setCurrentStep('mnemonic')}
            onSubmit={handleMnemonicVerify}
          />
        )}
      </div>

      {showInitModal && (
        <Modal
          message="Wallet is not initialized. Would you like to initialize it now?"
          onCancel={() => setShowInitModal(false)}
          onConfirm={() => {
            setShowInitModal(false)
            setCurrentStep('init-password')
          }}
          title="Initialize Wallet"
        />
      )}
    </Layout>
  )
}

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error != null && 'status' in error
}
