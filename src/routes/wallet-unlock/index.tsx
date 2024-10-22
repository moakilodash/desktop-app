import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { useState, useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import { EyeIcon } from '../../icons/Eye'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface Fields {
  password: string
}

export const Component = () => {
  const [unlock] = nodeApi.endpoints.unlock.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const navigate = useNavigate()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  useEffect(() => {
    const checkNodeStatus = async () => {
      const nodeInfoRes = await nodeInfo()
      if (nodeInfoRes.isSuccess) {
        navigate(TRADE_PATH)
      }
    }
    checkNodeStatus()
  }, [])

  const form = useForm<Fields>({
    defaultValues: {
      password: '',
    },
  })

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    setIsUnlocking(true)

    try {
      const unlockResponse = await unlock({ password: data.password })
      if (unlockResponse.isSuccess) {
        const nodeInfoRes = await nodeInfo()
        if (nodeInfoRes.isSuccess) {
          navigate(TRADE_PATH)
        } else {
          throw new Error('Failed to get node info after unlock')
        }
      } else {
        const errorMessage =
          'error' in unlockResponse && unlockResponse.error
            ? isFetchBaseQueryError(unlockResponse.error)
              ? (unlockResponse.error.data as { message: string })?.message ||
                'Unknown error'
              : unlockResponse.error.message || 'Unknown error'
            : 'Failed to unlock the node'
        throw new Error(errorMessage)
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(errorMessage, {
        autoClose: 5000,
        closeOnClick: true,
        draggable: true,
        hideProgressBar: false,
        pauseOnHover: true,
        position: 'top-right',
      })
    } finally {
      setIsUnlocking(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-md w-full bg-blue-dark py-12 px-8 rounded-lg shadow-lg">
        {isUnlocking ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={30} />
            <div className="text-center text-lg">Unlocking your wallet...</div>
          </div>
        ) : (
          <>
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

            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
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
                    {...form.register('password', {
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
                {form.formState.errors.password && (
                  <p className="mt-2 text-sm text-red-500">
                    {form.formState.errors.password.message}
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
          </>
        )}
      </div>
    </Layout>
  )
}

// Add this helper function at the end of the file
function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error != null && 'status' in error
}
