import { useNavigate } from 'react-router-dom'

import {
  INIT_PATH,
  WALLET_RESTORE_PATH,
  WALLET_UNLOCK_PATH,
} from '../../app/router/paths'
import { Layout } from '../../components/Layout'

export const Component = () => {
  const navigate = useNavigate()
  return (
    <Layout>
      <div className="max-w-2xl w-full bg-blue-dark py-8 px-6 rounded flex justify-around">
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan w-40"
          onClick={() => navigate(INIT_PATH)}
        >
          Create a new Wallet
        </button>
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan w-40"
          onClick={() => navigate(WALLET_RESTORE_PATH)}
        >
          Restore a Wallet from Backup
        </button>
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan w-40"
          onClick={() => navigate(WALLET_UNLOCK_PATH)}
        >
          Unlock Wallet
        </button>
      </div>
    </Layout>
  )
}
