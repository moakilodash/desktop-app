import {
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react'
import React, { useCallback, useEffect } from 'react'
// import { twJoin } from 'tailwind-merge'

import { ChannelCard } from '../../components/ChannelCard'
import { numberFormatter } from '../../helpers/number'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface CardProps {
  children: React.ReactNode
  className?: string
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-section-lighter rounded-lg shadow p-4 ${className}`}>
    {children}
  </div>
)

export const Component = () => {
  const [listChannels, listChannelsResponse] =
    nodeApi.endpoints.listChannels.useLazyQuery()

  const refreshChannels = useCallback(() => {
    listChannels()
  }, [listChannels])

  useEffect(() => {
    refreshChannels()
  }, [refreshChannels])

  const channels = listChannelsResponse?.data?.channels ?? []
  const totalBalance = channels.reduce(
    (sum, channel) => sum + channel.asset_local_amount,
    0
  )
  const totalInboundLiquidity = channels.reduce(
    (sum, channel) => sum + channel.inbound_balance_msat / 1000,
    0
  )
  const totalOutboundLiquidity = channels.reduce(
    (sum, channel) => sum + channel.outbound_balance_msat / 1000,
    0
  )

  return (
    <div className="bg-blue-dark py-8 px-6 rounded w-full">
      <div className="flex justify-between items-center mb-8">
        <div className="text-2xl font-semibold text-white">
          Lightning Wallet Dashboard
        </div>
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan text-white hover:bg-cyan hover:text-blue-dark transition flex items-center"
          onClick={refreshChannels}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-grey-light">
              Total Balance
            </h2>
            <Zap className="h-4 w-4 text-grey-light" />
          </div>
          <div className="text-2xl font-bold text-white">
            {numberFormatter.format(totalBalance)} sats
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
            {numberFormatter.format(totalInboundLiquidity)} sats
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
            {numberFormatter.format(totalOutboundLiquidity)} sats
          </div>
        </Card>
      </div>

      <div className="bg-section-lighter rounded-lg py-8 px-6">
        {channels.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard
                channel={channel}
                key={channel.channel_id}
                onClose={refreshChannels}
              />
            ))}
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
