import { invoke } from '@tauri-apps/api'
import { save } from '@tauri-apps/api/dialog'
import {
  ChevronDown,
  LogOut,
  Undo,
  Save,
  Shield,
  Power,
  AlertTriangle,
  Download,
  Activity,
  Settings,
  CheckCircle2,
  XCircle,
  Server,
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
} from '../../slices/settings/settings.slice'

import { TerminalLogDisplay } from './TerminalLogDisplay'

interface FormFields {
  bitcoinUnit: string
  nodeConnectionString: string
  lspUrl: string
}

export const Component: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { bitcoinUnit, nodeConnectionString } = useSelector(
    (state: RootState) => state.settings
  )
  const currentAccount = useAppSelector((state) => state.nodeSettings.data)

  const [showModal, setShowModal] = useState(false)
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const [showShutdownConfirmation, setShowShutdownConfirmation] =
    useState(false)

  const { control, handleSubmit, reset } = useForm<FormFields>({
    defaultValues: {
      bitcoinUnit,
      lspUrl: 'http://localhost:8000',
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

  const [nodeLogs, setNodeLogs] = useState<string[]>([])

  const fetchNodeLogs = async () => {
    try {
      const logs = await invoke<string[]>('get_node_logs')
      setNodeLogs(logs)
    } catch (error) {
      console.error('Failed to fetch node logs:', error)
    }
  }

  useEffect(() => {
    fetchNodeLogs()
  }, [])

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

      dispatch(
        nodeSettingsActions.setNodeSettings({
          ...currentAccount,
          default_lsp_url: data.lspUrl,
        })
      )

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
      console.log('lockResponse', lockResponse)

      if (lockResponse !== undefined && lockResponse !== null) {
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
      lspUrl: nodeSettings.default_lsp_url || 'http://localhost:8000',
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

  const handleExportLogs = async () => {
    try {
      const filePath = await save({
        defaultPath: `node-logs-${new Date().toISOString().split('T')[0]}.txt`,
        filters: [
          {
            extensions: ['txt'],
            name: 'Log Files',
          },
        ],
      })

      if (filePath) {
        const logsText = nodeLogs.join('\n')
        await invoke('save_logs_to_file', {
          content: logsText,
          filePath,
        })
        toast.success('Logs exported successfully')
      }
    } catch (error) {
      console.error('Failed to export logs:', error)
      toast.error('Failed to export logs')
    }
  }

  const isLocalNode = !!currentAccount.datapath

  const nodeInfo = nodeApi.endpoints.nodeInfo.useQueryState()
  const isNodeRunning = nodeInfo.isSuccess

  return (
    <div className="flex flex-col min-h-screen py-8 px-4">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Settings Column */}
        <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-400" />
            <h2 className="text-4xl font-bold text-white">Settings</h2>
          </div>
          <p className="text-gray-400 mb-8">
            Manage your node and application preferences
          </p>

          <form className="space-y-8" onSubmit={handleSubmit(handleSave)}>
            <Controller
              control={control}
              name="bitcoinUnit"
              render={({ field }) => (
                <div className="group transition-all duration-300 hover:translate-x-1">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Bitcoin Unit
                  </label>
                  <div className="relative">
                    <select
                      {...field}
                      className="block w-full pl-4 pr-10 py-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="SAT">Satoshi (SAT)</option>
                      <option value="BTC">Bitcoin (BTC)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}
            />

            <div className="space-y-6">
              <Controller
                control={control}
                name="nodeConnectionString"
                render={({ field }) => (
                  <div className="group transition-all duration-300 hover:translate-x-1">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Node Connection String
                    </label>
                    <input
                      {...field}
                      className="w-full px-4 py-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                      placeholder="e.g., http://localhost:3001"
                      type="text"
                    />
                  </div>
                )}
              />

              <Controller
                control={control}
                name="lspUrl"
                render={({ field }) => (
                  <div className="group transition-all duration-300 hover:translate-x-1">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Default LSP URL
                    </label>
                    <input
                      {...field}
                      className="w-full px-4 py-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                      placeholder="e.g., http://localhost:8000"
                      type="text"
                    />
                  </div>
                )}
              />
            </div>

            {/* Settings Column - Save/Undo buttons section */}
            <div className="pt-8 border-t border-[#2A2D3A] mt-6">
              <div className="flex gap-4">
                <button
                  className="flex-1 flex items-center justify-center px-6 py-3.5 bg-[#2A2D3A] text-white rounded-xl hover:bg-[#363A4B] focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                  onClick={handleUndo}
                  type="button"
                >
                  <Undo className="w-5 h-5 mr-2.5" />
                  Reset Changes
                </button>
                <button
                  className="flex-1 flex items-center justify-center px-6 py-3.5 bg-[#4361EE] text-white rounded-xl hover:bg-[#3651DE] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  type="submit"
                >
                  <Save className="w-5 h-5 mr-2.5" />
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Node Status Column */}
        <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-8 h-8 text-blue-400" />
            <h2 className="text-4xl font-bold text-white">Node Status</h2>
          </div>

          <div className="flex items-center gap-2 mb-8">
            <Activity className="w-4 h-4 text-gray-400" />
            <p className="text-gray-400">
              Monitor your node's activity and logs
            </p>
          </div>

          {/* Node Status Indicator - Replace the previous status indicator */}
          <div className="mb-8">
            <div className="flex flex-col gap-4">
              {/* Main Status Card */}
              <div
                className={`p-4 rounded-xl border ${
                  isNodeRunning
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isNodeRunning ? (
                    <div className="relative">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <div className="relative">
                      <XCircle className="w-6 h-6 text-red-400" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full" />
                    </div>
                  )}
                  <span
                    className={`text-lg font-medium ${
                      isNodeRunning ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    Node is {isNodeRunning ? 'Running' : 'Offline'}
                  </span>
                </div>
                <p
                  className={`mt-2 text-sm ml-9 ${
                    isNodeRunning ? 'text-green-300/70' : 'text-red-300/70'
                  }`}
                >
                  {isNodeRunning
                    ? 'Your node is operational and processing transactions'
                    : 'Node is currently offline or experiencing issues'}
                </p>
              </div>

              {/* Connection Type */}
              <div className="p-4 bg-gray-700/30 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Server className="w-4 h-4" />
                  <span className="text-sm font-medium">Connection Type</span>
                </div>
                <p className="text-white font-medium ml-6">
                  {isLocalNode ? 'Local Node' : 'Remote Node'}
                </p>
              </div>
            </div>
          </div>

          {/* Move node control buttons here, after the status indicators */}
          <div className="space-y-4 mb-8">
            <button
              className="w-full flex items-center justify-center px-4 py-3 bg-[#4361EE] text-white rounded-xl hover:bg-[#3651DE] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              onClick={() => setShowBackupModal(true)}
              type="button"
            >
              <Shield className="w-5 h-5 mr-2" />
              Backup Wallet
            </button>

            <div className="flex space-x-4">
              <button
                className="flex-1 flex items-center justify-center px-4 py-3 bg-[#2A2D3A] text-white rounded-xl hover:bg-[#363A4B] focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                onClick={handleLogout}
                type="button"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>

              <button
                className="flex-1 flex items-center justify-center px-4 py-3 bg-red text-white rounded-xl hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                onClick={handleShutdown}
                type="button"
              >
                <Power className="w-5 h-5 mr-2" />
                Shutdown Node
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New full-width logs section */}
      {isLocalNode && (
        <div className="w-full max-w-7xl mx-auto">
          <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Node Logs</h3>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  disabled={nodeLogs.length === 0}
                  onClick={handleExportLogs}
                  type="button"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  onClick={() => fetchNodeLogs()}
                  type="button"
                >
                  Refresh Logs
                </button>
                <button
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  disabled={nodeLogs.length === 0}
                  onClick={() => setNodeLogs([])}
                  type="button"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                <span className="text-sm text-gray-400">Live Node Logs</span>
                <span className="text-xs text-gray-500">
                  {nodeLogs.length} entries
                </span>
              </div>
              <div className="p-4 h-96 overflow-y-auto font-mono text-sm">
                {nodeLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No logs available
                  </div>
                ) : (
                  <TerminalLogDisplay logs={nodeLogs} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              Are you sure you want to shut down the node? This action cannot be
              undone.
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
  )
}
