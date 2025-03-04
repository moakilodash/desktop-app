import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { useCallback, useState, useEffect, useRef } from 'react'
import { ClipLoader } from 'react-spinners'
import { toast } from 'react-toastify'

import { MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY } from '../../constants'
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

// Define the asset interface
interface AssetInfo {
  name: string
  ticker: string
  asset_id: string
  precision: number
  min_initial_client_amount: number
  max_initial_client_amount: number
  min_initial_lsp_amount: number
  max_initial_lsp_amount: number
  min_channel_amount: number
  max_channel_amount: number
}

export const Component = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [showBackConfirmation, setShowBackConfirmation] = useState(false)

  const [nodeInfoRequest] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [addressRequest] = nodeApi.endpoints.address.useLazyQuery()
  const [createOrderRequest, createOrderResponse] =
    makerApi.endpoints.create_order.useLazyQuery()
  const [getOrderRequest, getOrderResponse] =
    makerApi.endpoints.get_order.useLazyQuery()
  const [getInfoRequest] = makerApi.endpoints.get_info.useLazyQuery()
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
      try {
        // Get node info and refund address
        const clientPubKey = (await nodeInfoRequest()).data?.pubkey
        const addressRefund = (await addressRequest()).data?.address

        if (!clientPubKey) {
          throw new Error('Could not get client pubkey')
        }
        if (!addressRefund) {
          throw new Error('Could not get refund address')
        }
        if (!data) {
          throw new Error('Form data is incomplete or missing')
        }

        const {
          capacitySat,
          clientBalanceSat,
          assetId,
          assetAmount,
          channelExpireBlocks,
        } = data

        // Get LSP info to validate against constraints
        const infoResponse = await getInfoRequest()
        const lspOptions = infoResponse.data?.options
        let assets: AssetInfo[] = []

        // Safely extract assets array
        if (
          infoResponse.data?.assets &&
          Array.isArray(infoResponse.data.assets)
        ) {
          assets = infoResponse.data.assets as AssetInfo[]
        }

        // Validate channel capacity
        if (lspOptions) {
          // Calculate effective min/max capacity
          const effectiveMinCapacity = Math.max(
            MIN_CHANNEL_CAPACITY,
            lspOptions.min_channel_balance_sat
          )
          const effectiveMaxCapacity = Math.min(
            MAX_CHANNEL_CAPACITY,
            lspOptions.max_channel_balance_sat
          )

          if (capacitySat < effectiveMinCapacity) {
            throw new Error(
              `Channel capacity must be at least ${effectiveMinCapacity.toLocaleString()} sats`
            )
          }
          if (capacitySat > effectiveMaxCapacity) {
            throw new Error(
              `Channel capacity cannot exceed ${effectiveMaxCapacity.toLocaleString()} sats`
            )
          }
        }

        // Validate client balance
        if (lspOptions) {
          if (clientBalanceSat < lspOptions.min_initial_client_balance_sat) {
            throw new Error(
              `Your channel liquidity must be at least ${lspOptions.min_initial_client_balance_sat} sats`
            )
          }
          if (clientBalanceSat > lspOptions.max_initial_client_balance_sat) {
            throw new Error(
              `Your channel liquidity cannot exceed ${lspOptions.max_initial_client_balance_sat} sats`
            )
          }
        }

        if (clientBalanceSat > capacitySat) {
          throw new Error('Client balance cannot be greater than capacity')
        }

        // Validate channel expiry
        if (
          lspOptions &&
          channelExpireBlocks > lspOptions.max_channel_expiry_blocks
        ) {
          throw new Error(
            `Channel expiry cannot exceed ${lspOptions.max_channel_expiry_blocks} blocks`
          )
        }

        // Validate asset amount if an asset is selected
        if (assetId && assetAmount) {
          const selectedAsset = assets.find(
            (asset: AssetInfo) => asset.asset_id === assetId
          )
          if (selectedAsset) {
            if (assetAmount < selectedAsset.min_channel_amount) {
              throw new Error(
                `Asset amount must be at least ${selectedAsset.min_channel_amount / Math.pow(10, selectedAsset.precision)} ${selectedAsset.ticker}`
              )
            }
            if (assetAmount > selectedAsset.max_channel_amount) {
              throw new Error(
                `Asset amount cannot exceed ${selectedAsset.max_channel_amount / Math.pow(10, selectedAsset.precision)} ${selectedAsset.ticker}`
              )
            }
          }
        }

        const payload: any = {
          announce_channel: true,
          channel_expiry_blocks: channelExpireBlocks,
          client_balance_sat: clientBalanceSat,
          client_pubkey: clientPubKey,
          funding_confirms_within_blocks:
            lspOptions?.min_funding_confirms_within_blocks || 1,
          lsp_balance_sat: capacitySat - clientBalanceSat,
          refund_onchain_address: addressRefund,
          required_channel_confirmations:
            lspOptions?.min_required_channel_confirmations || 3,
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

        if (channelResponse.error) {
          let errorMessage = 'An error occurred'
          if ('status' in channelResponse.error) {
            const fetchError = channelResponse.error as FetchBaseQueryError
            errorMessage = `Error ${fetchError.status}: ${JSON.stringify(fetchError.data)}`
          } else {
            errorMessage = channelResponse.error.message || errorMessage
          }
          throw new Error(errorMessage)
        } else {
          console.log('Request of channel created successfully!')
          console.log('Response:', channelResponse.data)
          const orderId: string = channelResponse.data?.order_id || ''
          if (!orderId) {
            throw new Error('Could not get order id')
          }
          setOrderId(orderId)
          setStep(3)
        }
      } catch (error) {
        console.error('Error creating channel order:', error)
        toast.error(
          error instanceof Error
            ? error.message
            : 'An error occurred while creating the channel order',
          {
            autoClose: 5000,
            position: 'bottom-right',
          }
        )
      } finally {
        setLoading(false)
      }
    },
    [createOrderRequest, nodeInfoRequest, addressRequest, getInfoRequest]
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
        <Step4
          orderId={orderId ?? undefined}
          paymentStatus={paymentStatus ?? ''}
        />
      </div>
    </div>
  )
}
