import {
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

import { ChannelCard } from '../../components/ChannelCard'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface CardProps {
  children: React.ReactNode
  className?: string
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-gray-800 rounded-lg shadow p-4 ${className}`}>
    {children}
  </div>
)

export const Component = () => {
  const [listChannels, listChannelsResponse] =
    nodeApi.endpoints.listChannels.useLazyQuery()
  const [listAssets, listAssetsResponse] =
    nodeApi.endpoints.listAssets.useLazyQuery()
  const [closeChannel] = nodeApi.endpoints.closeChannel.useLazyQuery()

  const [assets, setAssets] = useState({})

  const refreshData = useCallback(() => {
    listChannels()
    listAssets()
  }, [listChannels, listAssets])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  useEffect(() => {
    if (listAssetsResponse.data) {
      const assetsMap = listAssetsResponse.data.nia.reduce((acc, asset) => {
        acc[asset.asset_id] = {
          precision: asset.precision,
          ticker: asset.ticker,
        }
        return acc
      }, {})
      setAssets(assetsMap)
    }
  }, [listAssetsResponse.data])

  const channels = listChannelsResponse?.data?.channels ?? []
  const totalBalance = channels.reduce(
    (sum, channel) => sum + Math.floor(channel.outbound_balance_msat / 1000),
    0
  )
  const totalInboundLiquidity = channels.reduce(
    (sum, channel) => sum + Math.floor(channel.inbound_balance_msat / 1000),
    0
  )
  const totalOutboundLiquidity = channels.reduce(
    (sum, channel) => sum + Math.floor(channel.outbound_balance_msat / 1000),
    0
  )

  const handleCloseChannel = async (channelId, peerPubkey) => {
    await closeChannel({
      channel_id: channelId,
      peer_pubkey: peerPubkey,
    })
    refreshData()
  }

  return (
    <div className="bg-gray-900 py-8 px-6 rounded w-full text-white">
      <div className="flex justify-between items-center mb-8">
        <div className="text-2xl font-semibold">Lightning Wallet Dashboard</div>
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition flex items-center"
          onClick={refreshData}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-gray-400">Total Balance</h2>
            <Zap className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">
            {totalBalance.toLocaleString()} sats
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-gray-400">
              Total Inbound Liquidity
            </h2>
            <ArrowDownRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">
            {totalInboundLiquidity.toLocaleString()} sats
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-gray-400">
              Total Outbound Liquidity
            </h2>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">
            {totalOutboundLiquidity.toLocaleString()} sats
          </div>
        </Card>
      </div>

      <div className="bg-gray-800 rounded-lg py-8 px-6">
        {channels.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard
                assets={assets}
                channel={channel}
                key={channel.channel_id}
                onClose={handleCloseChannel}
              />
            ))}
          </div>
        ) : (
          <div className="text-lg text-gray-400 text-center">
            You don't have any open channels yet.
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-400 mt-4">
        <Info className="h-4 w-4" />
        <p>
          Channel liquidity changes as you send and receive payments. Keep your
          channels balanced for optimal performance.
        </p>
      </div>
    </div>
  )
}
