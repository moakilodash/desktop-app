import { invoke } from '@tauri-apps/api/tauri'
import { Cog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { toast } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { MinidenticonImg } from '../../components/MinidenticonImg'
import { Spinner } from '../../components/Spinner'
import {
  Account,
  NodeSettings,
  readSettings,
  writeSettings,
} from '../../slices/nodeSettings/nodeSettings.slice'

export const Toolbar = () => {
  const { data }: { data: NodeSettings } = useAppSelector(
    (state) => state.nodeSettings
  )
  const dispatch = useAppDispatch()
  const accounts: Account[] = data.accounts

  const [showModal, setShowModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    dispatch(readSettings())
  }, [dispatch])

  const handleAccountChange = async (account: Account) => {
    setIsLoading(true)
    try {
      await invoke('stop_node')
      await dispatch(writeSettings({ ...data, ...account })).unwrap()
      await invoke('start_node')
      toast.success('Account switched successfully')
      setShowModal(false)
    } catch (error) {
      toast.error('Failed to switch account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <aside className="fixed h-full w-48 bg-gradient-to-b from-gray-800 to-gray-900 items-center shadow-lg flex flex-col justify-between py-4 px-2 border-r border-gray-700">
        <div className="flex flex-col items-center space-y-4 h-full justify-center">
          {accounts?.map((account, index) => (
            <div
              className={`flex text-white ${data.datapath === account.datapath ? 'bg-gray-700' : 'hover:bg-gray-700 '} p-2 rounded`}
              key={index}
            >
              <MinidenticonImg
                height="50"
                saturation="90"
                username={account.datapath}
                width="50"
              />
              <button
                className={`text-white ${data.datapath === account.datapath ? 'bg-gray-700' : 'hover:bg-gray-700 '} p-2 rounded`}
                onClick={() => {
                  setSelectedAccount(account)
                  setShowModal(true)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  console.log('right click')
                }}
              >
                {account.name.length > 10
                  ? `${account.name.slice(0, 3)}...${account.name.slice(-3)}`
                  : account.name}
              </button>
            </div>
          ))}
        </div>
        <div>
          <NavLink to="/node-settings">
            <Cog color="grey" size={36} />
          </NavLink>
        </div>
      </aside>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-semibold mb-4">Changing Account</h2>
            <p>
              Are you sure you want to switch to the account "
              {selectedAccount?.name}"? This will restart the node with the new
              account settings.
            </p>
            <div className="flex mt-4">
              <button
                className="w-full px-6 py-3 bg-gray-300 hover:bg-gray-400 text-lg font-bold rounded shadow-md transition duration-200 mr-2"
                disabled={isLoading}
                onClick={() => setShowModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
                disabled={isLoading}
                onClick={() =>
                  selectedAccount && handleAccountChange(selectedAccount)
                }
                type="button"
              >
                {isLoading ? <Spinner size={6} /> : 'Switch Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
