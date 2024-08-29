import {
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CREATE_NEW_CHANNEL_PATH,
  WALLET_HISTORY_PATH,
} from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { ChannelCard } from '../../components/ChannelCard'
import { numberFormatter } from '../../helpers/number'
import { nodeApi, NiaAsset } from '../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../slices/ui/ui.slice'
import './index.css'

interface CardProps {
  children: React.ReactNode
  className?: string
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-section-lighter rounded-lg shadow p-4 ${className}`}>
    {children}
  </div>
)

interface AssetRowProps {
  asset: {
    ticker: string
    name: string
    asset_id: string
  }
  onChainBalance: number
  offChainBalance: number
}

const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  onChainBalance,
  offChainBalance,
}) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Failed to copy: ', err)
    })
  }

  return (
    <div className="grid grid-cols-4 gap-2 even:bg-blue-dark rounded items-center">
      <div
        className="py-3 px-4 text-sm truncate cursor-pointer"
        onClick={() => copyToClipboard(asset.ticker)}
      >
        <div className="font-bold">{asset.ticker}</div>
        <div>{asset.name}</div>
      </div>

      <div className="text-sm py-3 px-4">
        <div className="font-bold">
          {numberFormatter.format(offChainBalance)}
        </div>
      </div>

      <div className="text-sm py-3 px-4">
        <div className="font-bold">
          {numberFormatter.format(onChainBalance)}
        </div>
      </div>

      <div className="text-sm py-3 pl-4 pr-6 flex justify-between">
        <button
          className="text-cyan underline font-bold"
          onClick={() =>
            dispatch(
              uiSliceActions.setModal({
                assetId: asset.asset_id,
                type: 'deposit',
              })
            )
          }
        >
          Deposit
        </button>

        <button
          className="text-red underline font-bold"
          onClick={() =>
            dispatch(
              uiSliceActions.setModal({
                assetId: asset.asset_id,
                type: 'withdraw',
              })
            )
          }
        >
          Withdraw
        </button>

        <button
          className="text-purple underline font-bold"
          onClick={() => navigate(WALLET_HISTORY_PATH)}
        >
          History
        </button>
      </div>
    </div>
  )
}

export const Component = () => {
  const dispatch = useAppDispatch()
  const [assets, assetsResponse] = nodeApi.endpoints.listAssets.useLazyQuery()
  const [btcBalance, btcBalanceResponse] =
    nodeApi.endpoints.btcBalance.useLazyQuery()
  const [listChannels, listChannelsResponse] =
    nodeApi.endpoints.listChannels.useLazyQuery()
  const [assetBalance] = nodeApi.endpoints.assetBalance.useLazyQuery()
  const [closeChannel] = nodeApi.endpoints.closeChannel.useLazyQuery()
  const navigate = useNavigate()
  const [assetBalances, setAssetBalances] = useState<
    Record<string, { offChain: number; onChain: number }>
  >({})
  const [assetsMap, setAssetsMap] = useState<Record<string, NiaAsset>>({})

  const refreshData = useCallback(() => {
    assets()
    btcBalance()
    listChannels()
  }, [assets, btcBalance, listChannels])

  useEffect(() => {
    if (assetsResponse.data?.nia) {
      const newAssetsMap: Record<string, NiaAsset> = {}
      assetsResponse.data.nia.forEach((asset) => {
        newAssetsMap[asset.asset_id] = asset
      })
      setAssetsMap(newAssetsMap)
    }
  }, [assetsResponse.data])

  useEffect(() => {
    refreshData()
    const intervalId = setInterval(refreshData, 3000)
    return () => clearInterval(intervalId)
  }, [refreshData])

  useEffect(() => {
    const fetchAssetBalances = async () => {
      const newBalances: Record<string, { offChain: number; onChain: number }> =
        {}
      for (const asset of assetsResponse.data?.nia || []) {
        const balance = await assetBalance({ asset_id: asset.asset_id })
        newBalances[asset.asset_id] = {
          offChain: balance.data?.offchain_outbound || 0,
          onChain: balance.data?.spendable || 0,
        }
      }
      setAssetBalances(newBalances)
    }

    if (assetsResponse.data) {
      fetchAssetBalances()
    }
  }, [
    assetsResponse.data,
    btcBalanceResponse.data,
    listChannelsResponse.data,
    assetBalance,
  ])

  const onChainBalance = btcBalanceResponse.data?.vanilla.settled || 0
  const channels = listChannelsResponse?.data?.channels || []
  const totalBalance =
    channels.reduce((sum, channel) => sum + channel.asset_local_amount, 0) +
    onChainBalance
  const totalInboundLiquidity = channels.reduce(
    (sum, channel) => sum + channel.inbound_balance_msat / 1000,
    0
  )
  const totalOutboundLiquidity = channels.reduce(
    (sum, channel) => sum + channel.outbound_balance_msat / 1000,
    0
  )

  const handleCloseChannel = async (channelId: string, peerPubkey: string) => {
    await closeChannel({
      channel_id: channelId,
      peer_pubkey: peerPubkey,
    })
    refreshData()
  }

  // if (isLoading) {
  //   return (
  //     <div className="fixed inset-0 bg-blue-dark bg-opacity-50 flex items-center justify-center z-50">
  //       <div className="bg-section-lighter p-4 rounded-lg">
  //         <RefreshCw className="animate-spin h-8 w-8 text-cyan" />
  //         <p className="mt-2 text-white">Loading...</p>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="w-full bg-blue-dark py-8 px-6 rounded space-y-4">
      <div className="bg-section-lighter rounded p-8">
        <div className="flex items-center mb-8">
          <div className="text-2xl flex-1 text-white">Wallet Dashboard</div>

          <div className="flex items-center space-x-2">
            <button
              className="px-6 py-3 rounded border text-lg font-bold border-cyan text-white"
              onClick={() =>
                dispatch(
                  uiSliceActions.setModal({
                    assetId: assetsResponse.data?.nia[0]?.asset_id,
                    type: 'deposit',
                  })
                )
              }
            >
              Deposit
            </button>

            <button
              className="px-6 py-3 rounded border text-lg font-bold border-red text-white"
              onClick={() =>
                dispatch(
                  uiSliceActions.setModal({
                    assetId: assetsResponse.data?.nia[0]?.asset_id,
                    type: 'withdraw',
                  })
                )
              }
            >
              Withdraw
            </button>

            <button
              className="px-6 py-3 rounded border text-lg font-bold border-cyan text-white"
              onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
            >
              Open New Channel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-grey-light">
                Total Balance
              </h2>
              <Zap className="h-4 w-4 text-grey-light" />
            </div>
            <div className="text-2xl font-bold text-white">
              {numberFormatter.format(totalBalance, 0)} sats
            </div>
          </Card>
          <Card>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-grey-light">
                Total Inbound Liquidity
              </h2>
              <ArrowDownRight className="h-4 w-4 text-grey-light" />
            </div>
            <div className="text-2xl font-bold text-white">
              {numberFormatter.format(totalInboundLiquidity, 0)} sats
            </div>
          </Card>
          <Card>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-grey-light">
                Total Outbound Liquidity
              </h2>
              <ArrowUpRight className="h-4 w-4 text-grey-light" />
            </div>
            <div className="text-2xl font-bold text-white">
              {numberFormatter.format(totalOutboundLiquidity, 0)} sats
            </div>
          </Card>
        </div>

        <div className="bg-blue-dark rounded p-6">
          <div className="flex items-center mb-4">
            <div className="text-2xl flex-1 text-white">List of Assets</div>
            <button
              className="px-4 py-2 rounded border text-sm font-bold border-cyan text-white flex items-center"
              onClick={refreshData}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>

          <div>
            <div className="grid grid-cols-4 text-grey-light">
              <div className="py-3 px-4">Asset</div>
              <div className="py-3 px-4">Off Chain</div>
              <div className="py-3 px-4">On Chain</div>
              <div className="py-3 px-4">Actions</div>
            </div>

            {assetsResponse.data?.nia.map((asset) => (
              <AssetRow
                asset={asset}
                key={asset.asset_id}
                offChainBalance={assetBalances[asset.asset_id]?.offChain || 0}
                onChainBalance={assetBalances[asset.asset_id]?.onChain || 0}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-section-lighter rounded p-8">
        <div className="text-2xl mb-4 text-white">Lightning Channels</div>
        {channels.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => {
              const asset = assetsMap[channel.asset_id]
              return (
                <ChannelCard
                  asset={asset}
                  channel={channel}
                  key={channel.channel_id}
                  onClose={handleCloseChannel}
                />
              )
            })}
          </div>
        ) : (
          <div className="text-lg text-grey-light text-center">
            You don't have any open channels yet.
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 text-sm text-grey-light mt-4">
        <Info className="h-4 w-4" />
        <p>
          Channel liquidity changes as you send and receive payments. Keep your
          channels balanced for optimal performance.
        </p>
      </div>
    </div>
  )
}
