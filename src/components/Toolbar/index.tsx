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

export interface Account {
  datapath: string
  default_lsp_url: string
  default_maker_url: string
  indexer_url: string
  maker_urls: string[] | string // Allow both array and string
  name: string
  network: BitcoinNetwork
  node_url: string
  proxy_endpoint: string
  rpc_connection_url: string
}

interface EditAccountModalProps {
  account: Account
  onClose: () => void
  onSave: (updatedAccount: Account) => Promise<void>
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({
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
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 text-white p-8 rounded-xl shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
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
            <label className="block text-gray-300 mb-2">
              RPC Connection URL
            </label>
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
            <label className="block text-gray-300 mb-2">
              RGB Proxy Endpoint
            </label>
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
      </div>
    </div>
  )
}

interface ToolbarProps {
  isCollapsed?: boolean
}

export const Toolbar: React.FC<ToolbarProps> = ({ isCollapsed = false }) => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    // Listen for node started event
    const unlisten = listen('node-started', () => {
      toast.success('Local node started successfully', {
        autoClose: 3000,
        closeOnClick: true,
        draggable: true,
        hideProgressBar: false,
        pauseOnHover: true,
        position: 'bottom-right',
      })
    })

    return () => {
      unlisten.then((unlistenFn) => unlistenFn())
    }
  }, [])

  const handleAccountChange = async (account: Account) => {
    try {
      // First set the current account in the database
      await invoke('set_current_account', { accountName: account.name })

      // Load the account data from the database to ensure we have the latest data
      const dbAccount = await invoke<Account>('get_account_by_name', {
        name: account.name,
      })

      if (!dbAccount) {
        throw new Error('Account not found in database')
      }

      // Transform the maker_urls from string to array if needed
      const formattedAccount = {
        ...dbAccount,
        maker_urls: Array.isArray(dbAccount.maker_urls)
          ? dbAccount.maker_urls
          : dbAccount.maker_urls
              ?.split(',')
              .filter((url) => url.trim() !== '') || [],
      }

      // Update Redux state with the database data
      await dispatch(setSettingsAsync(formattedAccount))

      setIsLoading(true)
      if (
        account.node_url === 'http://localhost:3001' &&
        account.datapath !== ''
      ) {
        toast.info('Starting local node...', {
          autoClose: 2000,
          position: 'bottom-right',
        })
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await invoke('start_node', {
          daemonListeningPort: '3001',
          datapath: account.datapath,
          ldkPeerListeningPort: '9735',
          network: account.network,
        })
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
      navigate(ROOT_PATH)
    } catch (error) {
      console.error(error)
      dispatch(nodeSettingsActions.resetNodeSettings())
      toast.error('Failed to start node')
    } finally {
      setIsLoading(false)
      setShowModal(false)
    }
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const accounts = (await invoke('get_accounts')) as Account[]
        setAccounts(accounts)
      } catch (error) {
        console.error(error)
        toast.error('Failed to fetch accounts')
      }
    })()
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    if (showModal) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showModal, closeModal])

  const handleDeleteAccount = async (account: Account) => {
    try {
      await invoke('delete_account', { name: account.name })
      setAccounts(accounts.filter((a) => a.name !== account.name))
      toast.success(`Account "${account.name}" deleted successfully`)
    } catch (error) {
      console.error(error)
      toast.error(`Failed to delete account "${account.name}"`)
    } finally {
      setShowDeleteModal(false)
      setAccountToDelete(null)
    }
  }

  const toggleEditing = () => {
    setIsEditing(!isEditing)
  }

  const handleUpdateAccount = async (updatedAccount: Account) => {
    try {
      await invoke('update_account', { account: updatedAccount })
      setAccounts(
        accounts.map((acc) =>
          acc.name === updatedAccount.name ? updatedAccount : acc
        )
      )
      toast.success(`Account "${updatedAccount.name}" updated successfully`)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h2
            className={`text-xl font-semibold text-white transition-opacity duration-200
            ${isCollapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
          >
            Your Accounts
          </h2>
          <button
            className={`p-2 rounded-lg text-gray-400 hover:text-white 
              transition-colors duration-200 ${isEditing ? 'bg-blue-darker text-cyan' : ''}`}
            onClick={toggleEditing}
            title={isEditing ? 'Exit Edit Mode' : 'Edit Accounts'}
          >
            {isEditing ? <X size={18} /> : <Edit size={18} />}
          </button>
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {accounts?.map((account, index) => (
            <div
              className={`group bg-blue-darker/50 rounded-xl transition-all duration-200 
                hover:bg-blue-darker relative overflow-hidden border border-divider/5
                ${isCollapsed ? 'p-2' : 'p-4'}`}
              key={index}
            >
              <button
                className="w-full text-left"
                onClick={() => {
                  if (!isEditing) {
                    setSelectedAccount(account)
                    setShowModal(true)
                  }
                }}
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
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-darkest 
                        flex items-center justify-center"
                      >
                        {account.datapath ? (
                          <Server className="w-3 h-3 text-green-400" />
                        ) : (
                          <Cloud className="w-3 h-3 text-cyan" />
                        )}
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
                        {account.datapath ? (
                          <span className="flex items-center text-green-400 text-sm">
                            <Server className="w-3 h-3 mr-1" />
                            Local
                          </span>
                        ) : (
                          <span className="flex items-center text-cyan text-sm">
                            <Cloud className="w-3 h-3 mr-1" />
                            Remote
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </button>

              {/* Edit Actions */}
              {isEditing && !isCollapsed && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    className="p-2 rounded-lg text-gray-400 hover:text-cyan hover:bg-blue-darkest/50
                      transition-colors duration-200"
                    onClick={() => setEditingAccount(account)}
                    title="Edit Account"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="p-2 rounded-lg text-gray-400 hover:text-red hover:bg-blue-darkest/50
                      transition-colors duration-200"
                    onClick={() => {
                      setAccountToDelete(account)
                      setShowDeleteModal(true)
                    }}
                    title="Delete Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Account Selection Modal */}
      {showModal && selectedAccount && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gray-800 text-white p-8 rounded-xl shadow-xl text-center max-w-lg w-full mx-4 overflow-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
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
                  username={selectedAccount.name}
                  width="48"
                />
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedAccount.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-gray-600 px-3 py-1 rounded-full text-sm">
                      {selectedAccount.network}
                    </span>
                    {selectedAccount.datapath ? (
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

              {/* Account Details */}
              <div className="space-y-3 text-sm">
                {selectedAccount.datapath && (
                  <div>
                    <label className="text-gray-400 block mb-1">
                      Data Path
                    </label>
                    <div className="text-white break-all">
                      {selectedAccount.datapath}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-gray-400 block mb-1">Node URL</label>
                  <div className="text-white break-all">
                    {selectedAccount.node_url}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">
                    RPC Connection
                  </label>
                  <div className="text-white break-all">
                    {selectedAccount.rpc_connection_url}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">
                    Indexer URL
                  </label>
                  <div className="text-white break-all">
                    {selectedAccount.indexer_url}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">RGB Proxy</label>
                  <div className="text-white break-all">
                    {selectedAccount.proxy_endpoint}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                className="w-full sm:w-1/2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded shadow-md transition duration-200"
                disabled={isLoading}
                onClick={() => setShowModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="w-full sm:w-1/2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold rounded shadow-md transition duration-200"
                disabled={isLoading}
                onClick={() =>
                  selectedAccount && handleAccountChange(selectedAccount)
                }
                type="button"
              >
                {isLoading ? <Spinner size={20} /> : 'Select Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && accountToDelete && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-gray-800 text-white p-8 rounded-xl shadow-xl text-center max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center mb-6">
              <AlertTriangle className="text-yellow-500 w-16 h-16 mb-4" />
              <h2 className="text-2xl font-bold">Delete Account</h2>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-gray-300">
                Are you sure you want to delete the account "
                <span className="font-semibold text-white">
                  {accountToDelete.name}
                </span>
                "?
              </p>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-left">
                <p className="text-yellow-500 font-medium mb-2">⚠️ Warning</p>
                <ul className="text-yellow-100/80 space-y-2 text-sm">
                  <li>• This action cannot be undone</li>
                  {accountToDelete.datapath ? (
                    <>
                      <li>
                        • If you haven't backed up your node, you will
                        permanently lose access to your funds
                      </li>
                      <li>• All local node data will be permanently deleted</li>
                      <li className="break-all">
                        • Data path to be deleted: {accountToDelete.datapath}
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        • This will only delete the stored connection settings
                      </li>
                      <li>
                        • The remote node will remain active and must be managed
                        directly on the remote machine
                      </li>
                      <li>
                        • Make sure you have access to the remote node's
                        credentials if you want to reconnect later
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                className="w-full sm:w-1/2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded-lg shadow-md transition duration-200"
                onClick={() => setShowDeleteModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="w-full sm:w-1/2 px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-white text-lg font-bold rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2"
                onClick={() => handleDeleteAccount(accountToDelete)}
                type="button"
              >
                <Trash2 size={20} />
                Delete {accountToDelete.datapath ? 'Node' : 'Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleUpdateAccount}
        />
      )}
    </>
  )
}
