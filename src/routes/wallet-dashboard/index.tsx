import {
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Plus,
  Loader,
  Wallet,
  Link as ChainIcon,
  Copy,
  Network,
  Blocks,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import {
  CREATE_NEW_CHANNEL_PATH,
  CREATEUTXOS_PATH,
  WALLET_HISTORY_PATH,
} from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { ChannelCard } from '../../components/ChannelCard'
import { BitcoinNetwork } from '../../constants'
import { DEFAULT_RGB_ICON } from '../../constants/networks'
import { formatBitcoinAmount } from '../../helpers/number'
import { nodeApi, NiaAsset } from '../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../slices/ui/ui.slice'

interface AssetRowProps {
  asset: NiaAsset
  onChainBalance: number
  offChainBalance: number
}

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

const OnChainDetailsOverlay = ({
  onChainBalance,
  onChainFutureBalance,
  onChainSpendableBalance,
  onChainColoredBalance,
  onChainColoredFutureBalance,
  onChainColoredSpendableBalance,
  bitcoinUnit,
  onCreateUtxos,
}: {
  onChainBalance: number
  onChainFutureBalance: number
  onChainSpendableBalance: number
  onChainColoredBalance: number
  onChainColoredFutureBalance: number
  onChainColoredSpendableBalance: number
  bitcoinUnit: string
  onCreateUtxos: () => void
}) => (
  <div
    className="absolute inset-0 bg-[#0B101B]/95 backdrop-blur-sm rounded-lg opacity-0 
                  group-hover:opacity-100 transition-all duration-300 ease-in-out
                  flex flex-col p-4 sm:p-6"
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-4 sm:mb-6">
      <h3 className="text-base font-medium text-white">On-chain Details</h3>
      <button
        className="p-1.5 sm:p-2 bg-blue-500/10 hover:bg-blue-500/20 
                   text-blue-500 rounded-lg transition-all duration-200"
        onClick={onCreateUtxos}
      >
        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </div>

    {/* Balance Details */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {/* Normal Balance */}
      <div className="bg-[#151C2E] rounded-xl p-3 sm:p-4 border border-slate-700/30">
        <h4 className="text-base sm:text-lg font-medium text-white mb-3">
          Normal Balance
        </h4>
        <div className="space-y-2 sm:space-y-3">
          <div className="bg-[#0B101B] rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-400 mb-0.5">
              Settled
            </div>
            <div className="text-sm sm:text-base font-medium text-white">
              {formatBitcoinAmount(onChainBalance, bitcoinUnit)} {bitcoinUnit}
            </div>
          </div>
          <div className="bg-[#0B101B] rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-400 mb-0.5">
              Future
            </div>
            <div className="text-sm sm:text-base font-medium text-white">
              {formatBitcoinAmount(onChainFutureBalance, bitcoinUnit)}{' '}
              {bitcoinUnit}
            </div>
          </div>
          <div className="bg-[#0B101B] rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-400 mb-0.5">
              Spendable
            </div>
            <div className="text-sm sm:text-base font-medium text-white">
              {formatBitcoinAmount(onChainSpendableBalance, bitcoinUnit)}{' '}
              {bitcoinUnit}
            </div>
          </div>
        </div>
      </div>

      {/* Colored Balance */}
      <div className="bg-[#151C2E] rounded-xl p-3 sm:p-4 border border-slate-700/30">
        <h4 className="text-base sm:text-lg font-medium text-white mb-3">
          Colored Balance
        </h4>
        <div className="space-y-2 sm:space-y-3">
          <div className="bg-[#0B101B] rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-400 mb-0.5">
              Settled
            </div>
            <div className="text-sm sm:text-base font-medium text-white">
              {formatBitcoinAmount(onChainColoredBalance, bitcoinUnit)}{' '}
              {bitcoinUnit}
            </div>
          </div>
          <div className="bg-[#0B101B] rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-400 mb-0.5">
              Future
            </div>
            <div className="text-sm sm:text-base font-medium text-white">
              {formatBitcoinAmount(onChainColoredFutureBalance, bitcoinUnit)}{' '}
              {bitcoinUnit}
            </div>
          </div>
          <div className="bg-[#0B101B] rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-400 mb-0.5">
              Spendable
            </div>
            <div className="text-sm sm:text-base font-medium text-white">
              {formatBitcoinAmount(onChainColoredSpendableBalance, bitcoinUnit)}{' '}
              {bitcoinUnit}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

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
  const [refreshTransfers] =
    nodeApi.endpoints.refreshRgbTransfers.useLazyQuery()
  const [assetBalances, setAssetBalances] = useState<
    Record<string, { offChain: number; onChain: number }>
  >({})
  const [assetsMap, setAssetsMap] = useState<Record<string, NiaAsset>>({})
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // const [refreshRgbTransfers] =
  //   nodeApi.endpoints.refreshRgbTransfers.useLazyQuery()
  const [sync] = nodeApi.endpoints.sync.useLazyQuery()
  const [getNodeInfo, nodeInfoResponse] =
    nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [getNetworkInfo, networkInfoResponse] =
    nodeApi.endpoints.networkInfo.useLazyQuery()

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        assets(),
        listChannels(),
        btcBalance({ skip_sync: false }),
        refreshTransfers({ skip_sync: false }),
        sync(),
        getNodeInfo(),
        getNetworkInfo(),
      ])
    } finally {
      setIsRefreshing(false)
    }
  }, [
    assets,
    btcBalance,
    listChannels,
    refreshTransfers,
    sync,
    getNodeInfo,
    getNetworkInfo,
  ])

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
          onChain: balance.data?.future || 0,
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

  const onChainBalance = btcBalanceResponse.data?.vanilla.spendable || 0
  const onChainFutureBalance = btcBalanceResponse.data?.vanilla.future || 0
  const onChainSpendableBalance =
    btcBalanceResponse.data?.vanilla.spendable || 0

  const onChainColoredBalance = btcBalanceResponse.data?.colored.spendable || 0
  const onChainColoredFutureBalance =
    btcBalanceResponse.data?.colored.future || 0
  const onChainColoredSpendableBalance =
    btcBalanceResponse.data?.colored.spendable || 0

  const channels = listChannelsResponse?.data?.channels || []
  const offChainBalance = channels.reduce(
    (sum, channel) => sum + channel.local_balance_msat / 1000,
    0
  )
  const totalBalance =
    offChainBalance + onChainSpendableBalance + onChainColoredSpendableBalance
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

  const handleCopyPubkey = () => {
    if (nodeInfoResponse.data?.pubkey) {
      navigator.clipboard.writeText(nodeInfoResponse.data.pubkey)
      toast.success('Node public key copied to clipboard')
    }
  }

  return (
    <div className="w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
      {(networkInfoResponse.data?.network as unknown as BitcoinNetwork) !==
        'mainnet' && (
        <div className="mb-8 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Info className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h4 className="text-amber-500 font-medium mb-1">
              Test Network Warning
            </h4>
            <p className="text-amber-400/80 text-sm">
              You are currently on{' '}
              {networkInfoResponse.data?.network || 'testnet'}. Any tokens on
              this network have no real value and are for testing purposes only.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="w-10 h-10 text-blue-500" />
          <h3 className="text-2xl font-bold text-white">Wallet Dashboard</h3>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-xl font-medium transition-colors"
            onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
          >
            <Zap className="w-5 h-5" />
            Open Channel
          </button>

          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-xl font-medium transition-colors"
            onClick={() => navigate(CREATEUTXOS_PATH)}
          >
            <Plus className="w-5 h-5" />
            Create UTXOs
          </button>

          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-xl font-medium transition-colors"
            disabled={isRefreshing}
            onClick={refreshData}
          >
            {isRefreshing ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ChainIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Node Public Key
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-slate-300 font-medium truncate">
                    {nodeInfoResponse.data?.pubkey || '...'}
                  </span>
                  <button
                    className="shrink-0 p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                    onClick={handleCopyPubkey}
                    title="Copy public key"
                  >
                    <Copy className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Network className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Network
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-300 font-medium">
                    {networkInfoResponse.data?.network || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Blocks className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Block Height
                </span>
                <div className="text-sm text-slate-300 font-medium mt-1">
                  #{networkInfoResponse.data?.height || '...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-slate-400">
              Total Balance
            </h2>
            <div className="flex gap-2">
              <button
                className="group px-4 py-2 bg-cyan/10 hover:bg-cyan/20
                         text-cyan hover:text-cyan-light rounded-lg 
                         transition-all duration-200 flex items-center gap-2 text-sm
                         border border-cyan/20 hover:border-cyan/30"
                onClick={() =>
                  dispatch(
                    uiSliceActions.setModal({
                      assetId: assetsResponse.data?.nia[0]?.asset_id,
                      type: 'deposit',
                    })
                  )
                }
              >
                <ArrowDownRight className="w-4 h-4" />
                Deposit
              </button>
              <button
                className="group px-4 py-2 bg-red/10 hover:bg-red/20
                         text-red hover:text-red-light rounded-lg 
                         transition-all duration-200 flex items-center gap-2 text-sm
                         border border-red/20 hover:border-red/30"
                onClick={() =>
                  dispatch(
                    uiSliceActions.setModal({
                      assetId: assetsResponse.data?.nia[0]?.asset_id,
                      type: 'withdraw',
                    })
                  )
                }
              >
                <ArrowUpRight className="w-4 h-4" />
                Withdraw
              </button>
            </div>
          </div>

          <div className="text-2xl font-bold text-white mb-4">
            {formatBitcoinAmount(totalBalance, bitcoinUnit)} {bitcoinUnit}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className="group relative bg-[#0B101B]/80 rounded-lg p-3 sm:p-4 
                            hover:bg-[#0B101B] transition-all duration-200"
            >
              <div>
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <ChainIcon className="w-4 h-4 text-blue-500" />
                  On-chain
                </span>
                <div className="text-lg sm:text-2xl font-medium text-white">
                  {formatBitcoinAmount(
                    onChainBalance + onChainColoredBalance,
                    bitcoinUnit
                  )}{' '}
                  {bitcoinUnit}
                </div>
              </div>

              <OnChainDetailsOverlay
                bitcoinUnit={bitcoinUnit}
                onChainBalance={onChainBalance}
                onChainColoredBalance={onChainColoredBalance}
                onChainColoredFutureBalance={onChainColoredFutureBalance}
                onChainColoredSpendableBalance={onChainColoredSpendableBalance}
                onChainFutureBalance={onChainFutureBalance}
                onChainSpendableBalance={onChainSpendableBalance}
                onCreateUtxos={() => navigate(CREATEUTXOS_PATH)}
              />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <span className="text-sm text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                Off-chain
              </span>
              <div className="text-lg text-white font-medium">
                {formatBitcoinAmount(offChainBalance, bitcoinUnit)}{' '}
                {bitcoinUnit}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-slate-400">
                Inbound Liquidity
              </h2>
              <ArrowDownRight className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-white">
              {formatBitcoinAmount(totalInboundLiquidity, bitcoinUnit)}{' '}
              {bitcoinUnit}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-slate-400">
                Outbound Liquidity
              </h2>
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-white">
              {formatBitcoinAmount(totalOutboundLiquidity, bitcoinUnit)}{' '}
              {bitcoinUnit}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Assets</h2>
          <button
            className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300
                     hover:border-blue-500/50 hover:text-blue-500 transition-all
                     flex items-center gap-2"
            disabled={isRefreshing}
            onClick={refreshData}
          >
            {isRefreshing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="rounded-lg overflow-hidden">
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

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-6">
          Lightning Channels
        </h2>

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
          <div className="text-center py-8">
            <div className="text-slate-400 mb-4">No channels found</div>
            <button
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                       font-medium transition-colors flex items-center gap-2 mx-auto"
              onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
            >
              <Plus className="w-5 h-5" />
              Open Your First Channel
            </button>
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-2 text-sm text-slate-400 mt-6 p-4 
                    bg-slate-800/30 rounded-xl border border-slate-700"
      >
        <Info className="h-4 w-4 text-blue-500" />
        <p>
          Channel liquidity changes as you send and receive payments. Keep your
          channels balanced for optimal performance.
        </p>
      </div>
    </div>
  )
}
