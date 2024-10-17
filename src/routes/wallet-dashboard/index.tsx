import {
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Plus,
  Loader,
} from 'lucide-react'
import React, { ReactNode, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import {
  CREATE_NEW_CHANNEL_PATH,
  CREATEUTXOS_PATH,
  WALLET_HISTORY_PATH,
} from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { ChannelCard } from '../../components/ChannelCard'
import { formatBitcoinAmount } from '../../helpers/number'
import { nodeApi, NiaAsset } from '../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../slices/ui/ui.slice'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-10 p-4 bg-gray-800 text-white text-sm rounded shadow-lg -top-24 left-1/2 transform -translate-x-1/2 w-64">
          {content}
        </div>
      )}
    </div>
  )
}

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
  asset: NiaAsset
  onChainBalance: number
  offChainBalance: number
}

const DEFAULT_RGB_ICON =
  'https://raw.githubusercontent.com/RGB-WG/rgb.tech/refs/heads/master/static/logo/rgb-symbol-color.svg'

interface AssetIconProps {
  ticker: string
  className?: string
}

const AssetIcon: React.FC<AssetIconProps> = ({
  ticker,
  className = 'h-6 w-6 mr-2',
}) => {
  const [imgSrc, setImgSrc] = useState<string>('')

  useEffect(() => {
    const loadIcon = async () => {
      try {
        const iconUrl = `https://raw.githubusercontent.com/alexandrebouttier/coinmarketcap-icons-cryptos/refs/heads/main/icons/${ticker.toLowerCase()}.png`
        const response = await fetch(iconUrl)
        if (response.ok) {
          setImgSrc(iconUrl)
        } else {
          throw new Error('Icon not found')
        }
      } catch (error) {
        console.warn(`Failed to load icon for ${ticker}, using default.`)
        setImgSrc(DEFAULT_RGB_ICON)
      }
    }

    loadIcon()
  }, [ticker])

  return (
    <img
      alt={`${ticker} icon`}
      className={className}
      onError={() => setImgSrc(DEFAULT_RGB_ICON)}
      src={imgSrc}
    />
  )
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

  const formatAmount = (asset: NiaAsset, amount: number) => {
    const formattedAmount = amount / Math.pow(10, asset.precision)
    return formattedAmount.toLocaleString(undefined, {
      maximumFractionDigits: asset.precision,
    })
  }

  return (
    <div className="grid grid-cols-4 gap-2 even:bg-blue-dark rounded items-center">
      <div
        className="py-3 px-4 text-sm truncate cursor-pointer flex items-center"
        onClick={() => {
          copyToClipboard(asset.asset_id)
          toast.success(
            `${asset.ticker} asset ID: ${asset.asset_id} copied to clipboard`
          )
        }}
      >
        <AssetIcon ticker={asset.ticker} />
        <div>
          <div className="font-bold">{asset.ticker}</div>
          <div>{asset.name}</div>
        </div>
      </div>

      <div className="text-sm py-3 px-4">
        <div className="font-bold">{formatAmount(asset, offChainBalance)}</div>
      </div>

      <div className="text-sm py-3 px-4">
        <div className="font-bold">{formatAmount(asset, onChainBalance)}</div>
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
  const navigate = useNavigate()
  const [assets, assetsResponse] = nodeApi.endpoints.listAssets.useLazyQuery()
  const [btcBalance, btcBalanceResponse] =
    nodeApi.endpoints.btcBalance.useLazyQuery()
  const [listChannels, listChannelsResponse] =
    nodeApi.endpoints.listChannels.useLazyQuery()
  const [assetBalance] = nodeApi.endpoints.assetBalance.useLazyQuery()
  const [closeChannel] = nodeApi.endpoints.closeChannel.useLazyQuery()
  const [assetBalances, setAssetBalances] = useState<
    Record<string, { offChain: number; onChain: number }>
  >({})
  const [assetsMap, setAssetsMap] = useState<Record<string, NiaAsset>>({})
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshRgbTransfers] =
    nodeApi.endpoints.refreshRgbTransfers.useLazyQuery()

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        assets(),
        btcBalance(),
        listChannels(),
        refreshRgbTransfers(),
      ])
    } finally {
      setIsRefreshing(false)
    }
  }, [assets, btcBalance, listChannels, refreshRgbTransfers])

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
    const intervalId = setInterval(refreshData, 10000)
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
  const onChainColoredBalance = btcBalanceResponse.data?.colored.settled || 0
  const channels = listChannelsResponse?.data?.channels || []
  const offChainBalance = channels.reduce(
    (sum, channel) => sum + channel.local_balance_msat / 1000,
    0
  )
  const totalBalance = offChainBalance + onChainBalance + onChainColoredBalance
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
          <Card className="col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-grey-light">
                Total Balance
              </h2>
              <Zap className="h-4 w-4 text-grey-light" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {formatBitcoinAmount(totalBalance, bitcoinUnit)} {bitcoinUnit}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-grey-light">On-chain:</span>
                <span className="ml-2 text-white">
                  {formatBitcoinAmount(
                    onChainBalance + onChainColoredBalance,
                    bitcoinUnit
                  )}{' '}
                  {bitcoinUnit}
                </span>
              </div>
              <div>
                <span className="text-grey-light">Off-chain:</span>
                <span className="ml-2 text-white">
                  {formatBitcoinAmount(offChainBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-sm text-grey-light">
                  On-chain Details:
                </span>
                <Tooltip content="Create colored UTXOs to use for RGB assets">
                  <button
                    className="p-1 rounded-full bg-cyan text-blue-dark hover:bg-cyan-dark transition-colors"
                    onClick={() => navigate(CREATEUTXOS_PATH)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                <div>
                  <span className="text-grey-light">Normal:</span>
                  <span className="ml-2 text-white">
                    {formatBitcoinAmount(onChainBalance, bitcoinUnit)}{' '}
                    {bitcoinUnit}
                  </span>
                </div>
                <div>
                  <span className="text-grey-light">Colored:</span>
                  <span className="ml-2 text-white">
                    {formatBitcoinAmount(onChainColoredBalance, bitcoinUnit)}{' '}
                    {bitcoinUnit}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          <div className="grid grid-rows-2 gap-4">
            <Card>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-medium text-grey-light">
                  Total Inbound Liquidity
                </h2>
                <ArrowDownRight className="h-4 w-4 text-grey-light" />
              </div>
              <div className="text-xl font-bold text-white">
                {formatBitcoinAmount(totalInboundLiquidity, bitcoinUnit)}{' '}
                {bitcoinUnit}
              </div>
            </Card>
            <Card>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-medium text-grey-light">
                  Total Outbound Liquidity
                </h2>
                <ArrowUpRight className="h-4 w-4 text-grey-light" />
              </div>
              <div className="text-xl font-bold text-white">
                {formatBitcoinAmount(totalOutboundLiquidity, bitcoinUnit)}{' '}
                {bitcoinUnit}
              </div>
            </Card>
          </div>
        </div>

        <div className="bg-blue-dark rounded p-6">
          <div className="flex items-center mb-4">
            <div className="text-2xl flex-1 text-white">List of Assets</div>
            <button
              className="px-4 py-2 rounded border text-sm font-bold border-cyan text-white flex items-center"
              disabled={isRefreshing}
              onClick={refreshData}
            >
              {isRefreshing ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
