import { emit } from '@tauri-apps/api/event'
import { exit /* relaunch */ } from '@tauri-apps/api/process'
import { useState, useEffect } from 'react'
import { useForm, Controller, SubmitHandler } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  type NodeSettings,
  NodeSettingsState,
  readSettings,
  writeSettings,
} from '../../slices/nodeSettings/nodeSettings.slice'

interface FormFields {
  network?: 'regtest' | 'testnet' | 'signet' | 'mainnet'
  datapath?: String
  rpc_connection_url?: String
}

export const Component = () => {
  const dispatch = useAppDispatch()
  const nodeSettings: NodeSettingsState = useAppSelector(
    (state) => state.nodeSettings
  )

  const navigate = useNavigate()

  const defaultValues: FormFields = {
    datapath: nodeSettings.data.datapath,
    network: nodeSettings.data.network,
    rpc_connection_url: nodeSettings.data.rpc_connection_url,
  }

  const [showModal, setShowModal] = useState(false)
  const { control, handleSubmit, formState, reset } = useForm<FormFields>({
    defaultValues,
  })

  useEffect(() => {
    dispatch(readSettings())
      .unwrap()
      .then((settings: NodeSettings) => reset(settings))
      .catch((err: String) => toast.error(err))
  }, [])

  const handleSave: SubmitHandler<FormFields> = async (data) => {
    dispatch(
      writeSettings({
        ...data,
        accounts: nodeSettings.data.accounts,
      } as NodeSettings)
    )
      .unwrap()
      .then(() => {
        setShowModal(true)
        toast.success('Settings saved')
      })
      .catch((err: String) => toast.error(err))
  }

  const handleUndo = () => {
    reset(nodeSettings.data)
    navigate(-1)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-black">
      <div className="max-w-md w-full bg-blue-dark p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-semibold mb-8 text-center text-white">
          Node Settings
        </h1>
        <form onSubmit={handleSubmit(handleSave)}>
          <div className="space-y-6">
            <Controller
              control={control}
              name="network"
              render={({ field }) => (
                <>
                  <div>
                    <label className="block mb-2 text-lg text-gray-300">
                      Network:
                    </label>
                    <select
                      className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
                      {...field}
                    >
                      <option value="regtest">Regtest</option>
                      <option value="testnet">Testnet</option>
                      <option value="signet">Signet</option>
                      <option value="mainnet">Mainnet</option>
                    </select>
                  </div>
                  <div className="text-sm text-red mt-2">
                    {formState.errors.network?.message}
                  </div>
                </>
              )}
              rules={{ required: { message: 'Required', value: true } }}
            />
            <Controller
              control={control}
              name="datapath"
              render={({ field }) => (
                <div>
                  <label className="block mb-2 text-lg text-gray-300">
                    Datapath:
                  </label>
                  <input
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Enter datapath"
                    type="text"
                    {...field}
                  />
                  <p className="text-sm text-red mt-2">
                    {formState.errors.datapath?.message}
                  </p>
                </div>
              )}
              rules={{ required: { message: 'Required', value: true } }}
            />
            <Controller
              control={control}
              name="rpc_connection_url"
              render={({ field }) => (
                <div>
                  <label className="block mb-2 text-lg text-gray-300">
                    RPC Connection URL:
                  </label>
                  <input
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Enter RPC Connection URL"
                    type="text"
                    {...field}
                  />
                  <p className="text-sm text-red mt-2">
                    {formState.errors.rpc_connection_url?.message}
                  </p>
                </div>
              )}
              rules={{ required: { message: 'Required', value: true } }}
            />
          </div>
          <div className="flex justify-between mt-8 space-x-4">
            <button
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
              onClick={handleUndo}
              type="button"
            >
              Undo
            </button>
            <button
              className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white text-black p-6 rounded-lg shadow-lg text-center">
              <h2 className="text-2xl font-semibold mb-4">Settings Saved</h2>
              <p>Your settings have been successfully saved.</p>
              <p>
                You will need to restart the application in order for changes to
                take effect.
              </p>
              <div className="flex">
                <button
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-lg font-bold rounded shadow-md transition duration-200"
                  onClick={() => navigate(-1)}
                  type="button"
                >
                  Do it later
                </button>
                <button
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-lg font-bold rounded shadow-md transition duration-200"
                  onClick={async () => {
                    await emit('app-will-relaunch')

                    setTimeout(() => {
                      // relaunch().catch((err) => toast.error(err))
                      exit().catch((err) => toast.error(err))
                    }, 1000)
                  }}
                  type="button"
                >
                  Restart now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
