import { CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAppSelector } from '../../app/store/hooks'
import {
  NiaAsset,
  nodeApi,
  SwapDetails,
} from '../../slices/nodeApi/nodeApi.slice'

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'succeeded':
      return {
        badgeClass: 'bg-green-500/20 text-green-600 dark:text-green-400',
        containerClass: 'bg-green-500/10 dark:bg-green-900/20',
        icon: CheckCircle,
        iconClass: 'text-green-500',
      }
    case 'failed':
    case 'expired':
      return {
        badgeClass: 'bg-red-500/20 text-red-600 dark:text-red-400',
        containerClass: 'bg-red-500/10 dark:bg-red-900/20',
        icon: AlertCircle,
        iconClass: 'text-red-500',
      }
    case 'waiting':
    case 'pending':
      return {
        badgeClass: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
        containerClass: 'bg-blue-500/10 dark:bg-blue-900/20',
        icon: Clock,
        iconClass: 'text-blue-500',
      }
    default:
      return {
        badgeClass: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
        containerClass: 'bg-gray-500/10 dark:bg-gray-900/20',
        icon: Clock,
        iconClass: 'text-gray-500',
      }
  }
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
    minimumFractionDigits: 2,
  }).format(amount)
}

const StatusToastElement: React.FC<{
  swap: SwapDetails
  assets: NiaAsset[]
}> = ({ swap, assets }) => {
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

  const {
    icon: StatusIcon,
    containerClass,
    iconClass,
    badgeClass,
  } = getStatusConfig(swap.status)
  const isPending = ['waiting', 'pending'].includes(swap.status.toLowerCase())

  return (
    <div
      className={`min-w-[320px] max-w-[400px] rounded-xl shadow-lg ${containerClass} backdrop-blur-md`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={`${iconClass} w-5 h-5`} />
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              Swap Status
            </span>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase ${badgeClass}`}
          >
            {swap.status}
          </span>
        </div>

        {isPending && (
          <div className="h-1.5 bg-blue-500/20 dark:bg-blue-400/20 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 rounded-full animate-[progress_2s_linear_infinite]"
              style={{
                animation: 'progress 2s linear infinite',
                background:
                  'linear-gradient(90deg, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 1) 50%, rgba(59, 130, 246, 0.5) 100%)',
                transform: 'translateX(-100%)',
              }}
            />
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 my-3" />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                From
              </span>
              <div className="font-medium text-gray-700 dark:text-gray-200">
                {formatAmount(fromAssetQty)} {fromAssetTicker}
              </div>
            </div>

            <ArrowRight className="text-gray-400 w-4 h-4 flex-shrink-0" />

            <div className="flex-1 text-right">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                To
              </span>
              <div className="font-medium text-gray-700 dark:text-gray-200">
                {formatAmount(toAssetQty)} {toAssetTicker}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Toast {
  id: string
  content: React.ReactNode
  type: 'success' | 'error' | 'loading'
  autoClose?: number
}

const StatusToastContainer: React.FC<{
  toasts: Toast[]
  onRemove: (id: string) => void
}> = ({ toasts, onRemove }) => {
  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.autoClose) {
        const timer = setTimeout(() => {
          onRemove(toast.id)
        }, toast.autoClose)
        return () => clearTimeout(timer)
      }
    })
  }, [toasts, onRemove])

  return createPortal(
    <div className="fixed bottom-4 left-4 z-50 space-y-4">
      {toasts.map((toast) => (
        <div
          className="transition-all duration-300 ease-in-out"
          key={toast.id}
          onClick={() => onRemove(toast.id)}
        >
          {toast.content}
        </div>
      ))}
    </div>,
    document.body
  )
}

export const StatusToast: React.FC<{
  assets: NiaAsset[]
}> = ({ assets }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const paymentHashToStatus = useRef<Record<string, string>>({})

  const { data } = nodeApi.useListSwapsQuery(undefined, {
    pollingInterval: 6000,
  })

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    delete paymentHashToStatus.current[id]
  }

  useEffect(() => {
    if (!data?.taker) return

    // Remove toasts for swaps that no longer exist
    setToasts((prev) =>
      prev.filter((toast) =>
        data.taker.some((swap) => swap.payment_hash === toast.id)
      )
    )

    data.taker.forEach((swap) => {
      const existingStatus = paymentHashToStatus.current[swap.payment_hash]

      if (existingStatus && existingStatus !== swap.status) {
        // Update existing toast
        if (swap.status === 'Failed' || swap.status === 'Expired') {
          setToasts((prev) =>
            updateToast(prev, swap.payment_hash, {
              autoClose: 5000,
              content: <StatusToastElement assets={assets} swap={swap} />,
              type: 'error',
            })
          )
          setTimeout(() => removeToast(swap.payment_hash), 5000)
        } else if (swap.status === 'Succeeded') {
          setToasts((prev) =>
            updateToast(prev, swap.payment_hash, {
              autoClose: 5000,
              content: <StatusToastElement assets={assets} swap={swap} />,
              type: 'success',
            })
          )
          setTimeout(() => removeToast(swap.payment_hash), 5000)
        } else {
          setToasts((prev) =>
            updateToast(prev, swap.payment_hash, {
              content: <StatusToastElement assets={assets} swap={swap} />,
              type: 'loading',
            })
          )
        }
      } else if (!existingStatus && swap.status === 'Pending') {
        // Create new toast
        setToasts((prev) => [
          ...prev,
          {
            content: <StatusToastElement assets={assets} swap={swap} />,
            id: swap.payment_hash,
            type: 'loading',
          },
        ])
      }

      paymentHashToStatus.current[swap.payment_hash] = swap.status
    })
  }, [data, assets])

  return <StatusToastContainer onRemove={removeToast} toasts={toasts} />
}

const updateToast = (toasts: Toast[], id: string, updates: Partial<Toast>) => {
  return toasts.map((toast) =>
    toast.id === id ? { ...toast, ...updates } : toast
  )
}
