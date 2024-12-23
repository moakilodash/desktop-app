import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { useCallback, useState, useEffect, useRef } from 'react'
import { ClipLoader } from 'react-spinners'
import { toast } from 'react-toastify'

import {
  makerApi,
  Lsps1CreateOrderResponse,
} from '../../slices/makerApi/makerApi.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { Step3 } from './Step3'
import { Step4 } from './Step4'
import 'react-toastify/dist/ReactToastify.css'

export const Component = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [showBackConfirmation, setShowBackConfirmation] = useState(false)

  const [nodeInfoRequest] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [createOrderRequest, createOrderResponse] =
    makerApi.endpoints.create_order.useLazyQuery()
  const [getOrderRequest, getOrderResponse] =
    makerApi.endpoints.get_order.useLazyQuery()
  const [paymentStatus, setPaymentStatus] = useState<
    'success' | 'error' | null
  >(null)

  const toastIdRef = useRef<string | number | null>(null)

  useEffect(() => {
    return () => {
      toast.dismiss()
    }
  }, [])

  useEffect(() => {
    if (orderId && step === 3) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
      }

      toastIdRef.current = toast.loading('Waiting for payment...', {
        position: 'bottom-right',
      })

      const intervalId = setInterval(async () => {
        const orderResponse = await getOrderRequest({ order_id: orderId })

        if (orderResponse.data?.order_state === 'COMPLETED') {
          clearInterval(intervalId)
          setPaymentStatus('success')
          setStep(4)
          if (toastIdRef.current) {
            toast.update(toastIdRef.current, {
              autoClose: 5000,
              isLoading: false,
              render: 'Payment completed. Channel is being set up.',
              type: 'success',
            })
          }
        } else if (orderResponse.data?.order_state === 'FAILED') {
          clearInterval(intervalId)
          setPaymentStatus('error')
          setStep(4)
          if (toastIdRef.current) {
            toast.update(toastIdRef.current, {
              autoClose: 5000,
              isLoading: false,
              render: 'Payment failed. Please try again.',
              type: 'error',
            })
          }
        }
      }, 5000)

      return () => {
        clearInterval(intervalId)
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current)
        }
      }
    }
  }, [orderId, getOrderRequest, step])

  const onSubmitStep1 = useCallback(
    async (data: { connectionUrl: string; success: boolean }) => {
      console.log('Step 1 submitted:', data)
      if (data.success) {
        setStep(2)
      } else {
        toast.error('Failed to connect to LSP. Please try again.', {
          autoClose: 5000,
          position: 'bottom-right',
        })
      }
    },
    []
  )

  const onSubmitStep2 = useCallback(
    async (data: any) => {
      setLoading(true)
      const clientPubKey = (await nodeInfoRequest()).data?.pubkey
      if (!clientPubKey) {
        console.error('Could not get client pubkey')
        setLoading(false)
        return
      }
      if (!data) {
        console.error('Form data is incomplete or missing')
        setLoading(false)
        return
      }

      const {
        capacitySat,
        clientBalanceSat,
        assetId,
        assetAmount,
        channelExpireBlocks,
      } = data

      if (clientBalanceSat > capacitySat) {
        console.error('Client balance cannot be greater than capacity')
        setLoading(false)
        return
      }

      const payload: any = {
        announce_channel: true,
        channel_expiry_blocks: channelExpireBlocks,
        client_balance_sat: clientBalanceSat,
        client_pubkey: clientPubKey,
        funding_confirms_within_blocks: 1,
        lsp_balance_sat: capacitySat - clientBalanceSat,
        required_channel_confirmations: 3,
      }
      if (assetId && assetAmount) {
        payload.asset_id = assetId
        payload.lsp_asset_amount = assetAmount
        payload.client_asset_amount = 0
      }
      // log the payload for the request
      console.log(
        `Payload for create order request: ${JSON.stringify(payload)}`
      )
      const channelResponse = await createOrderRequest(payload)
      setLoading(false)
      if (channelResponse.error) {
        let errorMessage = 'An error occurred'
        if ('status' in channelResponse.error) {
          const fetchError = channelResponse.error as FetchBaseQueryError
          errorMessage = `Error ${fetchError.status}: ${JSON.stringify(fetchError.data)}`
        } else {
          errorMessage = channelResponse.error.message || errorMessage
        }
        toast.error(errorMessage, {
          autoClose: 5000,
          position: 'bottom-right',
        })
        return
      } else {
        console.log('Request of channel created successfully!')
        console.log('Response:', channelResponse.data)
        const orderId: string = channelResponse.data?.order_id || ''
        if (!orderId) {
          console.error('Could not get order id')
          return
        }
        setOrderId(orderId)
        setStep(3)
      }
    },
    [createOrderRequest, nodeInfoRequest]
  )

  const onStepBack = useCallback(() => {
    if (step === 3) {
      setShowBackConfirmation(true)
    } else {
      setStep(
        (prevStep) => (prevStep > 1 ? prevStep - 1 : prevStep) as 1 | 2 | 3 | 4
      )
    }
  }, [step])

  const handleConfirmBack = useCallback(() => {
    setShowBackConfirmation(false)
    setOrderId(null)
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current)
    }
    setStep(2)
  }, [])

  const BackConfirmationModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setShowBackConfirmation(false)}
      />
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full relative z-10">
        <h3 className="text-xl font-bold text-white mb-4">
          Are you sure you want to go back?
        </h3>
        <p className="text-gray-300 mb-6">
          Going back will cancel your current order. You'll need to create a new
          order if you want to proceed later.
        </p>
        <div className="flex gap-4">
          <button
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            onClick={() => setShowBackConfirmation(false)}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={handleConfirmBack}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-screen-lg w-full bg-blue-dark py-8 rounded px-14 pt-20 pb-8 relative">
      {loading && (
        <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <ClipLoader color={'#123abc'} loading={loading} size={50} />
        </div>
      )}
      {showBackConfirmation && <BackConfirmationModal />}
      <div className={step !== 1 ? 'hidden' : ''}>
        <Step1 onNext={onSubmitStep1} />
      </div>

      <div className={step !== 2 ? 'hidden' : ''}>
        <Step2 onBack={onStepBack} onNext={onSubmitStep2} />
      </div>

      <div className={step !== 3 ? 'hidden' : ''}>
        <Step3
          loading={getOrderResponse.isLoading}
          onBack={onStepBack}
          order={(createOrderResponse.data as Lsps1CreateOrderResponse) || null}
        />
      </div>

      <div className={step !== 4 ? 'hidden' : ''}>
        <Step4 paymentStatus={paymentStatus ?? ''} />
      </div>
    </div>
  )
}
