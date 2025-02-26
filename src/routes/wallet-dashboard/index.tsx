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
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import {
  CREATE_NEW_CHANNEL_PATH,
  WALLET_HISTORY_PATH,
} from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
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
  ActionButton,
  OverlayTooltip,
} from '../../components/ui'
import { UTXOManagementModal } from '../../components/UTXOManagementModal'
import { BitcoinNetwork, DEFAULT_RGB_ICON } from '../../constants'
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
  const [imgSrc, setImgSrc] = useAssetIcon(ticker)

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

      <div className="text-sm py-3 pl-4 pr-6 flex justify-between">
        <ActionButton
          color="cyan"
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
        </ActionButton>

        <ActionButton
          color="red"
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
        </ActionButton>

        <ActionButton
          color="purple"
          onClick={() => navigate(WALLET_HISTORY_PATH)}
        >
          History
        </ActionButton>
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
        <div className="grid grid-cols-2 gap-3">
          {/* Normal Balance */}
          <div className="bg-[#151C2E] rounded-lg p-2.5 border border-slate-700/30">
            <h4 className="text-sm font-medium text-white mb-2">
              Normal Balance
            </h4>
            <div className="space-y-1.5">
              <div className="bg-[#0B101B] rounded-lg p-1.5">
                <div className="text-xs text-gray-400">Settled</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(onChainBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-lg p-1.5">
                <div className="text-xs text-gray-400">Future</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(onChainFutureBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-lg p-1.5">
                <div className="text-xs text-gray-400">Spendable</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(onChainSpendableBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </div>
              </div>
            </div>
          </div>

          {/* Colored Balance */}
          <div className="bg-[#151C2E] rounded-lg p-2.5 border border-slate-700/30">
            <h4 className="text-sm font-medium text-white mb-2">
              Colored Balance
            </h4>
            <div className="space-y-1.5">
              <div className="bg-[#0B101B] rounded-lg p-1.5">
                <div className="text-xs text-gray-400">Settled</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(onChainColoredBalance, bitcoinUnit)}{' '}
                  {bitcoinUnit}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-lg p-1.5">
                <div className="text-xs text-gray-400">Future</div>
                <div className="text-xs font-medium text-white truncate">
                  {formatBitcoinAmount(
                    onChainColoredFutureBalance,
                    bitcoinUnit
                  )}{' '}
                  {bitcoinUnit}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-lg p-1.5">
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
        <div className="text-lg sm:text-2xl font-medium text-white">
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
}: {
  title: string
  amount: number
  bitcoinUnit: string
  icon: React.ReactNode
  tooltipDescription: string
  isLoading?: boolean
}) => {
  return (
    <OverlayTooltip content={tooltipDescription} title={title}>
      <HoverCard>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium text-slate-300">{title}</h2>
          {icon}
        </div>
        <div className="text-2xl font-bold text-white mb-1">
          {isLoading ? (
            <LoadingPlaceholder width="w-28" />
          ) : (
            `${formatBitcoinAmount(amount, bitcoinUnit)} ${bitcoinUnit}`
          )}
        </div>
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

  const isLoading =
    btcBalanceResponse.isLoading || listChannelsResponse.isLoading

  return (
    <div className="w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
      {(networkInfoResponse.data?.network as unknown as BitcoinNetwork) !==
        'Mainnet' && (
        <div className="mb-8">
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

      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="w-10 h-10 text-blue-500" />
          <h3 className="text-2xl font-bold text-white">Wallet Dashboard</h3>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Button
            icon={<Zap className="w-5 h-5" />}
            onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
            size="lg"
          >
            Open Channel
          </Button>

          <Button
            icon={<Database className="w-5 h-5" />}
            onClick={() => setShowUTXOModal(true)}
            size="lg"
          >
            Manage UTXOs
          </Button>

          <Button
            icon={<Users className="w-5 h-5" />}
            onClick={() => setShowPeerModal(true)}
            size="lg"
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
            size="md"
            variant="outline"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <InfoCardGrid>
          <InfoCard
            copySuccessMessage="Node public key copied to clipboard"
            copyText={nodeInfoResponse.data?.pubkey}
            copyable
            icon={<ChainIcon className="w-5 h-5 text-blue-500" />}
            label="Node Public Key"
            value={nodeInfoResponse.data?.pubkey || '...'}
          />

          <InfoCard
            icon={<Network className="w-5 h-5 text-blue-500" />}
            label="Network"
            value={
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{networkInfoResponse.data?.network || 'Unknown'}</span>
              </div>
            }
          />

          <InfoCard
            icon={<Blocks className="w-5 h-5 text-blue-500" />}
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

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-slate-400">
              Total Balance
            </h2>
            <div className="flex gap-2">
              <Button
                icon={<ArrowDownRight className="w-4 h-4" />}
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
                icon={<ArrowUpRight className="w-4 h-4" />}
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

          <div className="text-2xl font-bold text-white mb-4">
            {isLoading ? (
              <LoadingPlaceholder width="w-32" />
            ) : (
              `${formatBitcoinAmount(totalBalance, bitcoinUnit)} ${bitcoinUnit}`
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0B101B]/80 rounded-lg p-3 sm:p-4 hover:bg-[#0B101B] transition-all duration-200">
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

            <div className="bg-slate-900/50 rounded-lg p-4">
              <span className="text-sm text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                Off-chain
              </span>
              <div className="text-lg text-white font-medium">
                {isLoading ? (
                  <LoadingPlaceholder />
                ) : (
                  `${formatBitcoinAmount(offChainBalance, bitcoinUnit)} ${bitcoinUnit}`
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <LiquidityCard
            amount={totalInboundLiquidity}
            bitcoinUnit={bitcoinUnit}
            icon={<ArrowDownRight className="h-5 w-5 text-blue-500" />}
            isLoading={isLoading}
            title="Inbound Liquidity"
            tooltipDescription={`Maximum amount of ${bitcoinUnit} that you can receive through Lightning Network channels. This represents the total amount others can send to you.`}
          />

          <LiquidityCard
            amount={totalOutboundLiquidity}
            bitcoinUnit={bitcoinUnit}
            icon={<ArrowUpRight className="h-5 w-5 text-blue-500" />}
            isLoading={isLoading}
            title="Outbound Liquidity"
            tooltipDescription={`Maximum amount of ${bitcoinUnit} that you can send through Lightning Network channels. This represents your available balance for making payments.`}
          />
        </div>
      </div>

      <Card
        action={
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowIssueAssetModal(true)}
          >
            Issue Asset
          </Button>
        }
        className="mb-8"
        title="Assets"
      >
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
              isLoading={!assetBalances[asset.asset_id]}
              key={asset.asset_id}
              offChainBalance={assetBalances[asset.asset_id]?.offChain || 0}
              onChainBalance={assetBalances[asset.asset_id]?.onChain || 0}
            />
          ))}
        </div>
      </Card>

      <Card className="mb-8" title="Lightning Channels">
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
            <Button
              className="mx-auto"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
            >
              Open Your First Channel
            </Button>
          </div>
        )}
      </Card>

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
