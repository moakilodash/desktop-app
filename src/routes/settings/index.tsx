import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'

import {
  setBitcoinUnit,
  setNodeConnectionString,
  setDefaultLspUrl,
} from '../../slices/settings/settings.slice'

interface FormFields {
  bitcoinUnit: string
  nodeConnectionString: string
  defaultLspUrl: string
}

export const Component = () => {
  const dispatch = useDispatch()
  const { bitcoinUnit, nodeConnectionString, defaultLspUrl } = useSelector(
    (state) => state.settings
  )

  const [showModal, setShowModal] = useState(false)

  const form = useForm<FormFields>({
    defaultValues: {
      bitcoinUnit,
      defaultLspUrl: defaultLspUrl || 'http://localhost:8000',
      nodeConnectionString: nodeConnectionString || 'http://localhost:3001',
    },
  })

  useEffect(() => {
    form.reset({
      bitcoinUnit,
      defaultLspUrl: defaultLspUrl || 'http://localhost:8000',
      nodeConnectionString: nodeConnectionString || 'http://localhost:3001',
    })
  }, [bitcoinUnit, nodeConnectionString, defaultLspUrl, form])

  const handleSave = (data: FormFields) => {
    dispatch(setBitcoinUnit(data.bitcoinUnit))
    dispatch(setNodeConnectionString(data.nodeConnectionString))
    dispatch(setDefaultLspUrl(data.defaultLspUrl))
    setShowModal(true)
    setTimeout(() => {
      setShowModal(false)
    }, 2000)
  }

  const handleUndo = () => {
    form.reset({
      bitcoinUnit,
      defaultLspUrl: defaultLspUrl,
      nodeConnectionString,
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-black">
      <div className="max-w-md w-full bg-blue-dark p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-semibold mb-8 text-center text-white">
          Settings
        </h1>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <div className="space-y-6">
            <Controller
              control={form.control}
              name="bitcoinUnit"
              render={({ field }) => (
                <div>
                  <label className="block mb-2 text-lg text-gray-300">
                    Select Bitcoin Unit:
                  </label>
                  <select
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
                    {...field}
                  >
                    <option value="SAT">Satoshi (SAT)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                  </select>
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="nodeConnectionString"
              render={({ field }) => (
                <div>
                  <label className="block mb-2 text-lg text-gray-300">
                    Node Connection String:
                  </label>
                  <input
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Enter node connection string"
                    type="text"
                    {...field}
                  />
                  <p className="text-sm text-red-500 mt-2">
                    {form.formState.errors.nodeConnectionString?.message}
                  </p>
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="defaultLspUrl"
              render={({ field }) => (
                <div>
                  <label className="block mb-2 text-lg text-gray-300">
                    Default LSP URL:
                  </label>
                  <input
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Enter default LSP URL"
                    type="text"
                    {...field}
                  />
                  <p className="text-sm text-red-500 mt-2">
                    {form.formState.errors.defaultLspUrl?.message}
                  </p>
                </div>
              )}
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
