
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { TRADE_PATH, WALLET_SETUP_PATH } from '../../app/router/paths'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import { EyeIcon } from '../../icons/Eye'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface Fields {
  backup_path: string
  password: string
}

export const Component = () => {
  const [restore, restoreResponse] = nodeApi.endpoints.restore.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const navigate = useNavigate()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [additionalErrors, setAdditionalErrors] = useState<Array<string>>([])

  const form = useForm<Fields>({
    defaultValues: {
      backup_path: '/var/node_backups/user_node',
      password: '',
    },
  })

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    let nodeInfoRes = await nodeInfo()
    if (nodeInfoRes.isSuccess) {
      navigate(TRADE_PATH)
      return
    }

    const restoreResponse = await restore({
      backup_path: data.backup_path,
      password: data.password,
    })
    if (restoreResponse.isSuccess) {
      nodeInfoRes = await nodeInfo()
      if (nodeInfoRes.isSuccess) {
        navigate(TRADE_PATH)
      }
    } else {
      setAdditionalErrors((s) => [...s, 'Failed to restore wallet'])
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded">
        {restoreResponse.isLoading ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <Spinner size={10} />

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
