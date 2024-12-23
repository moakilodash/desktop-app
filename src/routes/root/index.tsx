import { invoke } from '@tauri-apps/api'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import {
  TRADE_PATH,
  WALLET_SETUP_PATH,
  WALLET_UNLOCK_PATH,
} from '../../app/router/paths'
import { Layout } from '../../components/Layout'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

export const RootRoute = () => {
  const navigate = useNavigate()
  const [nodeInfo, nodeInfoResponse] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  useEffect(() => {
    const closeSplashscreen = async () => {
      try {
        // Wait for DOM to be fully ready
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await invoke('close_splashscreen')
      } catch (error) {
        console.error('Failed to close splashscreen:', error)
      }
    }

    // Call it when component mounts
    closeSplashscreen()
  }, [])

  useEffect(() => {
    async function run() {
      const nodeInfoResponse = await nodeInfo()
      const error: any = nodeInfoResponse.error
      console.log(nodeInfoResponse)

      if (nodeInfoResponse.isError) {
        if (error.status !== 400) {
          navigate(WALLET_UNLOCK_PATH)
        } else {
          navigate(WALLET_SETUP_PATH)
        }
      } else {
        navigate(TRADE_PATH)
      }
    }
    run()
  }, [navigate, nodeInfo])

  return (
    <Layout>
      {nodeInfoResponse.isSuccess ? <Outlet /> : null}

      {nodeInfoResponse.isError ? (
        <div className="text-center">
          <div className="text-xl mb-4">
            The node is not running. Please try restarting the app.
          </div>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
            onClick={() => navigate(WALLET_SETUP_PATH)}
          >
            Return to Wallet Setup
          </button>
        </div>
      ) : null}
    </Layout>
  )
}
