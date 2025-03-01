import {
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Plus,
  Loader as LoaderIcon,
  Wallet,
  Link as ChainIcon,
  Network,
  Blocks,
  Database,
  Users,
  Download,
  Upload,
  History,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import {
  CREATE_NEW_CHANNEL_PATH,
  WALLET_HISTORY_PATH,
} from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import defaultRgbIcon from '../../assets/rgb-symbol-color.svg'
import { ChannelCard } from '../../components/ChannelCard'
import { IssueAssetModal } from '../../components/IssueAssetModal'
import { PeerManagementModal } from '../../components/PeerManagementModal'
import {
  Button,
  Card,
  HoverCard,
  LoadingPlaceholder,
  InfoCard,
  InfoCardGrid,
  NetworkWarningAlert,
  OverlayTooltip,
} from '../../components/ui'
import { UTXOManagementModal } from '../../components/UTXOManagementModal'
import { BitcoinNetwork } from '../../constants'
import { formatBitcoinAmount } from '../../helpers/number'
import { useAssetIcon } from '../../helpers/utils'
import { nodeApi, NiaAsset } from '../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../slices/ui/ui.slice'

interface AssetRowProps {
  asset: NiaAsset
  onChainBalance: number
  offChainBalance: number
  isLoading?: boolean
}

interface AssetIconProps {
  ticker: string
  className?: string
}

const AssetIcon: React.FC<AssetIconProps> = ({
  ticker,
  className = 'h-6 w-6 mr-2',
}) => {
  const [imgSrc, setImgSrc] = useAssetIcon(ticker, defaultRgbIcon)

  return (
    <img
      alt={`${ticker} icon`}
      className={className}
      onError={() => setImgSrc(defaultRgbIcon)}
      src={imgSrc}
    />
  )
}

const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  onChainBalance,
  offChainBalance,
  isLoading,
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
        {isLoading ? (
          <LoadingPlaceholder />
        ) : (
          <div className="font-bold">
            {formatAmount(asset, offChainBalance)}
          </div>
        )}
      </div>

      <div className="text-sm py-3 px-4">
        {isLoading ? (
          <LoadingPlaceholder />
        ) : (
          <div className="font-bold">{formatAmount(asset, onChainBalance)}</div>
        )}
      </div>

      <div className="text-sm py-3 pl-4 pr-6 flex justify-center">
        <div className="flex items-center gap-3 relative">
          <div className="relative group">
            <button
              className="p-2 rounded-lg border border-cyan/30 hover:border-cyan/60 hover:bg-cyan/10 transition-all duration-200"
              onClick={() =>
                dispatch(
                  uiSliceActions.setModal({
                    assetId: asset.asset_id,
                    type: 'deposit',
                  })
                )
              }
            >
              <Download className="w-4 h-4 text-cyan" />
            </button>
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              Deposit
            </div>
          </div>

          <div className="relative group">
            <button
              className="p-2 rounded-lg border border-red/30 hover:border-red/60 hover:bg-red/10 transition-all duration-200"
              onClick={() =>
                dispatch(
                  uiSliceActions.setModal({
                    assetId: asset.asset_id,
                    type: 'withdraw',
                  })
                )
              }
            >
              <Upload className="w-4 h-4 text-red" />
            </button>
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              Withdraw
            </div>
          </div>

          <div className="relative group">
            <button
              className="p-2 rounded-lg border border-purple/30 hover:border-purple/60 hover:bg-purple/10 transition-all duration-200"
              onClick={() => navigate(WALLET_HISTORY_PATH)}
            >
              <History className="w-4 h-4 text-purple" />
            </button>
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              History
            </div>
          </div>
        </div>
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
}: {
  onChainBalance: number
  onChainFutureBalance: number
  onChainSpendableBalance: number
  onChainColoredBalance: number
  onChainColoredFutureBalance: number
  onChainColoredSpendableBalance: number
  bitcoinUnit: string
}) => {
  return (
    <OverlayTooltip
      content={
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Normal Balance */}
          <div className="bg-[#151C2E] rounded-lg p-2 border border-slate-700/30">
            <h4 className="text-xs font-medium text-white mb-1.5 flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></div>
              Normal Balance
            </h4>
            <div className="space-y-1">
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Settled</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(onChainBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Future</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(onChainFutureBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Spendable</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(onChainSpendableBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </div>
              </div>
            </div>
          </div>

          {/* Colored Balance */}
          <div className="bg-[#151C2E] rounded-lg p-2 border border-slate-700/30">
            <h4 className="text-xs font-medium text-white mb-1.5 flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></div>
              Colored Balance
            </h4>
            <div className="space-y-1">
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Settled</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(onChainColoredBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Future</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(
                    onChainColoredFutureBalance,
                    bitcoinUnit
                  )}{' '}
                  {bitcoinUnit}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Spendable</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(
                    onChainColoredSpendableBalance,
                    bitcoinUnit
                  )}{' '}
                  {bitcoinUnit}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
      title="On-chain Details"
    >
      <div>
        <span className="text-sm text-gray-400 flex items-center gap-2">
          <ChainIcon className="w-4 h-4 text-blue-500" />
          On-chain
        </span>
        <div className="text-lg font-medium text-white">
          {formatBitcoinAmount(
            onChainBalance + onChainColoredBalance,
            bitcoinUnit
          )}{' '}
          {bitcoinUnit}
        </div>
      </div>
    </OverlayTooltip>
  )
}

const LiquidityCard = ({
  title,
  amount,
  bitcoinUnit,
  icon,
  tooltipDescription,
  isLoading,
  totalCapacity,
  type,
}: {
  title: string
  amount: number
  bitcoinUnit: string
  icon: React.ReactNode
  tooltipDescription: string
  isLoading?: boolean
  totalCapacity?: number
  type: 'inbound' | 'outbound'
}) => {
  // Calculate percentage of liquidity relative to total capacity
  const percentage =
    totalCapacity && totalCapacity > 0
      ? Math.min(100, Math.round((amount / totalCapacity) * 100))
      : 0

  // Determine color based on percentage and type - using more subtle colors
  const getStatusColor = () => {
    if (percentage < 20) {
      return 'bg-red-500/60'
    } else if (percentage < 40) {
      return 'bg-amber-500/60'
    } else {
      return type === 'inbound' ? 'bg-blue-500/60' : 'bg-amber-500/60'
    }
  }

  const statusColor = getStatusColor()
  const iconColor = type === 'inbound' ? 'text-blue-400' : 'text-amber-400'

  return (
    <OverlayTooltip content={tooltipDescription} title={title}>
      <HoverCard className="border border-slate-700/30 hover:border-slate-700/50 transition-all duration-200 p-2.5">
        <div className="flex justify-between items-center mb-1.5">
          <h2 className="text-xs font-medium text-slate-300">{title}</h2>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="text-base font-bold text-white mb-1.5">
          {isLoading ? (
            <LoadingPlaceholder width="w-20" />
          ) : (
            `${formatBitcoinAmount(amount, bitcoinUnit)} ${bitcoinUnit}`
          )}
        </div>

        {!isLoading && totalCapacity && totalCapacity > 0 && (
          <div className="mt-1">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-slate-400">
                {percentage}% of capacity
              </span>
              {percentage < 20 && (
                <span className="text-xs text-red-300">Low</span>
              )}
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden shadow-inner">
              <div
                className={`${statusColor} h-full rounded-full transition-all duration-300`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </HoverCard>
    </OverlayTooltip>
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
  const [refreshTransfers] =
    nodeApi.endpoints.refreshRgbTransfers.useLazyQuery()
  const [assetBalances, setAssetBalances] = useState<
    Record<string, { offChain: number; onChain: number }>
  >({})
  const [assetsMap, setAssetsMap] = useState<Record<string, NiaAsset>>({})
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sync] = nodeApi.endpoints.sync.useLazyQuery()
  const [getNodeInfo, nodeInfoResponse] =
    nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [getNetworkInfo, networkInfoResponse] =
    nodeApi.endpoints.networkInfo.useLazyQuery()
  const [showUTXOModal, setShowUTXOModal] = useState(false)
  const [showPeerModal, setShowPeerModal] = useState(false)
  const [showIssueAssetModal, setShowIssueAssetModal] = useState(false)

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
    (sum, channel) => sum + channel.local_balance_sat,
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

  // Calculate total channel capacity for liquidity percentage
  const totalChannelCapacity = channels.reduce(
    (sum, channel) => sum + channel.capacity_sat,
    0
  )

  const handleCloseChannel = async (channelId: string, peerPubkey: string) => {
    await closeChannel({
      channel_id: channelId,
      peer_pubkey: peerPubkey,
    })
    refreshData()
  }

  const isLoading =
    btcBalanceResponse.isLoading || listChannelsResponse.isLoading

  return (
    <div className="w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
      {(networkInfoResponse.data?.network as unknown as BitcoinNetwork) !==
        'Mainnet' && (
        <div className="mb-6">
          <NetworkWarningAlert
            faucetUrl={
              (networkInfoResponse.data
                ?.network as unknown as BitcoinNetwork) === 'Signet'
                ? 'https://faucet.mutinynet.com/'
                : undefined
            }
            network={networkInfoResponse.data?.network || 'Testnet'}
          />
        </div>
      )}

      {showIssueAssetModal && (
        <IssueAssetModal
          onClose={() => setShowIssueAssetModal(false)}
          onSuccess={refreshData}
        />
      )}

      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-8 h-8 text-blue-500" />
          <h3 className="text-xl font-bold text-white">Wallet Dashboard</h3>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <Button
            icon={<Zap className="w-4 h-4" />}
            onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
            size="md"
          >
            Open Channel
          </Button>

          <Button
            icon={<Database className="w-4 h-4" />}
            onClick={() => setShowUTXOModal(true)}
            size="md"
          >
            Manage UTXOs
          </Button>

          <Button
            icon={<Users className="w-4 h-4" />}
            onClick={() => setShowPeerModal(true)}
            size="md"
          >
            Peers
          </Button>

          <Button
            disabled={isRefreshing}
            icon={
              isRefreshing ? (
                <LoaderIcon className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )
            }
            onClick={refreshData}
            size="sm"
            variant="outline"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <InfoCardGrid className="grid-cols-3 gap-3">
          <InfoCard
            copySuccessMessage="Node public key copied to clipboard"
            copyText={nodeInfoResponse.data?.pubkey}
            copyable
            icon={<ChainIcon className="w-4 h-4 text-blue-500" />}
            label="Node Public Key"
            value={nodeInfoResponse.data?.pubkey || '...'}
          />

          <InfoCard
            icon={<Network className="w-4 h-4 text-blue-500" />}
            label="Network"
            value={
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{networkInfoResponse.data?.network || 'Unknown'}</span>
              </div>
            }
          />

          <InfoCard
            icon={<Blocks className="w-4 h-4 text-blue-500" />}
            label="Block Height"
            value={`#${networkInfoResponse.data?.height || '...'}`}
          />
        </InfoCardGrid>

        {showUTXOModal && (
          <UTXOManagementModal
            bitcoinUnit={bitcoinUnit}
            onClose={() => setShowUTXOModal(false)}
          />
        )}

        {showPeerModal && (
          <PeerManagementModal onClose={() => setShowPeerModal(false)} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-sm font-medium text-slate-400">
                Total Balance
              </h2>
              <div className="text-lg font-bold text-white">
                {isLoading ? (
                  <LoadingPlaceholder width="w-32" />
                ) : (
                  `${formatBitcoinAmount(totalBalance, bitcoinUnit)} ${bitcoinUnit}`
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                icon={<ArrowDownRight className="w-3.5 h-3.5" />}
                onClick={() =>
                  dispatch(
                    uiSliceActions.setModal({
                      assetId: assetsResponse.data?.nia[0]?.asset_id,
                      type: 'deposit',
                    })
                  )
                }
                size="sm"
                variant="success"
              >
                Deposit
              </Button>
              <Button
                icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                onClick={() =>
                  dispatch(
                    uiSliceActions.setModal({
                      assetId: assetsResponse.data?.nia[0]?.asset_id,
                      type: 'withdraw',
                    })
                  )
                }
                size="sm"
                variant="danger"
              >
                Withdraw
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-[#0B101B]/80 rounded-lg p-2.5 hover:bg-[#0B101B] transition-all duration-200">
              <OnChainDetailsOverlay
                bitcoinUnit={bitcoinUnit}
                onChainBalance={onChainBalance}
                onChainColoredBalance={onChainColoredBalance}
                onChainColoredFutureBalance={onChainColoredFutureBalance}
                onChainColoredSpendableBalance={onChainColoredSpendableBalance}
                onChainFutureBalance={onChainFutureBalance}
                onChainSpendableBalance={onChainSpendableBalance}
              />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-2.5">
              <span className="text-sm text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                Off-chain
              </span>
              <div className="text-base text-white font-medium">
                {isLoading ? (
                  <LoadingPlaceholder />
                ) : (
                  `${formatBitcoinAmount(offChainBalance, bitcoinUnit)} ${bitcoinUnit}`
                )}
              </div>

              <div className="mt-1.5 flex items-center text-xs text-slate-400">
                <div className="flex items-center mr-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1"></div>
                  <span>{channels.length} Channels</span>
                </div>
                {channels.length > 0 && (
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></div>
                    <span>{channels.filter((c) => c.ready).length} Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <LiquidityCard
            amount={totalInboundLiquidity}
            bitcoinUnit={bitcoinUnit}
            icon={<ArrowDownRight className="h-4 w-4 text-blue-500" />}
            isLoading={isLoading}
            title="Inbound Liquidity"
            tooltipDescription={`Maximum amount of ${bitcoinUnit} that you can receive through Lightning Network channels. This represents the total amount others can send to you.`}
            totalCapacity={totalChannelCapacity}
            type="inbound"
          />

          <LiquidityCard
            amount={totalOutboundLiquidity}
            bitcoinUnit={bitcoinUnit}
            icon={<ArrowUpRight className="h-4 w-4 text-blue-500" />}
            isLoading={isLoading}
            title="Outbound Liquidity"
            tooltipDescription={`Maximum amount of ${bitcoinUnit} that you can send through Lightning Network channels. This represents your available balance for making payments.`}
            totalCapacity={totalChannelCapacity}
            type="outbound"
          />
        </div>
      </div>

      <Card
        action={
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowIssueAssetModal(true)}
            size="sm"
          >
            Issue Asset
          </Button>
        }
        className="mb-6"
        title="Assets"
      >
        <div className="rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 text-grey-light text-xs">
            <div className="py-2 px-4">Asset</div>
            <div className="py-2 px-4">Off Chain</div>
            <div className="py-2 px-4">On Chain</div>
            <div className="py-2 px-4">Actions</div>
          </div>

          {assetsResponse.data?.nia.map((asset) => (
            <AssetRow
              asset={asset}
              isLoading={!assetBalances[asset.asset_id]}
              key={asset.asset_id}
              offChainBalance={assetBalances[asset.asset_id]?.offChain || 0}
              onChainBalance={assetBalances[asset.asset_id]?.onChain || 0}
            />
          ))}
        </div>
      </Card>

      <Card className="mb-6" title="Lightning Channels">
        {channels.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="text-center py-6">
            <div className="text-slate-400 mb-3">No channels found</div>
            <Button
              className="mx-auto"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
              size="md"
            >
              Open Your First Channel
            </Button>
          </div>
        )}
      </Card>

      <div
        className="flex items-center gap-2 text-xs text-slate-400 mt-4 p-3 
                    bg-slate-800/30 rounded-xl border border-slate-700"
      >
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <p>
          Channel liquidity changes as you send and receive payments. Keep your
          channels balanced for optimal performance.
        </p>
      </div>
    </div>
  )
}
