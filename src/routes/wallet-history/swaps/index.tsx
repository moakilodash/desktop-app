import { ArrowDownUp, ArrowRight, RefreshCw } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { twJoin } from 'tailwind-merge'

import { RootState } from '../../../app/store'
import { nodeApi } from '../../../slices/nodeApi/nodeApi.slice'

const COL_CLASS_NAME = 'py-3 px-4'

interface SwapDetails {
  qty_from: number
  qty_to: number
  from_asset: string | null
  to_asset: string | null
  payment_hash: string
  status: string
}

interface AssetInfo {
  ticker: string
  precision: number
}

const formatAmount = (
  amount: number,
  precision: number,
  isBtc: boolean,
  bitcoinUnit: string
): string => {
  if (isBtc) {
    // Convert millisats to sats or BTC
    const sats = amount / 1000
    if (bitcoinUnit === 'SAT') {
      return sats.toLocaleString('en-US', { maximumFractionDigits: 0 })
    } else {
      const btc = sats / 100000000
      return btc.toLocaleString('en-US', {
        maximumFractionDigits: 8,
        minimumFractionDigits: 8,
      })
    }
  } else {
    const adjustedAmount = amount / Math.pow(10, precision)
    return adjustedAmount.toLocaleString('en-US', {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
    })
  }
}

const SwapRow: React.FC<{
  swap: SwapDetails
  assetInfo: Record<string, AssetInfo>
  bitcoinUnit: string
}> = ({ swap, assetInfo, bitcoinUnit }) => {
  const fromAsset = swap.from_asset
    ? assetInfo[swap.from_asset]?.ticker || swap.from_asset
    : bitcoinUnit
  const toAsset = swap.to_asset
    ? assetInfo[swap.to_asset]?.ticker || swap.to_asset
    : bitcoinUnit

  const fromPrecision = swap.from_asset
    ? assetInfo[swap.from_asset]?.precision || 0
    : 0
  const toPrecision = swap.to_asset
    ? assetInfo[swap.to_asset]?.precision || 0
    : 0

  const isFromBtc = !swap.from_asset
  const isToBtc = !swap.to_asset

  const statusColor =
    {
      completed: 'text-green-500',
      failed: 'text-red-500',
      pending: 'text-yellow-500',
    }[swap.status.toLowerCase()] || 'text-gray-500'

  return (
    <div className="grid grid-cols-9 even:bg-blue-dark rounded items-center text-lg font-medium">
      <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>
        {isFromBtc ? bitcoinUnit : fromAsset}
      </div>
      <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>
        {formatAmount(swap.qty_from, fromPrecision, isFromBtc, bitcoinUnit)}
      </div>
      <div className={COL_CLASS_NAME}>
        <ArrowRight className="w-6 h-6" />
      </div>
      <div className={COL_CLASS_NAME}>{isToBtc ? bitcoinUnit : toAsset}</div>
      <div className={COL_CLASS_NAME}>
        {formatAmount(swap.qty_to, toPrecision, isToBtc, bitcoinUnit)}
      </div>
      <div className={twJoin(COL_CLASS_NAME, 'col-span-2', statusColor)}>
        {swap.status}
      </div>
    </div>
  )
}

export const Component: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'maker' | 'taker'>('all')
  const {
    data: swapsData,
    isLoading: swapsLoading,
    isError: swapsError,
    refetch: refetchSwaps,
  } = nodeApi.endpoints.listSwaps.useQuery()
  const {
    data: assetsData,
    isLoading: assetsLoading,
    isError: assetsError,
    refetch: refetchAssets,
  } = nodeApi.endpoints.listAssets.useQuery()
  const bitcoinUnit = useSelector(
    (state: RootState) => state.settings.bitcoinUnit
  )

  const assetInfo = useMemo(() => {
    if (!assetsData) return {}
    return assetsData.nia.reduce(
      (acc, asset) => {
        acc[asset.asset_id] = {
          precision: asset.precision,
          ticker: asset.ticker,
        }
        return acc
      },
      {} as Record<string, AssetInfo>
    )
  }, [assetsData])

  const handleRefresh = async () => {
    await Promise.all([refetchSwaps(), refetchAssets()])
  }

  if (swapsLoading || assetsLoading) {
    return <div className="text-center py-8">Loading swap history...</div>
  }

  if (swapsError || assetsError) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading swap history. Please try again later.
      </div>
    )
  }

  const { maker = [], taker = [] } = swapsData || {}
  const allSwaps = [
    ...maker.map((swap) => ({ ...swap, type: 'maker' as const })),
    ...taker.map((swap) => ({ ...swap, type: 'taker' as const })),
  ]

  const filteredSwaps =
    filter === 'all'
      ? allSwaps
      : allSwaps.filter((swap) => swap.type === filter)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Swap History</h2>
        <div className="flex space-x-2 items-center">
          <button
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-cyan text-blue-dark'
                : 'bg-blue-dark text-white'
            }`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-4 py-2 rounded ${
              filter === 'maker'
                ? 'bg-cyan text-blue-dark'
                : 'bg-blue-dark text-white'
            }`}
            onClick={() => setFilter('maker')}
          >
            Maker
          </button>
          <button
            className={`px-4 py-2 rounded ${
              filter === 'taker'
                ? 'bg-cyan text-blue-dark'
                : 'bg-blue-dark text-white'
            }`}
            onClick={() => setFilter('taker')}
          >
            Taker
          </button>
          <button
            className="ml-4 p-2 rounded bg-blue-dark text-white hover:bg-cyan hover:text-blue-dark transition-colors"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {filteredSwaps.length === 0 ? (
        <div className="text-center py-8 text-grey-light">No swaps found.</div>
      ) : (
        <>
          <div className="grid grid-cols-9 font-medium text-grey-light">
            <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>
              From Asset
            </div>
            <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>
              From Amount
            </div>
            <div className={COL_CLASS_NAME}>
              <ArrowDownUp className="w-6 h-6" />
            </div>
            <div className={COL_CLASS_NAME}>To Asset</div>
            <div className={COL_CLASS_NAME}>To Amount</div>
            <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>Status</div>
          </div>

          {filteredSwaps.map((swap, index) => (
            <SwapRow
              assetInfo={assetInfo}
              bitcoinUnit={bitcoinUnit}
              key={`${swap.payment_hash}-${index}`}
              swap={swap}
            />
          ))}
        </>
      )}
    </div>
  )
}
