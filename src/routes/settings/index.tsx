import { invoke } from '@tauri-apps/api'
import {
  ChevronDown,
  LogOut,
  Undo,
  Save,
  Shield,
  Power,
  AlertTriangle,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { WALLET_SETUP_PATH } from '../../app/router/paths'
import { RootState } from '../../app/store'
import { useAppSelector } from '../../app/store/hooks'
import { BackupModal } from '../../components/BackupModal'
import { useBackup } from '../../hooks/useBackup'
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
}

export const Component: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { bitcoinUnit, nodeConnectionString, defaultLspUrl } = useSelector(
    (state: RootState) => state.settings
  )
  const currentAccount = useAppSelector((state) => state.nodeSettings.data)

  const [showModal, setShowModal] = useState(false)
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const [showShutdownConfirmation, setShowShutdownConfirmation] =
    useState(false)

  const { control, handleSubmit, formState, reset } = useForm<FormFields>({
    defaultValues: {
      bitcoinUnit,
      lspUrl: defaultLspUrl || 'http://localhost:8000',
      nodeConnectionString: nodeConnectionString || 'http://localhost:3001',
    },
  })

  const [shutdown] = nodeApi.endpoints.shutdown.useLazyQuery()
  const [lock] = nodeApi.endpoints.lock.useLazyQuery()

  const nodeSettings = useAppSelector((state) => state.nodeSettings.data)

  const {
    showBackupModal,
    setShowBackupModal,
    isBackupInProgress,
    control: backupControl,
    handleSubmit: handleBackupSubmit,
    formState: backupFormState,
    backupPath,
    handleBackup,
    selectBackupFolder,
  } = useBackup({ nodeSettings })

  useEffect(() => {
    reset({
      bitcoinUnit,
      lspUrl: nodeSettings.default_lsp_url || 'http://localhost:8000',
      nodeConnectionString: nodeConnectionString || 'http://localhost:3001',
    })
  }, [bitcoinUnit, nodeConnectionString, nodeSettings.default_lsp_url, reset])

  const handleSave = async (data: FormFields) => {
    try {
      dispatch(setBitcoinUnit(data.bitcoinUnit))
      dispatch(setNodeConnectionString(data.nodeConnectionString))
      dispatch(setDefaultLspUrl(data.lspUrl))

      await invoke('update_account', {
        datapath: currentAccount.datapath,
        defaultLspUrl: data.lspUrl,
        indexerUrl: currentAccount.indexer_url,
        name: currentAccount.name,
        network: currentAccount.network,
        nodeUrl: currentAccount.node_url,
        proxyEndpoint: currentAccount.proxy_endpoint,
        rpcConnectionUrl: currentAccount.rpc_connection_url,
      })

      setShowModal(true)
      setTimeout(() => setShowModal(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    }
  }

  const handleLogout = async () => {
    setShowLogoutConfirmation(true)
  }

  const confirmLogout = async () => {
    try {
      const lockResponse = await lock().unwrap()
      if (lockResponse) {
        await invoke('stop_node')
        dispatch(nodeSettingsActions.resetNodeSettings())
        toast.success('Logout successful')
      } else {
        throw new Error('Node lock unsuccessful')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(
        `Logout failed: ${error instanceof Error ? error.message : ''}. Redirecting anyway.`
      )
    } finally {
      navigate(WALLET_SETUP_PATH)
      setShowLogoutConfirmation(false)
    }
  }

  const handleUndo = () => {
    reset({
      bitcoinUnit,
      lspUrl: defaultLspUrl,
      nodeConnectionString,
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
              </div>
            )}
          />
          <div className="pt-4 space-y-4">
            <button
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
              onClick={() => setShowBackupModal(true)}
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

        <BackupModal
          backupPath={backupPath}
          control={backupControl}
          formState={backupFormState}
          isBackupInProgress={isBackupInProgress}
          onClose={() => setShowBackupModal(false)}
          onSelectFolder={selectBackupFolder}
          onSubmit={handleBackupSubmit(handleBackup)}
          setValue={backupControl.setValue}
          showModal={showBackupModal}
        />

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
