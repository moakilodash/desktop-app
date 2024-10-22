import { invoke } from '@tauri-apps/api'
import { open } from '@tauri-apps/api/dialog'
import { exists } from '@tauri-apps/api/fs'
import {
  ChevronDown,
  LogOut,
  Undo,
  Save,
  Shield,
  Folder,
  AlertTriangle,
  Power,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { WALLET_SETUP_PATH } from '../../app/router/paths'
import { RootState } from '../../app/store'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { nodeSettingsActions } from '../../slices/nodeSettings/nodeSettings.slice'
import {
  setBitcoinUnit,
  setNodeConnectionString,
  setDefaultLspUrl,
} from '../../slices/settings/settings.slice'

interface FormFields {
  bitcoinUnit: string
  nodeConnectionString: string
  lspUrl: string
  backupPath: string
  nodePassword: string
}

interface Response {
  status: number
  data: { error?: string; code?: number }
}

export const Component: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { bitcoinUnit, nodeConnectionString, defaultLspUrl } = useSelector(
    (state: RootState) => state.settings
  )

  const [showModal, setShowModal] = useState(false)
  const [backupModal, setBackupModal] = useState(false)
  const { control, handleSubmit, formState, reset, watch, setValue } =
    useForm<FormFields>({
      defaultValues: {
        backupPath: '',
        bitcoinUnit,
        lspUrl: defaultLspUrl || 'http://localhost:8000',
        nodeConnectionString: nodeConnectionString || 'http://localhost:3001',
        nodePassword: '',
      },
    })
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const [showShutdownConfirmation, setShowShutdownConfirmation] =
    useState(false)

  const [backup, { isLoading: isBackupLoading }] =
    nodeApi.endpoints.backup.useLazyQuery()
  const [lock] = nodeApi.endpoints.lock.useLazyQuery()
  const [unlock] = nodeApi.endpoints.unlock.useLazyQuery()
  const [shutdown] = nodeApi.endpoints.shutdown.useLazyQuery()
  // const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const [isBackupInProgress, setIsBackupInProgress] = useState(false)

  useEffect(() => {
    setIsBackupInProgress(isBackupLoading)
  }, [isBackupLoading])

  const backupPath = watch('backupPath')

  useEffect(() => {
    reset({
      backupPath: '',
      bitcoinUnit,
      lspUrl: defaultLspUrl || 'http://localhost:8000',
      nodeConnectionString: nodeConnectionString || 'http://localhost:3001',
      nodePassword: '',
    })
  }, [bitcoinUnit, nodeConnectionString, defaultLspUrl, reset])

  const handleSave = (data: FormFields) => {
    dispatch(setBitcoinUnit(data.bitcoinUnit))
    dispatch(setNodeConnectionString(data.nodeConnectionString))
    dispatch(setDefaultLspUrl(data.lspUrl))
    setShowModal(true)
    setTimeout(() => {
      setShowModal(false)
    }, 2000)
  }

  const performBackup = async (data: FormFields) => {
    const pathToBackup = data.backupPath
    const nodePass = data.nodePassword

    try {
      const lockResponse = await attemptLock()
      if (lockResponse.status === 200) {
        const backupResponse = await attemptBackup(pathToBackup, nodePass)
        if (backupResponse.status === 200) {
          toast.success('Backup successful')
          await unlock({ password: nodePass }).unwrap()
        } else if (backupResponse.status === 401) {
          toast.error('Wrong password')
        } else {
          toast.error('Backup error')
        }
      } else if (lockResponse.status === 403) {
        const unlockResponse = await attemptUnlock(nodePass)
        if (unlockResponse.status === 200) {
          await lock().unwrap()
          const backupResponse = await attemptBackup(pathToBackup, nodePass)
          if (backupResponse.status === 200) {
            toast.success('Backup successful')
            await unlock({ password: nodePass }).unwrap()
          }
        } else if (unlockResponse.status === 401) {
          toast.error('Wrong password')
        } else {
          toast.error('Unlock unsuccessful')
        }
      } else {
        toast.error('Lock unsuccessful')
      }
    } catch (err) {
      toast.error('Backup error')
    }
  }
  const handleLogout = async () => {
    setShowLogoutConfirmation(true)
  }

  const confirmLogout = async () => {
    try {
      const lockResponse = await attemptLock()
      if (lockResponse.status === 200) {
        await invoke('stop_node')
        dispatch(nodeSettingsActions.resetNodeSettings())
        toast.success('Logout successful')
      } else {
        throw new Error('Node lock unsuccessful')
      }
    } catch (error) {
      console.error('Logout error:', error)
      if (error instanceof Error) {
        toast.error(`Logout failed: ${error.message}. Redirecting anyway.`)
      } else {
        toast.error(`Logout failed. Redirecting anyway.`)
      }
    } finally {
      navigate(WALLET_SETUP_PATH)
      setShowLogoutConfirmation(false)
    }
  }

  const attemptLock = async (): Promise<Response> => {
    try {
      await lock().unwrap()
    } catch (err) {
      console.log(err)
      return err as Response
    }
    return { data: {}, status: 200 }
  }

  const attemptUnlock = async (password: string): Promise<Response> => {
    try {
      await unlock({ password: password }).unwrap()
    } catch (err) {
      return err as Response
    }
    return { data: {}, status: 200 }
  }

  const attemptBackup = async (
    backupPath: string,
    password: string
  ): Promise<Response> => {
    try {
      await backup({
        backup_path: backupPath,
        password,
      }).unwrap()
    } catch (err) {
      return err as Response
    }
    return { data: {}, status: 200 }
  }

  const handleBackup = async (data: FormFields) => {
    const pathToBackup = data.backupPath

    if (!isValidPath(pathToBackup)) {
      toast.error('Invalid backup path')
      return
    }

    if (await exists(pathToBackup)) {
      toast.error('Backup file already exists. Please choose a different path.')
      return
    }

    try {
      setIsBackupInProgress(true)
      await performBackup(data)
    } finally {
      const directoryPath = pathToBackup.substring(
        0,
        pathToBackup.lastIndexOf('/')
      )
      const timestamp = new Date()
        .toLocaleString()
        .replace(/[/, ]/g, '_')
        .replace(/:/g, '')
      const newBackupPath = `${directoryPath}/backup_${timestamp}.enc`
      reset({ ...data, backupPath: newBackupPath, nodePassword: '' })
      setBackupModal(false)
      setIsBackupInProgress(false)
    }
  }

  const selectBackupFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (typeof selected === 'string') {
      const timestamp = new Date()
        .toLocaleString()
        .replace(/[/, ]/g, '_')
        .replace(/:/g, '')
      setValue('backupPath', `${selected}/backup_${timestamp}.enc`)
    }
  }

  const isValidPath = (path: string) => {
    return path.trim() !== ''
  }

  const handleUndo = () => {
    reset({
      backupPath: '',
      bitcoinUnit,
      lspUrl: defaultLspUrl,
      nodeConnectionString,
      nodePassword: '',
    })
  }

  const handleShutdown = () => {
    setShowShutdownConfirmation(true)
  }

  const confirmShutdown = async () => {
    try {
      await shutdown().unwrap()
      await invoke('stop_node')
      dispatch(nodeSettingsActions.resetNodeSettings())
      navigate(WALLET_SETUP_PATH)
      toast.success('Node shut down successfully')
    } catch (error) {
      console.error('Error shutting down node:', error)
      toast.error('Failed to shut down node')
    } finally {
      setShowShutdownConfirmation(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Settings
        </h1>
        <form className="space-y-6" onSubmit={handleSubmit(handleSave)}>
          <Controller
            control={control}
            name="bitcoinUnit"
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Bitcoin Unit
                </label>
                <div className="relative">
                  <select
                    {...field}
                    className="block w-full pl-3 pr-10 py-2 text-white bg-gray-700 border border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SAT">Satoshi (SAT)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          />
          <Controller
            control={control}
            name="nodeConnectionString"
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Node Connection String
                </label>
                <input
                  {...field}
                  className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter node connection string"
                  type="text"
                />
                {formState.errors.nodeConnectionString && (
                  <p className="mt-1 text-sm text-red-500">
                    {formState.errors.nodeConnectionString.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            control={control}
            name="lspUrl"
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Default LSP URL
                </label>
                <input
                  {...field}
                  className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter default LSP URL"
                  type="text"
                />
                {formState.errors.lspUrl && (
                  <p className="mt-1 text-sm text-red-500">
                    {formState.errors.lspUrl.message}
                  </p>
                )}
              </div>
            )}
          />
          <div className="pt-4 space-y-4">
            <button
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
              onClick={() => setBackupModal(true)}
              type="button"
            >
              <Shield className="w-5 h-5 mr-2" />
              Backup
            </button>
            <button
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
              onClick={handleLogout}
              type="button"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </button>
            <button
              className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
              onClick={handleShutdown}
              type="button"
            >
              <Power className="w-5 h-5 mr-2" />
              Shutdown Node
            </button>
          </div>
          <div className="flex justify-between space-x-4 pt-6">
            <button
              className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
              onClick={handleUndo}
              type="button"
            >
              <Undo className="w-5 h-5 mr-2" />
              Undo
            </button>
            <button
              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
              type="submit"
            >
              <Save className="w-5 h-5 mr-2" />
              Save
            </button>
          </div>
        </form>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Settings Saved
              </h2>
              <p className="text-gray-600">
                Your settings have been successfully saved.
              </p>
            </div>
          </div>
        )}

        {backupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-center text-white">
                Create Backup
              </h2>
              <form className="space-y-4" onSubmit={handleSubmit(handleBackup)}>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Backup File Path
                  </label>
                  <div className="flex">
                    <input
                      {...control.register('backupPath', {
                        validate: isValidPath,
                      })}
                      className="flex-grow px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => setValue('backupPath', e.target.value)}
                      type="text"
                      value={backupPath}
                    />
                    <button
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                      onClick={selectBackupFolder}
                      type="button"
                    >
                      <Folder className="w-5 h-5" />
                    </button>
                  </div>
                  {formState.errors.backupPath && (
                    <p className="mt-1 text-sm text-red-500">
                      Invalid backup path
                    </p>
                  )}
                </div>
                <Controller
                  control={control}
                  name="nodePassword"
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Node Password
                      </label>
                      <input
                        {...field}
                        className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter node password"
                        type="password"
                      />
                    </div>
                  )}
                />
                {isBackupInProgress && (
                  <div className="mt-4">
                    <p className="text-white text-center">
                      Please wait, the backup is in progress...
                      <br />
                      The node will be locked until the backup process is
                      finished.
                    </p>
                  </div>
                )}
                <div className="flex justify-between space-x-4 pt-6">
                  <button
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isBackupInProgress}
                    onClick={() => setBackupModal(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isBackupInProgress}
                    type="submit"
                  >
                    Create Backup
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showLogoutConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-center text-yellow-500 mb-4">
                <AlertTriangle size={48} />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-center text-white">
                Confirm Logout
              </h2>
              <p className="text-gray-300 text-center mb-6">
                Are you sure you want to logout? This will lock your node.
              </p>
              <div className="flex justify-between space-x-4">
                <button
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                  onClick={() => setShowLogoutConfirmation(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                  onClick={confirmLogout}
                  type="button"
                >
                  Confirm Logout
                </button>
              </div>
            </div>
          </div>
        )}
        {showShutdownConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle size={48} />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-center text-white">
                Confirm Shutdown
              </h2>
              <p className="text-gray-300 text-center mb-6">
                Are you sure you want to shut down the node? This action cannot
                be undone.
              </p>
              <div className="flex justify-between space-x-4">
                <button
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                  onClick={() => setShowShutdownConfirmation(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                  onClick={confirmShutdown}
                  type="button"
                >
                  Confirm Shutdown
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
