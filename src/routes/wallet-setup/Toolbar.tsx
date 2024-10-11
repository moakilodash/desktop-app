import { invoke } from '@tauri-apps/api/tauri'
import { Plus, Settings } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { ROOT_PATH, WALLET_CONFIG_PATH } from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { MinidenticonImg } from '../../components/MinidenticonImg'
import { Spinner } from '../../components/Spinner'
import {
  nodeSettingsActions,
  setSettingsAsync,
} from '../../slices/nodeSettings/nodeSettings.slice'

type Account = {
  name: string
  datapath: string
  network: 'mainnet' | 'testnet' | 'regtest'
  rpc_connection_url: string
  node_url: string
}

export const Toolbar = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleAccountChange = async (account: Account) => {
    await dispatch(
      setSettingsAsync({
        datapath: account.datapath,
        name: account.name,
        network: account.network,
        node_url: account.node_url,
        rpc_connection_url: account.rpc_connection_url,
      })
    )
    try {
      setIsLoading(true)
      if (account.node_url === 'http://localhost:3001') {
        await invoke('start_node', {
          datapath: account.datapath,
          network: account.network,
          rpcConnectionUrl: account.rpc_connection_url,
        })
      }
      await new Promise((resolve) => setTimeout(resolve, 5000))
      navigate(ROOT_PATH)
    } catch (error) {
      console.error(error)
      dispatch(nodeSettingsActions.resetNodeSettings())
      toast.error('Failed to start node')
    } finally {
      setIsLoading(false)
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

  return (
    <>
      <aside className="fixed h-full w-64 bg-gray-900 shadow-lg flex flex-col justify-between py-6 px-4 z-10">
        <div className="flex flex-col items-start space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">Your Accounts</h2>
          {accounts?.map((account, index) => (
            <button
              className="w-full text-left hover:bg-gray-800 rounded-lg transition-colors duration-200 p-2"
              key={index}
              onClick={() => {
                setSelectedAccount(account)
                setShowModal(true)
              }}
            >
              <div className="flex items-center">
                <MinidenticonImg
                  className="rounded-full mr-3"
                  height="40"
                  saturation="90"
                  username={account.datapath}
                  width="40"
                />
                <div>
                  <div className="text-white font-medium">
                    {account.name.length > 15
                      ? `${account.name.slice(0, 13)}...`
                      : account.name}
                  </div>
                  <div className="text-gray-400 text-sm">{account.network}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex flex-col space-y-2">
          <button
            className="flex items-center justify-center w-full py-2 px-4 bg-cyan-400 text-gray-900 rounded-md hover:bg-cyan-300 transition-colors duration-200"
            onClick={() => navigate(WALLET_CONFIG_PATH)}
          >
            <Plus className="mr-2" size={18} />
            Add Account
          </button>
          <button
            className="flex items-center justify-center w-full py-2 px-4 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
            onClick={() => {
              /* Add settings navigation logic */
            }}
          >
            <Settings className="mr-2" size={18} />
            Settings
          </button>
        </div>
      </aside>
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-gray-800 text-white p-6 rounded-lg shadow-lg text-center max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-semibold mb-4">Switch Account</h2>
            <p className="mb-6">
              Are you sure you want to switch to the account "
              {selectedAccount?.name}"?
            </p>
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
                {isLoading ? <Spinner size={10} /> : 'Select Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
