//import { appWindow } from '@tauri-apps/api/window'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import { EyeIcon } from '../../icons/Eye'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface Fields {
  password: string
  confirmPassword: string
}

export const Component = () => {
  const [init, initResponse] = nodeApi.endpoints.init.useLazyQuery()
  const [unlock, unlockResponse] = nodeApi.endpoints.unlock.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  // const [restore] = nodeApi.endpoints.restore.useLazyQuery()
  // const [backup] = nodeApi.endpoints.backup.useLazyQuery()
  // const [lock] = nodeApi.endpoints.lock.useLazyQuery()

  const navigate = useNavigate()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [additionalErrors, setAdditionalErrors] = useState<Array<string>>([])

  const form = useForm<Fields>({
    defaultValues: {
      confirmPassword: '',
      password: '',
    },
  })

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    /*await restore({
      backup_path: '/var/node_backups/user_node',
      password: data.password,
    })*/

    let nodeInfoRes = await nodeInfo()
    // console.log(nodeInfoRes)
    if (nodeInfoRes.isSuccess) {
      navigate(TRADE_PATH)
      return
    }

    // Try to initialize the node
    const initResponse = await init({ password: data.password })
    if (!initResponse.isSuccess) {
      console.log('Node has already been initialized...')
    }

    const unlockResponse = await unlock({ password: data.password })
    if (unlockResponse.isSuccess) {
      nodeInfoRes = await nodeInfo()
      if (nodeInfoRes.isSuccess) {
        /*await appWindow.onCloseRequested(async (_) => {
          await lock({ password: 'stefano90' })
          await backup({ backup_path: '/var/node-backups/user_node', password: 'stefano90' });
        });*/

        navigate(TRADE_PATH)
      }
    } else {
      setAdditionalErrors((s) => [...s, 'Failed to unlock the node...'])
    }
  }
  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {initResponse.isLoading || unlockResponse.isLoading ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={10} />

            <div className="text-center">Initializing the node...</div>
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
                Set your wallet password
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
