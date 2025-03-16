import {
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

import { ChannelCard } from '../../components/ChannelCard'
import { useAppTranslation } from '../../hooks/useAppTranslation'
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

  const [assets, setAssets] = useState<Record<string, Asset>>({})

  const [isLoading, setIsLoading] = useState(false)

  const refreshData = useCallback(() => {
    setIsLoading(true)
    Promise.all([listChannels(), listAssets()]).finally(() => {
      setIsLoading(false)
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
    await closeChannel({
      channel_id: channelId,
      peer_pubkey: peerPubkey,
    })
    refreshData()
  }

  const { t } = useAppTranslation('channels')

  return (
    <div className="bg-gray-900 py-8 px-6 rounded w-full text-white">
      <div className="flex justify-between items-center mb-8">
        <div className="text-2xl font-semibold">{t('dashboard.title')}</div>
        <button
          className={`px-6 py-3 rounded border text-lg font-bold border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition flex items-center ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
          onClick={refreshData}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          />
          {isLoading
            ? t('dashboard.refresh.loading')
            : t('dashboard.refresh.button')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-gray-400">
              {t('metrics.totalBalance.title')}
            </h2>
            <Zap className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">
            {t('metrics.totalBalance.value', {
              amount: totalBalance.toLocaleString(),
            })}
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-gray-400">
              {t('metrics.inboundLiquidity.title')}
            </h2>
            <ArrowDownRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">
            {t('metrics.inboundLiquidity.value', {
              amount: totalInboundLiquidity.toLocaleString(),
            })}
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-gray-400">
              {t('metrics.outboundLiquidity.title')}
            </h2>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">
            {t('metrics.outboundLiquidity.value', {
              amount: totalOutboundLiquidity.toLocaleString(),
            })}
          </div>
        </Card>
      </div>

      <div className="bg-gray-800 rounded-lg py-8 px-6">
        {channels.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="text-lg text-gray-400 text-center">
            {t('channels.empty')}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-400 mt-4">
        <Info className="h-4 w-4" />
        <p>{t('channels.info')}</p>
      </div>
    </div>
  )
}
