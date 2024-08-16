import { emit } from '@tauri-apps/api/event'
import { exit } from '@tauri-apps/api/process'
import { Cog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { toast } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { MinidenticonImg } from '../../components/MinidenticonImg'
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
  const [newDatapath, setNewDatapath] = useState('')

  useEffect(() => {
    dispatch(readSettings())
  }, [])

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
                  setNewDatapath(account.datapath)
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

            {/*
            <button className="text-white hover:bg-gray-700 p-2 rounded">
              Settings
            </button>
            */}
          </NavLink>
        </div>
      </aside>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-semibold mb-4">Changing Account</h2>
            <p>
              In order to change the account you will need to restart the
              application for changes to take effect.
            </p>
            <div className="flex">
              <button
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-lg font-bold rounded shadow-md transition duration-200"
                onClick={() => setShowModal(false)}
                type="button"
              >
                Do it later
              </button>
              <button
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-lg font-bold rounded shadow-md transition duration-200"
                onClick={async () => {
                  dispatch(writeSettings({ ...data, datapath: newDatapath }))
                    .unwrap()
                    .then(async () => {
                      await emit('app-will-relaunch')

                      setTimeout(() => {
                        // relaunch().catch((err) => toast.error(err))
                        exit().catch((err) => toast.error(err))
                      }, 1000)
                    })
                }}
                type="button"
              >
                Restart now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
