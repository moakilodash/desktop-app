import React, { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { ToastContainer, toast, Slide } from 'react-toastify'

import { useAppDispatch } from '../../app/store/hooks'
import { makerApi } from '../../slices/makerApi/makerApi.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { Step3 } from './Step3'
import 'react-toastify/dist/ReactToastify.css'

export const Component = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const [nodeInfoRequest] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [createOrderRequest, createOrderResponse] =
    makerApi.endpoints.create_order.useLazyQuery()
  const [getOrderRequest, getOrderResponse] =
    makerApi.endpoints.get_order.useLazyQuery()
  const [paymentStatus, setPaymentStatus] = useState<
    'success' | 'error' | null
  >(null)

  useEffect(() => {
    if (orderId) {
      const id = toast.info('Waiting for payment...', {
        autoClose: false,
        transition: Slide,
      })

      const intervalId = setInterval(async () => {
        const orderResponse = await getOrderRequest({ order_id: orderId })
        if (orderResponse.data?.order_state === 'COMPLETED') {
          toast.update(id, {
            autoClose: 5000,
            render: 'Payment completed. Channel is being set up.',
            transition: Slide,
            type: toast.TYPE.SUCCESS,
          })
          clearInterval(intervalId)
          setPaymentStatus('success')
          setStep(3)
        } else if (orderResponse.data?.order_state === 'FAILED') {
          toast.update(id, {
            autoClose: 5000,
            render: 'Payment failed. Please try again.',
            transition: Slide,
            type: toast.TYPE.ERROR,
          })
          clearInterval(intervalId)
          setPaymentStatus('error')
          setStep(3)
        }
      }, 5000)

      return () => {
        clearInterval(intervalId)
        toast.dismiss(id)
      }
    }
  }, [orderId, getOrderRequest])

  const onSubmitStep1 = useCallback(
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
      // TODO: Update url and port with the actual values (TOR address)
      const payload: any = {
        announce_channel: true,
        channel_expiry_blocks: channelExpireBlocks,
        client_balance_sat: clientBalanceSat,
        client_connection_url: `${clientPubKey}@kaleidoswap-node:9735`,
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
        // toast error the message
        const message = `Error ${channelResponse.error?.status}: ${channelResponse.error?.data.detail}`
        toast.error(message, { autoClose: 5000, transition: Slide })
        console.error(channelResponse.error)
        return
      } else {
        console.log('Request of channel created successfully!')
        console.log(channelResponse.data)
        const orderId: string = channelResponse.data?.order_id || ''
        if (!orderId) {
          console.error('Could not get order id')
          return
        }
        setOrderId(orderId)
        setStep(2)
      }
    },
    [createOrderRequest, nodeInfoRequest]
  )

  const onStep2Back = useCallback(() => {
    setStep(1)
  }, [])

  return (
    <div className="max-w-screen-lg w-full bg-blue-dark py-8 rounded px-14 pt-20 pb-8 relative">
      {loading && (
        <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <ClipLoader color={'#123abc'} loading={loading} size={50} />
        </div>
      )}
      <div className={step !== 1 ? 'hidden' : ''}>
        <Step1 onNext={onSubmitStep1} />
      </div>

      <div className={step !== 2 ? 'hidden' : ''}>
        <Step2
          loading={getOrderResponse.isLoading}
          onBack={onStep2Back}
          order={createOrderResponse.data}
        />
      </div>

      <div className={step !== 3 ? 'hidden' : ''}>
        <Step3 paymentStatus={paymentStatus} />
      </div>

      <ToastContainer />
    </div>
  )
}
