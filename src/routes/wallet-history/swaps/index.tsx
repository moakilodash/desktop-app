import {
  ArrowDownUp,
  ArrowRight,
  RefreshCw,
  Loader,
  Settings2,
  ChevronDown,
  ChevronUp,
  Search,
  Copy,
} from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { twJoin } from 'tailwind-merge'

import { RootState } from '../../../app/store'
import { Button, IconButton, Badge } from '../../../components/ui'
import { nodeApi, SwapDetails } from '../../../slices/nodeApi/nodeApi.slice'

const COL_CLASS_NAME = 'py-3 px-2'
const ASSET_COL_CLASS = twJoin(COL_CLASS_NAME, 'col-span-1')
const AMOUNT_COL_CLASS = twJoin(COL_CLASS_NAME, 'col-span-2')
const TIME_COL_CLASS = twJoin(COL_CLASS_NAME, 'col-span-2 text-sm')
const ARROW_COL_CLASS = twJoin(COL_CLASS_NAME, 'flex justify-center')

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

// Add interface for column visibility
interface ColumnVisibility {
  requestedAt: boolean
  initiatedAt: boolean
  completedAt: boolean
  paymentHash: boolean
}

// Add formatDate helper
const formatDate = (timestamp: number | null) => {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString()
}

// Add helper function to truncate hash
const truncateHash = (hash: string) => {
  return `${hash.slice(0, 16)}...`
}

// Update SwapRow component
const SwapRow: React.FC<{
  swap: SwapDetails
  assetInfo: Record<string, AssetInfo>
  bitcoinUnit: string
  columnVisibility: ColumnVisibility
}> = ({ swap, assetInfo, bitcoinUnit, columnVisibility }) => {
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

  const statusVariant = {
    Expired: 'default',
    Failed: 'danger',
    Pending: 'warning',
    Succeeded: 'success',
    Waiting: 'info',
  }[swap.status || 'Pending'] as
    | 'default'
    | 'danger'
    | 'warning'
    | 'success'
    | 'info'

  return (
    <div className="grid grid-cols-12 border-b border-slate-700 items-center text-sm font-medium hover:bg-slate-800/30 transition-colors">
      <div className={ASSET_COL_CLASS}>
        <div className="flex items-center">
          <span className="font-medium">
            {isFromBtc ? bitcoinUnit : fromAsset}
          </span>
        </div>
      </div>

      <div className={AMOUNT_COL_CLASS}>
        <div className="font-mono">
          {formatAmount(swap.qty_from, fromPrecision, isFromBtc, bitcoinUnit)}
        </div>
      </div>

      <div className={ARROW_COL_CLASS}>
        <ArrowRight className="w-4 h-4" />
      </div>

      <div className={ASSET_COL_CLASS}>
        <div className="flex items-center">
          <span className="font-medium">{isToBtc ? bitcoinUnit : toAsset}</span>
        </div>
      </div>

      <div className={AMOUNT_COL_CLASS}>
        <div className="font-mono">
          {formatAmount(swap.qty_to, toPrecision, isToBtc, bitcoinUnit)}
        </div>
      </div>

      {columnVisibility.requestedAt && (
        <div className={TIME_COL_CLASS}>{formatDate(swap.requested_at)}</div>
      )}
      {columnVisibility.initiatedAt && (
        <div className={TIME_COL_CLASS}>{formatDate(swap.initiated_at)}</div>
      )}
      {columnVisibility.completedAt && (
        <div className={TIME_COL_CLASS}>{formatDate(swap.completed_at)}</div>
      )}

      {columnVisibility.paymentHash && (
        <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>
          <div
            className="flex items-center gap-2 group cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(swap.payment_hash)
              toast.success('Payment hash copied to clipboard')
            }}
            title="Click to copy"
          >
            <span className="font-mono text-xs text-slate-400">
              {truncateHash(swap.payment_hash)}
            </span>
            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      )}

      <div className={twJoin(COL_CLASS_NAME, 'col-span-2 flex justify-center')}>
        <Badge size="sm" variant={statusVariant}>
          {swap.status || 'Pending'}
        </Badge>
      </div>
    </div>
  )
}

// Add ColumnSelector component
const ColumnSelector: React.FC<{
  columnVisibility: ColumnVisibility
  onColumnToggle: (column: keyof ColumnVisibility) => void
}> = ({ columnVisibility, onColumnToggle }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <IconButton
        aria-label="Column Settings"
        icon={<Settings2 className="w-5 h-5" />}
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
      />

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-slate-800 rounded-lg shadow-lg p-4 z-10 min-w-[200px] border border-slate-700">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={columnVisibility.paymentHash}
                className="form-checkbox"
                onChange={() => onColumnToggle('paymentHash')}
                type="checkbox"
              />
              Payment Hash
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={columnVisibility.requestedAt}
                className="form-checkbox"
                onChange={() => onColumnToggle('requestedAt')}
                type="checkbox"
              />
              Requested At
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={columnVisibility.initiatedAt}
                className="form-checkbox"
                onChange={() => onColumnToggle('initiatedAt')}
                type="checkbox"
              />
              Initiated At
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={columnVisibility.completedAt}
                className="form-checkbox"
                onChange={() => onColumnToggle('completedAt')}
                type="checkbox"
              />
              Completed At
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// Add interfaces for sorting
interface SortConfig {
  key: keyof SwapDetails | 'type'
  direction: 'asc' | 'desc'
}

export const Component: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'maker' | 'taker'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    direction: 'desc',
    key: 'requested_at',
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    completedAt: false,
    initiatedAt: false,
    paymentHash: false,
    requestedAt: true,
  })

  // API queries
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

  // Prepare asset info
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

  // Prepare all swaps
  const allSwaps = useMemo(() => {
    const { maker = [], taker = [] } = swapsData || {}
    return [
      ...maker.map((swap) => ({ ...swap, type: 'maker' as const })),
      ...taker.map((swap) => ({ ...swap, type: 'taker' as const })),
    ]
  }, [swapsData])

  // Sort and filter logic
  const sortedAndFilteredSwaps = useMemo(() => {
    let result = allSwaps

    // Apply type filter
    if (filter !== 'all') {
      result = result.filter((swap) => swap.type === filter)
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter((swap) => {
        const fromAsset = swap.from_asset
          ? assetInfo[swap.from_asset]?.ticker || swap.from_asset
          : bitcoinUnit
        const toAsset = swap.to_asset
          ? assetInfo[swap.to_asset]?.ticker || swap.to_asset
          : bitcoinUnit

        return (
          fromAsset.toLowerCase().includes(searchLower) ||
          toAsset.toLowerCase().includes(searchLower) ||
          swap.status?.toLowerCase().includes(searchLower) ||
          swap.payment_hash.toLowerCase().includes(searchLower)
        )
      })
    }

    // Apply sorting
    return result.sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue === null) return 1
      if (bValue === null) return -1
      if (aValue === bValue) return 0

      const comparison = aValue < bValue ? -1 : 1
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [allSwaps, filter, searchTerm, sortConfig, assetInfo, bitcoinUnit])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchSwaps(), refetchAssets()])
    setIsRefreshing(false)
  }

  const handleColumnToggle = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }))
  }

  // Add sort handler
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig((prev) => ({
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
      key,
    }))
  }

  // Add SortHeader component
  const SortHeader: React.FC<{
    label: string
    sortKey: SortConfig['key']
    className?: string
  }> = ({ label, sortKey, className }) => (
    <div
      className={twJoin(
        'cursor-pointer select-none flex items-center gap-1',
        className
      )}
      onClick={() => handleSort(sortKey)}
    >
      {label}
      <div className="flex flex-col">
        <ChevronUp
          className={twJoin(
            'w-3 h-3 -mb-1',
            sortConfig.key === sortKey && sortConfig.direction === 'asc'
              ? 'text-blue-500'
              : 'text-slate-600'
          )}
        />
        <ChevronDown
          className={twJoin(
            'w-3 h-3',
            sortConfig.key === sortKey && sortConfig.direction === 'desc'
              ? 'text-blue-500'
              : 'text-slate-600'
          )}
        />
      </div>
    </div>
  )

  if (swapsLoading || assetsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader className="w-12 h-12 animate-spin text-cyan" />
        <p className="text-slate-400">Loading swap history...</p>
      </div>
    )
  }

  if (swapsError || assetsError) {
    return (
      <div className="text-center py-8 text-red-500 bg-slate-800/30 rounded-lg border border-slate-700 p-6">
        Error loading swap history. Please try again later.
        <div className="mt-4">
          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">Swap History</h2>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <div className="relative">
            <input
              className="pl-9 pr-4 py-2 bg-slate-800/50 rounded-lg text-sm text-white placeholder-slate-400
                       border border-slate-700 focus:border-blue-500 focus:outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search swaps..."
              type="text"
              value={searchTerm}
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <Button
            onClick={() => setFilter('all')}
            size="sm"
            variant={filter === 'all' ? 'primary' : 'outline'}
          >
            All
          </Button>
          <Button
            onClick={() => setFilter('maker')}
            size="sm"
            variant={filter === 'maker' ? 'primary' : 'outline'}
          >
            Maker
          </Button>
          <Button
            onClick={() => setFilter('taker')}
            size="sm"
            variant={filter === 'taker' ? 'primary' : 'outline'}
          >
            Taker
          </Button>
          <ColumnSelector
            columnVisibility={columnVisibility}
            onColumnToggle={handleColumnToggle}
          />
          <IconButton
            aria-label="Refresh"
            disabled={isRefreshing}
            icon={
              isRefreshing ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )
            }
            onClick={handleRefresh}
            variant="outline"
          />
        </div>
      </div>

      <div className="overflow-x-auto bg-slate-800/30 rounded-lg border border-slate-700">
        <div className="grid grid-cols-12 bg-slate-800/50 text-xs font-medium text-slate-400 border-b border-slate-700 py-2">
          <SortHeader
            className={ASSET_COL_CLASS}
            label="Asset"
            sortKey="from_asset"
          />
          <SortHeader
            className={AMOUNT_COL_CLASS}
            label="Amount"
            sortKey="qty_from"
          />
          <div className={ARROW_COL_CLASS}>
            <ArrowDownUp className="w-4 h-4" />
          </div>
          <SortHeader
            className={ASSET_COL_CLASS}
            label="Asset"
            sortKey="to_asset"
          />
          <SortHeader
            className={AMOUNT_COL_CLASS}
            label="Amount"
            sortKey="qty_to"
          />

          {columnVisibility.requestedAt && (
            <SortHeader
              className={TIME_COL_CLASS}
              label="Requested"
              sortKey="requested_at"
            />
          )}
          {columnVisibility.initiatedAt && (
            <SortHeader
              className={TIME_COL_CLASS}
              label="Initiated"
              sortKey="initiated_at"
            />
          )}
          {columnVisibility.completedAt && (
            <SortHeader
              className={TIME_COL_CLASS}
              label="Completed"
              sortKey="completed_at"
            />
          )}

          {columnVisibility.paymentHash && (
            <SortHeader
              className={twJoin(COL_CLASS_NAME, 'col-span-2')}
              label="Payment Hash"
              sortKey="payment_hash"
            />
          )}

          <SortHeader
            className={twJoin(COL_CLASS_NAME, 'col-span-2 text-center')}
            label="Status"
            sortKey="status"
          />
        </div>

        <div>
          {sortedAndFilteredSwaps.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              {searchTerm ? 'No swaps match your search' : 'No swaps found'}
            </div>
          ) : (
            sortedAndFilteredSwaps.map((swap, index) => (
              <SwapRow
                assetInfo={assetInfo}
                bitcoinUnit={bitcoinUnit}
                columnVisibility={columnVisibility}
                key={`${swap.payment_hash}-${index}`}
                swap={swap}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
