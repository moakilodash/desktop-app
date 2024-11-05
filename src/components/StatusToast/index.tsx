import React, { useEffect, useRef } from 'react'
import { Id, toast, ToastContainer } from 'react-toastify'

import { useAppSelector } from '../../app/store/hooks'
import {
  NiaAsset,
  nodeApi,
  SwapDetails,
} from '../../slices/nodeApi/nodeApi.slice'

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

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-bold">Swap Status</div>
        <span className="text-xs font-semibold uppercase">{swap.status}</span>
      </div>

      <div className="border-t border-gray-200 my-2"></div>

      <div className="text-sm">
        {/*
        <div className="mb-2">
          <span className="font-semibold">Payment Hash:</span>
          <span className="text-gray-600 break-all ml-2">
            {swap.payment_hash}
          </span>
        </div>
        */}

        <div className="mb-2">
          <span className="font-semibold">From:</span>
          <span className="text-gray-600 ml-2">
            {fromAssetQty} {fromAssetTicker}
          </span>
        </div>

        <div className="mb-2">
          <span className="font-semibold">To:</span>
          <span className="text-gray-600 ml-2">
            {toAssetQty} {toAssetTicker}
          </span>
        </div>
      </div>
    </>
  )
}

export const StatusToast: React.FC<{
  assets: NiaAsset[]
}> = ({ assets }) => {
  const paymentHashToStatus = useRef<Record<string, string>>({})

  const { data } = nodeApi.useListSwapsQuery(undefined, {
    pollingInterval: 3000,
  })

  useEffect(() => {
    data?.taker.forEach((swap) => {
      // toast already exists
      if (paymentHashToStatus.current[swap.payment_hash]) {
        // remove from map if swap is not pending anymore
        if (
          paymentHashToStatus.current[swap.payment_hash] !== 'Waiting' &&
          paymentHashToStatus.current[swap.payment_hash] !== 'Pending'
        ) {
          delete paymentHashToStatus.current[swap.payment_hash]
        } else if (
          swap.status !== paymentHashToStatus.current[swap.payment_hash]
        ) {
          // if status has changed, update toast
          if (swap.status === 'Failed' || swap.status === 'Expired') {
            toast.update(swap.payment_hash, {
              autoClose: 5000,
              containerId: 'status-toast',
              isLoading: false,
              render: () => <StatusToastElement assets={assets} swap={swap} />,
              type: 'error',
            })
          } else if (swap.status === 'Succeeded') {
            toast.update(swap.payment_hash, {
              autoClose: 5000,
              containerId: 'status-toast',
              isLoading: false,
              render: () => <StatusToastElement assets={assets} swap={swap} />,
              type: 'success',
            })
          } else {
            toast.update(swap.payment_hash, {
              containerId: 'status-toast',
              render: () => <StatusToastElement assets={assets} swap={swap} />,
              type: 'default',
            })
          }
          paymentHashToStatus.current[swap.payment_hash] = swap.status
        }
      } else if (swap.status === 'Waiting' || swap.status === 'Pending') {
        // new toast
        toast.loading(
          () => <StatusToastElement assets={assets} swap={swap} />,
          {
            autoClose: false,
            closeOnClick: true,
            containerId: 'status-toast',
            isLoading: true,
            toastId: swap.payment_hash,
          }
        )
        // insert toast into map
        paymentHashToStatus.current[swap.payment_hash] = swap.status
      }
    })
  }, [data])

  return (
    <ToastContainer
      stacked
      containerId="status-toast"
      // enableMultiContainer={true}
      position="bottom-left"
    />
  )
}
