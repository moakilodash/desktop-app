import { ArrowRight } from 'lucide-react'
import React, { useEffect, useRef } from 'react'

import { useAppSelector } from '../../app/store/hooks'
import { useAssetIcon } from '../../helpers/utils'
import {
  NiaAsset,
  nodeApi,
  SwapDetails,
} from '../../slices/nodeApi/nodeApi.slice'
import { useNotification } from '../NotificationSystem'

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
    minimumFractionDigits: 2,
  }).format(amount)
}

const AssetDisplay: React.FC<{
  amount: number
  asset: string
  align?: 'left' | 'right'
}> = ({ amount, asset, align = 'left' }) => {
  const [imgSrc] = useAssetIcon(asset)

  return (
    <div
      className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
        <img alt={`${asset} icon`} className="w-4 h-4" src={imgSrc} />
      </div>
      <div>
        <div className="font-medium text-gray-700 dark:text-gray-200">
          {formatAmount(amount)} {asset}
        </div>
      </div>
    </div>
  )
}

const SwapStatusContent: React.FC<{
  swap: SwapDetails
  assets: NiaAsset[]
  timestamp?: Date
}> = ({ swap, assets, timestamp }) => {
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)

  const fromAssetTicker =
    assets.find((asset) => asset.asset_id === swap.from_asset)?.ticker ||
    bitcoinUnit
  let fromAssetQty =
    swap.qty_from /
    Math.pow(
      10,
      assets.find((asset) => asset.asset_id === swap.from_asset)?.precision || 8
    )
  if (fromAssetTicker === 'BTC') {
    fromAssetQty /= 1000
  } else if (fromAssetTicker === 'SAT') {
    fromAssetQty *= 100000
  }

  const toAssetTicker =
    assets.find((asset) => asset.asset_id === swap.to_asset)?.ticker ||
    bitcoinUnit
  let toAssetQty =
    swap.qty_to /
    Math.pow(
      10,
      assets.find((asset) => asset.asset_id === swap.to_asset)?.precision || 8
    )
  if (toAssetTicker === 'BTC') {
    toAssetQty /= 1000
  } else if (toAssetTicker === 'SAT') {
    toAssetQty *= 100000
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">From</span>
          <AssetDisplay amount={fromAssetQty} asset={fromAssetTicker} />
        </div>

        <ArrowRight className="text-gray-400 w-4 h-4 flex-shrink-0" />

        <div className="flex-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">To</span>
          <AssetDisplay
            align="right"
            amount={toAssetQty}
            asset={toAssetTicker}
          />
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        {(timestamp || new Date()).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </div>
    </div>
  )
}

interface SwapNotificationState {
  id: string
  status: string
  timestamp: Date
  dismissed: boolean
}

export const StatusToast: React.FC<{
  assets: NiaAsset[]
}> = ({ assets }) => {
  const { addNotification, removeNotification } = useNotification()
  const swapStates = useRef<Record<string, SwapNotificationState>>({})

  const { data } = nodeApi.useListSwapsQuery(undefined, {
    pollingInterval: 6000,
  })

  useEffect(() => {
    if (!data?.taker) return

    // Process new and existing swaps
    data.taker.forEach((swap) => {
      const currentState = swapStates.current[swap.payment_hash]

      // Skip if the swap was dismissed and has a final status
      if (
        currentState?.dismissed &&
        ['Succeeded', 'Failed', 'Expired'].includes(currentState.status)
      ) {
        return
      }

      // Create or update notification
      const timestamp = currentState?.timestamp || new Date()
      const notificationConfig = {
        message: (
          <SwapStatusContent
            assets={assets}
            swap={swap}
            timestamp={timestamp}
          />
        ),
        onClose: () => {
          if (swapStates.current[swap.payment_hash]) {
            swapStates.current[swap.payment_hash].dismissed = true
          }
        },
        showProgress: swap.status === 'Pending',
        timestamp,
        title: `Swap ${swap.status}`,
      }

      // Handle status changes
      if (currentState) {
        if (currentState.status !== swap.status) {
          removeNotification(currentState.id)
          const newId = addNotification({
            ...notificationConfig,
            autoClose: ['Succeeded', 'Failed', 'Expired'].includes(swap.status)
              ? 5000
              : undefined,
            type: getNotificationType(swap.status),
          })
          swapStates.current[swap.payment_hash] = {
            dismissed: false,
            id: newId,
            status: swap.status,
            timestamp,
          }
        }
      } else if (swap.status === 'Pending') {
        // New pending swap
        const id = addNotification({
          ...notificationConfig,
          type: 'loading',
        })
        swapStates.current[swap.payment_hash] = {
          dismissed: false,
          id,
          status: swap.status,
          timestamp,
        }
      }
    })

    // Clean up completed swaps that are no longer in the data
    Object.entries(swapStates.current).forEach(([hash, state]) => {
      const swapExists = data.taker.some((swap) => swap.payment_hash === hash)
      const isFinalStatus = ['Succeeded', 'Failed', 'Expired'].includes(
        state.status
      )

      // Remove the notification if:
      // 1. The swap no longer exists in the data AND
      // 2. Either it's not in a final status OR it's been dismissed
      if (!swapExists && (!isFinalStatus || state.dismissed)) {
        removeNotification(state.id)
        delete swapStates.current[hash]
      }
    })
  }, [data, assets, addNotification, removeNotification])

  return null
}

function getNotificationType(status: string) {
  switch (status) {
    case 'Succeeded':
      return 'success'
    case 'Failed':
    case 'Expired':
      return 'error'
    case 'Pending':
      return 'loading'
    default:
      return 'info'
  }
}
