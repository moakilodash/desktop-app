import React, { useEffect, useRef } from 'react'
import { Id, toast, ToastContainer } from 'react-toastify'

import { nodeApi, SwapDetails } from '../../slices/nodeApi/nodeApi.slice'

const StatusToastElement: React.FC<{ swap: SwapDetails }> = ({ swap }) => {
  // make a nice component to display the swap details using tailwind css
  // swap = {
  //  payment_hash: string
  //  status: string
  //  qty_to: number
  //  qty_from: number
  //  to_asset: string
  //  from_asset: string
  // }
  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-bold">Swap Status</div>
        <span className="text-xs font-semibold uppercase">{swap.status}</span>
      </div>

      <div className="border-t border-gray-200 my-2"></div>

      <div className="text-sm">
        <div className="mb-2">
          <span className="font-semibold">Payment Hash:</span>
          <span className="text-gray-600 break-all ml-2">
            {swap.payment_hash}
          </span>
        </div>

        <div className="mb-2">
          <span className="font-semibold">From:</span>
          <span className="text-gray-600 ml-2">
            {swap.qty_from} {swap.from_asset}
          </span>
        </div>

        <div className="mb-2">
          <span className="font-semibold">To:</span>
          <span className="text-gray-600 ml-2">
            {swap.qty_to} {swap.to_asset}
          </span>
        </div>
      </div>
    </>
  )
}

export const StatusToast: React.FC = () => {
  const paymentHashToToastId = useRef<
    Record<string, { id: Id; status: string }>
  >({})

  const { data } = nodeApi.useListSwapsQuery(undefined, {
    pollingInterval: 3000,
  })

  useEffect(() => {
    console.log('Called')
    data?.taker.forEach((swap) => {
      // toast already exists
      if (paymentHashToToastId.current[swap.payment_hash]) {
        // remove from map if swap is not pending anymore
        if (
          paymentHashToToastId.current[swap.payment_hash].status !==
            'Waiting' &&
          paymentHashToToastId.current[swap.payment_hash].status !== 'Pending'
        ) {
          delete paymentHashToToastId.current[swap.payment_hash]
        } else if (
          swap.status !== paymentHashToToastId.current[swap.payment_hash].status
        ) {
          // if status has changed, update toast
          if (swap.status === 'Failed' || swap.status === 'Expired') {
            toast.update(paymentHashToToastId.current[swap.payment_hash].id, {
              autoClose: 5000,
              isLoading: false,
              render: <StatusToastElement swap={swap} />,
              type: 'error',
            })
          } else if (swap.status === 'Succeeded') {
            toast.update(paymentHashToToastId.current[swap.payment_hash].id, {
              autoClose: 5000,
              isLoading: false,
              render: <StatusToastElement swap={swap} />,
              type: 'success',
            })
          } else {
            toast.update(paymentHashToToastId.current[swap.payment_hash].id, {
              render: <StatusToastElement swap={swap} />,
              type: 'default',
            })
          }
          paymentHashToToastId.current[swap.payment_hash].status = swap.status
        }
      } else if (swap.status === 'Waiting' || swap.status === 'Pending') {
        // new toast
        const toastId = toast.loading(<StatusToastElement swap={swap} />, {
          autoClose: false,
          containerId: 'status-toast',
          isLoading: true,
        })
        // insert toast into map
        paymentHashToToastId.current[swap.payment_hash] = {
          id: toastId,
          status: swap.status,
        }
      }
    })
  }, [data])

  // console log when the component is mounted and dismounted
  React.useEffect(() => {
    console.log('--------------StatusToast mounted')
    return () => {
      console.log('--------------StatusToast dismounted')
    }
  }, [])

  return (
    <ToastContainer
      containerId="status-toast"
      enableMultiContainer={true}
      position="bottom-left"
    />
  )
}
