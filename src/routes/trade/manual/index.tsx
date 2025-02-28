import {
  ArrowRight,
  Lock,
  Unlock,
  Zap,
  ChevronDown,
  ChevronUp,
  User,
  RefreshCw,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { useAppSelector } from '../../../app/store/hooks'
import { Loader } from '../../../components/Loader'
import { StatusToast } from '../../../components/StatusToast'
import { NoChannelsMessage, ManualSwapForm } from '../../../components/Trade'
import { TakerSwapForm } from '../../../components/Trade/TakerSwapForm'
import { nodeApi, NiaAsset } from '../../../slices/nodeApi/nodeApi.slice'
import { logger } from '../../../utils/logger'
import './index.css'

export const Component = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [assets, setAssets] = useState<NiaAsset[]>([])
  const [hasValidChannelsForTrading, setHasValidChannelsForTrading] =
    useState(false)
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeRole, setActiveRole] = useState<'maker' | 'taker'>('maker')

  // API hooks
  const [listChannels] = nodeApi.endpoints.listChannels.useLazyQuery()

  const { data: assetsData } = nodeApi.endpoints.listAssets.useQuery(
    undefined,
    {
      pollingInterval: 30000,
      refetchOnFocus: false,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: false,
    }
  )

  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)

  // Utility functions
  const getDisplayAsset = (asset: string) => {
    return asset === 'BTC' && bitcoinUnit === 'SAT' ? 'SAT' : asset
  }

  const getAssetPrecision = (asset: string) => {
    if (asset === 'BTC') {
      return bitcoinUnit === 'BTC' ? 8 : 0
    }
    const assetInfo = assets.find(
      (a) => a.asset_id === asset || a.ticker === asset
    )
    return assetInfo ? assetInfo.precision : 8
  }

  const formatAmount = (amount: number, asset: string) => {
    const precision = getAssetPrecision(asset)
    const divisor = Math.pow(10, precision)
    const formattedAmount = (amount / divisor).toFixed(precision)
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: precision,
      minimumFractionDigits: 0, // Don't show unnecessary zeros
      useGrouping: true,
    }).format(parseFloat(formattedAmount))
  }

  const toggleExplanation = () => {
    setIsExplanationExpanded(!isExplanationExpanded)
  }

  const handleRoleChange = (role: 'maker' | 'taker') => {
    setActiveRole(role)
  }

  // Fetch initial data
  useEffect(() => {
    const setup = async () => {
      setIsLoading(true)
      try {
        const listChannelsResponse = await listChannels()

        if ('data' in listChannelsResponse && listChannelsResponse.data) {
          const channelsList = listChannelsResponse.data.channels

          // Check if there's at least one channel with an asset that is ready and usable
          const hasValidChannels = channelsList.some(
            (channel) =>
              channel.asset_id !== null &&
              channel.ready &&
              (channel.outbound_balance_msat > 0 ||
                channel.inbound_balance_msat > 0)
          )
          setHasValidChannelsForTrading(hasValidChannels)
        }

        if (assetsData) {
          setAssets(assetsData.nia)
        }

        logger.info('Initial data fetched successfully')
      } catch (error) {
        logger.error('Error during setup:', error)
        toast.error(
          'Failed to initialize the manual swap component. Please try again.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    setup()
  }, [listChannels, assetsData])

  const refreshData = async () => {
    setIsLoading(true)
    setIsRefreshing(true)
    try {
      const listChannelsResponse = await listChannels()

      if ('data' in listChannelsResponse && listChannelsResponse.data) {
        const channelsList = listChannelsResponse.data.channels

        // Check if there's at least one channel with an asset that is ready and usable
        const hasValidChannels = channelsList.some(
          (channel) =>
            channel.asset_id !== null &&
            channel.ready &&
            (channel.outbound_balance_msat > 0 ||
              channel.inbound_balance_msat > 0)
        )
        setHasValidChannelsForTrading(hasValidChannels)
      }

      if (assetsData) {
        setAssets(assetsData.nia)
      }

      logger.info('Data refreshed successfully')
      toast.success('Data refreshed successfully')
    } catch (error) {
      logger.error('Error refreshing data:', error)
      toast.error('Failed to refresh data. Please try again.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Render functions
  const renderNoChannelsMessage = () => (
    <NoChannelsMessage onMakerChange={refreshData} onNavigate={navigate} />
  )

  const renderRoleSelector = () => (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 shadow-lg mb-6 role-selector">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          <h3 className="text-md font-medium text-white">Your Role</h3>
        </div>
        <button
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          disabled={isRefreshing}
          onClick={refreshData}
          title="Refresh data"
        >
          <RefreshCw
            className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          className={`flex-1 px-4 py-3 ${activeRole === 'maker' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} text-white rounded-lg transition-colors button-animate`}
          disabled={activeRole === 'maker'}
          onClick={() => handleRoleChange('maker')}
        >
          Maker
        </button>
        <button
          className={`flex-1 px-4 py-3 ${activeRole === 'taker' ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'} text-white rounded-lg transition-colors button-animate`}
          disabled={activeRole === 'taker'}
          onClick={() => handleRoleChange('taker')}
        >
          Taker
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {activeRole === 'maker' ? (
          <>
            As a <span className="font-semibold text-blue-400">maker</span>, you
            can initiate and execute swaps. Switch to{' '}
            <span className="font-semibold text-emerald-400">taker</span> role
            to whitelist incoming swaps.
          </>
        ) : (
          <>
            As a <span className="font-semibold text-emerald-400">taker</span>,
            you can whitelist incoming swaps. Switch to{' '}
            <span className="font-semibold text-blue-400">maker</span> role to
            initiate and execute swaps.
          </>
        )}
      </p>
    </div>
  )

  const renderSwapExplanation = () => (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-lg mb-6 explanation-card">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={toggleExplanation}
      >
        <h2 className="text-xl font-semibold text-white">
          How Atomic Swaps Work
        </h2>
        <button className="p-1 rounded-full hover:bg-slate-800 transition-colors">
          {isExplanationExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>

      {isExplanationExpanded && (
        <div className="mt-4 explanation-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 swap-step-card">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-md font-medium text-white text-center mb-2">
                Trustless Exchange
              </h3>
              <p className="text-sm text-slate-400 text-center">
                Atomic swaps allow two parties to exchange different assets
                without trusting each other or using a third party.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 swap-step-card">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Lock className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-md font-medium text-white text-center mb-2">
                Cryptographic Locks
              </h3>
              <p className="text-sm text-slate-400 text-center">
                The swap uses cryptographic hash locks to ensure that either
                both parties receive their assets or neither does.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 swap-step-card">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Unlock className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-md font-medium text-white text-center mb-2">
                Atomic Guarantee
              </h3>
              <p className="text-sm text-slate-400 text-center">
                The "atomic" property ensures that the swap either completes
                fully or not at all, eliminating counterparty risk.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700/50 mb-6">
            <h3 className="text-lg font-medium text-white mb-3">
              Swap Process
            </h3>
            <ol className="space-y-4 ml-6 relative before:absolute before:left-0 before:top-2 before:h-[calc(100%-16px)] before:w-[2px] before:bg-slate-700">
              <li className="pl-8 relative before:absolute before:left-0 before:top-2 before:h-4 before:w-4 before:rounded-full before:border-2 before:border-blue-500 before:bg-slate-900">
                <h4 className="text-md font-medium text-white">
                  Maker Initiates
                </h4>
                <p className="text-sm text-slate-400">
                  The maker defines the assets and amounts to swap and generates
                  a swap string.
                </p>
              </li>
              <li className="pl-8 relative before:absolute before:left-0 before:top-2 before:h-4 before:w-4 before:rounded-full before:border-2 before:border-blue-500 before:bg-slate-900">
                <h4 className="text-md font-medium text-white">
                  Taker Whitelists
                </h4>
                <p className="text-sm text-slate-400">
                  The taker reviews the swap terms and whitelists the swap
                  string to accept the trade.
                </p>
              </li>
              <li className="pl-8 relative before:absolute before:left-0 before:top-2 before:h-4 before:w-4 before:rounded-full before:border-2 before:border-blue-500 before:bg-slate-900">
                <h4 className="text-md font-medium text-white">
                  Maker Executes
                </h4>
                <p className="text-sm text-slate-400">
                  The maker executes the swap, triggering the atomic exchange of
                  assets between both parties.
                </p>
              </li>
            </ol>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 role-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                  M
                </div>
                <h3 className="text-md font-medium text-white">Maker Role</h3>
              </div>
              <p className="text-sm text-slate-400 ml-8 mb-2">
                As a maker, you can:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-400 ml-8 space-y-1">
                <li>Initiate swaps by defining assets and amounts</li>
                <li>Generate and share swap strings with takers</li>
                <li>Execute swaps once the taker has whitelisted you</li>
                <li>Control both the initiation and execution phases</li>
              </ul>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-slate-500" />
            </div>

            <div className="flex-1 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 role-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                  T
                </div>
                <h3 className="text-md font-medium text-white">Taker Role</h3>
              </div>
              <p className="text-sm text-slate-400 ml-8 mb-2">
                As a taker, you can:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-400 ml-8 space-y-1">
                <li>Receive swap strings from makers</li>
                <li>Review the proposed swap terms</li>
                <li>Whitelist the swap string to accept the trade</li>
                <li>Wait for the maker to execute the swap</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-md font-medium text-white mb-2">
              Liquidity Requirements
            </h3>
            <p className="text-sm text-slate-400 mb-2">
              For atomic swaps to succeed, both parties need:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-400 space-y-1 ml-2">
              <li>
                Sufficient liquidity of the assets being exchanged in their
                lightning channels
              </li>
              <li>
                Bitcoin liquidity for routing payments between the maker and
                taker
              </li>
              <li>Active and balanced channels connecting both parties</li>
            </ul>
            <p className="text-sm text-slate-400 mt-2">
              If liquidity is insufficient, the swap may fail even if it has
              been properly whitelisted.
            </p>
          </div>
        </div>
      )}

      {!isExplanationExpanded && (
        <p className="mt-2 text-sm text-slate-400">
          Click to expand and learn more about how atomic swaps work and the
          roles involved.
        </p>
      )}
    </div>
  )

  const renderSwapForm = () => (
    <div className="swap-form-container w-full max-w-4xl">
      {renderRoleSelector()}
      {renderSwapExplanation()}
      <div className="bg-gradient-to-b from-slate-900/80 to-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-lg w-full swap-form">
        {activeRole === 'maker' ? (
          <ManualSwapForm
            assets={assets}
            formatAmount={formatAmount}
            getAssetPrecision={getAssetPrecision}
            getDisplayAsset={getDisplayAsset}
          />
        ) : (
          <TakerSwapForm
            assets={assets}
            formatAmount={formatAmount}
            getAssetPrecision={getAssetPrecision}
            getDisplayAsset={getDisplayAsset}
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="container mx-auto w-full flex flex-col items-center justify-center py-6">
      <h1 className="text-2xl font-bold text-white mb-6 page-title">
        Manual Trading
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      ) : !hasValidChannelsForTrading ? (
        renderNoChannelsMessage()
      ) : (
        renderSwapForm()
      )}

      {!isLoading && assets.length > 0 && <StatusToast assets={assets} />}
    </div>
  )
}
