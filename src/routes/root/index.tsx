import { invoke } from '@tauri-apps/api'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import {
  TRADE_PATH,
  WALLET_SETUP_PATH,
  WALLET_UNLOCK_PATH,
} from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { Layout } from '../../components/Layout'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { readSettings } from '../../slices/nodeSettings/nodeSettings.slice'

export const RootRoute = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [nodeInfo, nodeInfoResponse] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  useEffect(() => {
    const onPageLoad = () => {
      invoke('close_splashscreen')
    }

    if (document.readyState === 'complete') {
      onPageLoad()
    } else {
      window.addEventListener('load', onPageLoad)
      return () => window.removeEventListener('load', onPageLoad)
    }
  }, [])

  useEffect(() => {
    async function run() {
      const nodeInfoResponse = await nodeInfo()
      dispatch(readSettings())
      console.log(nodeInfoResponse)

      if (nodeInfoResponse.isError) {
        const isWalletInit = await invoke('is_wallet_init')
        console.log(isWalletInit)
        if (!isWalletInit) {
          navigate(WALLET_SETUP_PATH)
        } else {
          navigate(WALLET_UNLOCK_PATH)
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
        <div className="text-center text-xl">
          The node is not running. Please try restarting the app.
        </div>
      ) : null}
    </Layout>
  )
}
