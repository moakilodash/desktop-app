import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { Trash2, Edit, X, Server, Cloud, AlertTriangle } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { ROOT_PATH } from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { MinidenticonImg } from '../../components/MinidenticonImg'
import { Spinner } from '../../components/Spinner'
import { BitcoinNetwork } from '../../constants'
import {
  nodeSettingsActions,
  setSettingsAsync,
} from '../../slices/nodeSettings/nodeSettings.slice'

// Types and Interfaces
export interface Account {
  datapath: string
  default_lsp_url: string
  default_maker_url: string
  indexer_url: string
  maker_urls: string[] | string
  name: string
  network: BitcoinNetwork
  node_url: string
  proxy_endpoint: string
  rpc_connection_url: string
  daemon_listening_port: string
  ldk_peer_listening_port: string
}

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
}

interface AccountCardProps {
  account: Account
  isCollapsed: boolean
  isEditing: boolean
  onSelect: (account: Account) => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

// Modal Component
const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="bg-gray-800 text-white p-8 rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// Account Card Component
const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isCollapsed,
  isEditing,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const NodeIcon = account.datapath ? Server : Cloud
  const nodeType = account.datapath ? 'Local' : 'Remote'
  const nodeColor = account.datapath ? 'text-green-400' : 'text-cyan'

  return (
    <div
      className={`group bg-blue-darker/50 rounded-xl transition-all duration-200 
        hover:bg-blue-darker relative overflow-hidden border border-divider/5
        ${isCollapsed ? 'p-2' : 'p-4'}`}
    >
      <button
        aria-label={`Select account ${account.name}`}
        className="w-full text-left"
        onClick={() => !isEditing && onSelect(account)}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <MinidenticonImg
              className="rounded-lg flex-shrink-0"
              height={isCollapsed ? '40' : '40'}
              saturation="90"
              username={account.name}
              width={isCollapsed ? '40' : '40'}
            />
            {isCollapsed && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-darkest flex items-center justify-center">
                <NodeIcon className={`w-3 h-3 ${nodeColor}`} />
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <div className="font-medium text-white truncate">
                {account.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-darkest text-gray-400">
                  {account.network}
                </span>
                <span className={`flex items-center ${nodeColor} text-sm`}>
                  <NodeIcon className="w-3 h-3 mr-1" />
                  {nodeType}
                </span>
              </div>
            </div>
          )}
        </div>
      </button>

      {isEditing && !isCollapsed && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            aria-label={`Edit account ${account.name}`}
            className="p-2 rounded-lg text-gray-400 hover:text-cyan hover:bg-blue-darkest/50
              transition-colors duration-200"
            onClick={() => onEdit(account)}
          >
            <Edit size={16} />
          </button>
          <button
            aria-label={`Delete account ${account.name}`}
            className="p-2 rounded-lg text-gray-400 hover:text-red hover:bg-blue-darkest/50
              transition-colors duration-200"
            onClick={() => onDelete(account)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

// Custom Hooks
const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const fetchedAccounts = (await invoke('get_accounts')) as Account[]
        setAccounts(fetchedAccounts)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to fetch accounts')
        )
        toast.error('Failed to fetch accounts')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  const updateAccount = useCallback(async (updatedAccount: Account) => {
    try {
      await invoke('update_account', { account: updatedAccount })
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.name === updatedAccount.name ? updatedAccount : acc
        )
      )
      toast.success(`Account "${updatedAccount.name}" updated successfully`)
    } catch (error) {
      console.error(error)
      throw error
    }
  }, [])

  const deleteAccount = useCallback(async (account: Account) => {
    try {
      await invoke('delete_account', { name: account.name })
      setAccounts((prev) => prev.filter((a) => a.name !== account.name))
      toast.success(`Account "${account.name}" deleted successfully`)
    } catch (error) {
      console.error(error)
      toast.error(`Failed to delete account "${account.name}"`)
      throw error
    }
  }, [])

  return {
    accounts,
    deleteAccount,
    error,
    isLoading,
    updateAccount,
  }
}

// Main Toolbar Component
interface ToolbarProps {
  isCollapsed?: boolean
}

export const Toolbar: React.FC<ToolbarProps> = ({ isCollapsed = false }) => {
  const { accounts, isLoading, error, updateAccount, deleteAccount } =
    useAccounts()

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    const unlisten = listen('node-started', () => {
      toast.success('Local node started successfully', {
        autoClose: 3000,
        position: 'bottom-right',
      })
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const handleAccountChange = async (account: Account) => {
    try {
      setIsSwitching(true)
      console.log('Starting account change for:', account.name)

      const currentAccount = await invoke<Account | null>('get_current_account')
      console.log('Current account:', currentAccount)

      const isNodeRunning = await invoke<boolean>('is_node_running', {
        accountName: account.name,
      })
      console.log('Is node running:', isNodeRunning)

      const runningNodeAccount = await invoke<string | null>(
        'get_running_node_account'
      )
      console.log('Running node account:', runningNodeAccount)

      if (
        currentAccount &&
        currentAccount.name === account.name &&
        isNodeRunning
      ) {
        console.log('Account already running, navigating to root')
        navigate(ROOT_PATH)
        return
      }

      if (runningNodeAccount && runningNodeAccount !== account.name) {
        console.log('Stopping existing node for account:', runningNodeAccount)
        await invoke('stop_node')
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      console.log('Setting current account:', account.name)
      await invoke('set_current_account', { accountName: account.name })

      console.log('Getting account from database:', account.name)
      const dbAccount = await invoke<Account>('get_account_by_name', {
        name: account.name,
      })

      if (!dbAccount) {
        throw new Error('Account not found in database')
      }

      console.log('Formatting account data')
      const formattedAccount = {
        ...dbAccount,
        maker_urls: Array.isArray(dbAccount.maker_urls)
          ? dbAccount.maker_urls
          : dbAccount.maker_urls
              ?.split(',')
              .filter((url) => url.trim() !== '') || [],
      }

      console.log('Updating Redux state with account data')
      await dispatch(setSettingsAsync(formattedAccount))

      if (
        account.node_url.startsWith('http://localhost:') &&
        account.datapath !== ''
      ) {
        console.log('Starting local node with parameters:', {
          accountName: account.name,
          daemonListeningPort: account.daemon_listening_port,
          datapath: account.datapath,
          ldkPeerListeningPort: account.ldk_peer_listening_port,
          network: account.network,
        })

        toast.info('Starting local node...', {
          autoClose: 2000,
          position: 'bottom-right',
        })

        try {
          await invoke('start_node', {
            accountName: account.name,
            daemonListeningPort: account.daemon_listening_port,
            datapath: account.datapath,
            ldkPeerListeningPort: account.ldk_peer_listening_port,
            network: account.network,
          })
          console.log('Node started successfully')
        } catch (error) {
          console.error('Failed to start node:', error)
          throw new Error(
            error instanceof Error ? error.message : 'Failed to start node'
          )
        }
      }

      console.log('Navigating to root path')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      navigate(ROOT_PATH)
    } catch (error) {
      console.error('Account change failed:', error)
      dispatch(nodeSettingsActions.resetNodeSettings())
      toast.error(
        error instanceof Error
          ? `Failed to start node: ${error.message}`
          : 'Failed to start node'
      )
    } finally {
      setIsSwitching(false)
      setSelectedAccount(null)
    }
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading accounts: {error.message}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={24} />
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <h2
            className={`text-xl font-semibold text-white transition-opacity duration-200
            ${isCollapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
          >
            Your Accounts
          </h2>
          <button
            aria-label={isEditing ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            className={`p-2 rounded-lg text-gray-400 hover:text-white 
              transition-colors duration-200 ${isEditing ? 'bg-blue-darker text-cyan' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <X size={18} /> : <Edit size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {accounts.map((account) => (
            <AccountCard
              account={account}
              isCollapsed={isCollapsed}
              isEditing={isEditing}
              key={account.name}
              onDelete={setAccountToDelete}
              onEdit={setEditingAccount}
              onSelect={setSelectedAccount}
            />
          ))}
        </div>
      </div>

      {/* Account Selection Modal */}
      {selectedAccount && (
        <Modal onClose={() => setSelectedAccount(null)}>
          <AccountSelectionModalContent
            account={selectedAccount}
            isLoading={isSwitching}
            onCancel={() => setSelectedAccount(null)}
            onConfirm={handleAccountChange}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <Modal onClose={() => setAccountToDelete(null)}>
          <DeleteConfirmationModalContent
            account={accountToDelete}
            onCancel={() => setAccountToDelete(null)}
            onConfirm={deleteAccount}
          />
        </Modal>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <Modal onClose={() => setEditingAccount(null)}>
          <EditAccountModalContent
            account={editingAccount}
            onClose={() => setEditingAccount(null)}
            onSave={updateAccount}
          />
        </Modal>
      )}
    </>
  )
}

// Modal Content Components
interface AccountSelectionModalContentProps {
  account: Account
  isLoading: boolean
  onCancel: () => void
  onConfirm: (account: Account) => void
}

const AccountSelectionModalContent: React.FC<
  AccountSelectionModalContentProps
> = ({ account, isLoading, onCancel, onConfirm }) => {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Switch Account</h2>
        <p className="text-gray-400">
          Review the account details before switching
        </p>
      </div>

      <div className="bg-gray-700/50 p-6 rounded-xl mb-8 text-left space-y-4 border border-gray-600">
        <div className="flex items-center gap-4 mb-6">
          <MinidenticonImg
            className="rounded-lg"
            height="48"
            saturation="90"
            username={account.name}
            width="48"
          />
          <div>
            <h3 className="text-xl font-semibold">{account.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-gray-600 px-3 py-1 rounded-full text-sm">
                {account.network}
              </span>
              {account.datapath ? (
                <span className="flex items-center text-green-400 text-sm">
                  <Server className="mr-1" size={14} />
                  Local Node
                </span>
              ) : (
                <span className="flex items-center text-blue-400 text-sm">
                  <Cloud className="mr-1" size={14} />
                  Remote Node
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {account.datapath && (
            <div>
              <label className="text-gray-400 block mb-1">Data Path</label>
              <div className="text-white break-all">{account.datapath}</div>
            </div>
          )}
          <div>
            <label className="text-gray-400 block mb-1">Node URL</label>
            <div className="text-white break-all">{account.node_url}</div>
          </div>
          <div>
            <label className="text-gray-400 block mb-1">RPC Connection</label>
            <div className="text-white break-all">
              {account.rpc_connection_url}
            </div>
          </div>
          <div>
            <label className="text-gray-400 block mb-1">Indexer URL</label>
            <div className="text-white break-all">{account.indexer_url}</div>
          </div>
          <div>
            <label className="text-gray-400 block mb-1">RGB Proxy</label>
            <div className="text-white break-all">{account.proxy_endpoint}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <button
          className="w-full sm:w-1/2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded shadow-md transition duration-200"
          disabled={isLoading}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="w-full sm:w-1/2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold rounded shadow-md transition duration-200"
          disabled={isLoading}
          onClick={() => onConfirm(account)}
          type="button"
        >
          {isLoading ? <Spinner size={20} /> : 'Select Account'}
        </button>
      </div>
    </>
  )
}

interface DeleteConfirmationModalContentProps {
  account: Account
  onCancel: () => void
  onConfirm: (account: Account) => void
}

const DeleteConfirmationModalContent: React.FC<
  DeleteConfirmationModalContentProps
> = ({ account, onCancel, onConfirm }) => {
  const handleDelete = async () => {
    try {
      await onConfirm(account)
      onCancel() // Close the modal after successful deletion
    } catch (error) {
      // Error is already handled in the parent component
      console.error('Failed to delete account:', error)
    }
  }

  return (
    <>
      <div className="flex flex-col items-center mb-6">
        <AlertTriangle className="text-yellow-500 w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold">Delete Account</h2>
      </div>

      <div className="space-y-4 mb-8">
        <p className="text-gray-300">
          Are you sure you want to delete the account "
          <span className="font-semibold text-white">{account.name}</span>"?
        </p>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-left">
          <p className="text-yellow-500 font-medium mb-2">⚠️ Warning</p>
          <ul className="text-yellow-100/80 space-y-2 text-sm">
            <li>• This action cannot be undone</li>
            {account.datapath ? (
              <>
                <li>
                  • If you haven't backed up your node, you will permanently
                  lose access to your funds
                </li>
                <li>• All local node data will be permanently deleted</li>
                <li className="break-all">
                  • Data path to be deleted: {account.datapath}
                </li>
              </>
            ) : (
              <>
                <li>• This will only delete the stored connection settings</li>
                <li>
                  • The remote node will remain active and must be managed
                  directly on the remote machine
                </li>
                <li>
                  • Make sure you have access to the remote node's credentials
                  if you want to reconnect later
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <button
          className="w-full sm:w-1/2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded-lg shadow-md transition duration-200"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="w-full sm:w-1/2 px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-white text-lg font-bold rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2"
          onClick={handleDelete}
          type="button"
        >
          <Trash2 size={20} />
          Delete {account.datapath ? 'Node' : 'Connection'}
        </button>
      </div>
    </>
  )
}

interface EditAccountModalContentProps {
  account: Account
  onClose: () => void
  onSave: (updatedAccount: Account) => Promise<void>
}

const EditAccountModalContent: React.FC<EditAccountModalContentProps> = ({
  account,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState(account)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSave(formData)
      toast.success('Account updated successfully')
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Failed to update account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">Edit Account</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-gray-300 mb-2">Account Name</label>
          <input
            className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
            disabled
            type="text"
            value={formData.name}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">Node URL</label>
          <input
            className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
            onChange={(e) =>
              setFormData({ ...formData, node_url: e.target.value })
            }
            type="text"
            value={formData.node_url}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">RPC Connection URL</label>
          <input
            className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
            onChange={(e) =>
              setFormData({ ...formData, rpc_connection_url: e.target.value })
            }
            type="text"
            value={formData.rpc_connection_url}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">Indexer URL</label>
          <input
            className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
            onChange={(e) =>
              setFormData({ ...formData, indexer_url: e.target.value })
            }
            type="text"
            value={formData.indexer_url}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">RGB Proxy Endpoint</label>
          <input
            className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
            onChange={(e) =>
              setFormData({ ...formData, proxy_endpoint: e.target.value })
            }
            type="text"
            value={formData.proxy_endpoint}
          />
        </div>

        <div className="flex space-x-4 mt-8">
          <button
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? <Spinner size={20} /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </>
  )
}
