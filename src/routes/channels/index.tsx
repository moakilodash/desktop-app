import {
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  PlusCircle,
  AlertCircle,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CREATE_NEW_CHANNEL_PATH } from '../../app/router/paths'
import { ChannelCard } from '../../components/ChannelCard'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  className = '',
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400'
    if (trend === 'down') return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <div
      className={`bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/50 p-5 ${className}`}
    >
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium text-gray-400">{title}</h2>
        <div className="p-2 rounded-lg bg-gray-700/70">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {trend && trendValue && (
        <div className={`text-xs flex items-center mt-2 ${getTrendColor()}`}>
          {trend === 'up' && <ArrowUpRight className="h-3 w-3 mr-1" />}
          {trend === 'down' && <ArrowDownRight className="h-3 w-3 mr-1" />}
          {trendValue}
        </div>
      )}
    </div>
  )
}

interface Asset {
  precision: number
  ticker: string
}

interface Channel {
  channel_id: string
  peer_pubkey: string
  asset_id: string
  outbound_balance_msat: number
  inbound_balance_msat: number
}

export const Component: React.FC = () => {
  const [listChannels, listChannelsResponse] =
    nodeApi.endpoints.listChannels.useLazyQuery()
  const [listAssets, listAssetsResponse] =
    nodeApi.endpoints.listAssets.useLazyQuery()
  const [closeChannel] = nodeApi.endpoints.closeChannel.useLazyQuery()
  const navigate = useNavigate()
  const [assets, setAssets] = useState<Record<string, Asset>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refreshData = useCallback(() => {
    setIsLoading(true)
    Promise.all([listChannels(), listAssets()]).finally(() => {
      setIsLoading(false)
      setLastUpdated(new Date())
    })
  }, [listChannels, listAssets])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  useEffect(() => {
    if (listAssetsResponse.data) {
      const assetsMap = listAssetsResponse.data.nia.reduce(
        (acc: Record<string, Asset>, asset: any) => {
          acc[asset.asset_id] = {
            precision: asset.precision,
            ticker: asset.ticker,
          }
          return acc
        },
        {}
      )
      setAssets(assetsMap)
    }
  }, [listAssetsResponse.data])

  const channels: Channel[] = listChannelsResponse?.data?.channels ?? []
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

  const handleCloseChannel = async (channelId: string, peerPubkey: string) => {
    try {
      await closeChannel({
        channel_id: channelId,
        peer_pubkey: peerPubkey,
      })
      refreshData()
    } catch (error) {
      console.error('Error closing channel:', error)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return `${seconds} seconds ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-950 py-8 px-6 rounded-xl border border-gray-800/50 shadow-xl w-full text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Lightning Wallet Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            {lastUpdated
              ? `Last updated: ${formatTimeAgo(lastUpdated)}`
              : 'Loading data...'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-medium shadow-lg shadow-blue-700/20 flex items-center"
            onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Open Channel
          </button>
          <button
            className={`px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 transition text-gray-200 font-medium flex items-center ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
            onClick={refreshData}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <StatCard
          icon={<Zap className="h-4 w-4 text-yellow-400" />}
          title="Total Balance"
          trend="neutral"
          value={`${totalBalance.toLocaleString()} sats`}
        />
        <StatCard
          icon={<ArrowDownRight className="h-4 w-4 text-green-400" />}
          title="Inbound Liquidity"
          trend="up"
          trendValue="4.5% this week"
          value={`${totalInboundLiquidity.toLocaleString()} sats`}
        />
        <StatCard
          icon={<ArrowUpRight className="h-4 w-4 text-blue-400" />}
          title="Outbound Liquidity"
          trend="down"
          trendValue="2.3% this week"
          value={`${totalOutboundLiquidity.toLocaleString()} sats`}
        />
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg py-6 px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Channels</h2>
          <div className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
            {channels.length} {channels.length === 1 ? 'Channel' : 'Channels'}
          </div>
        </div>

        {channels.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => {
              const asset = assets[channel.asset_id]
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
          <div className="bg-gray-900/50 border border-gray-800/60 rounded-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Channels Open</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              You don't have any open channels yet. Create a channel to start
              using Lightning Network.
            </p>
            <button className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-medium shadow-lg shadow-blue-700/20 flex items-center mx-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Open Your First Channel
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-400 mt-6 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />
        <p>
          Channel liquidity changes as you send and receive payments. Keep your
          channels balanced for optimal performance and lower fees.
        </p>
      </div>
    </div>
  )
}
