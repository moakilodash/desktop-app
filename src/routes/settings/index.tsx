import { open } from '@tauri-apps/api/dialog'
import { exists } from '@tauri-apps/api/fs'
import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { RootState } from '../../app/store'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
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

interface Data {
  error?: string
  code?: number
}

interface Response {
  status: number
  data: Data
}

export const Component = () => {
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

  const [backup, { isLoading: isBackupLoading }] =
    nodeApi.endpoints.backup.useLazyQuery()
  const [lock] = nodeApi.endpoints.lock.useLazyQuery()
  const [unlock] = nodeApi.endpoints.unlock.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

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

  const attemptLock = async (): Promise<Response> => {
    //let lockResponse

    try {
      //lockResponse = await lock().unwrap()
      await lock().unwrap()
    } catch (err) {
      return err as Response
    }

    return {
      data: {},
      status: 200,
    }
  }

  const attemptUnlock = async (password: string): Promise<Response> => {
    //let unlockResponse

    try {
      //unlockResponse = await unlock({ password: password }).unwrap()
      await unlock({ password: password }).unwrap()
    } catch (err) {
      return err as Response
    }

    return {
      data: {},
      status: 200,
    }
  }

  const attemptBackup = async (
    backupPath: string,
    password: string
  ): Promise<Response> => {
    //let backupResponse

    try {
      // backupResponse = await backup({
      //   backup_path: backupPath,
      //   password,
      // }).unwrap()
      await backup({
        backup_path: backupPath,
        password,
      }).unwrap()
    } catch (err) {
      return err as Response
    }

    return {
      data: {},
      status: 200,
    }
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-black">
      <div className="max-w-md w-full bg-blue-dark p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-semibold mb-8 text-center text-white">
          Settings
        </h1>
        <form onSubmit={handleSubmit(handleSave)}>
          <div className="space-y-6">
            <Controller
              control={control}
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
              control={control}
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
                    {formState.errors.nodeConnectionString?.message}
                  </p>
                </div>
              )}
            />
            <Controller
              control={control}
              name="lspUrl"
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
                    {formState.errors.lspUrl?.message}
                  </p>
                </div>
              )}
            />
          </div>
          <div className="flex justify-between mt-4 space-x-4">
            <button
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
              onClick={() => setBackupModal(true)}
              type="button"
            >
              Backup
            </button>
          </div>
          <div className="flex justify-between mt-4 space-x-4">
            <button
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
              onClick={async () => {
                const lockResponse = await attemptLock()
                if (lockResponse.status === 200) {
                  navigate('/wallet-setup')
                  toast.success('Logout successful')
                  nodeInfo()
                } else {
                  toast.error('Node lock unsuccessful')
                }
              }}
              type="button"
            >
              Logout
            </button>
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

        {backupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-blue-dark p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4 text-center text-white">
                Create Backup
              </h2>
              <form onSubmit={handleSubmit(handleBackup)}>
                <div>
                  <label className="block mb-2 text-lg text-gray-300">
                    Backup File Path:
                  </label>
                  <input
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
                    type="text"
                    {...control.register('backupPath', {
                      validate: isValidPath,
                    })}
                    onChange={(e) => setValue('backupPath', e.target.value)}
                    value={backupPath}
                  />
                  <button
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
                    onClick={selectBackupFolder}
                    type="button"
                  >
                    Select Folder
                  </button>
                  {formState.errors.backupPath && (
                    <p className="text-sm text-red-500 mt-2">
                      Invalid backup path
                    </p>
                  )}
                </div>
                <Controller
                  control={control}
                  name="nodePassword"
                  render={({ field }) => (
                    <div>
                      <label className="block mb-2 text-lg text-gray-300">
                        Node Password:
                      </label>
                      <input
                        className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
                        placeholder="Enter node password"
                        type="password"
                        {...field}
                      />
                    </div>
                  )}
                />
                {isBackupInProgress && (
                  <div className="mt-4 flex justify-center">
                    <p className="text-white text-lg">
                      Please wait, the backup is in progress... <br /> The node
                      will be locked until the backup process is finished.
                    </p>
                  </div>
                )}
                <div className="flex justify-between mt-4 space-x-4">
                  <button
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
                    disabled={isBackupInProgress}
                    onClick={() => setBackupModal(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
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
      </div>
    </div>
  )
}
