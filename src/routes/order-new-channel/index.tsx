import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { /*React,*/ useCallback, useState, useEffect } from 'react'
//import { useNavigate } from 'react-router-dom';
//import { TRADE_PATH } from '../../app/router/paths';
import { ClipLoader } from 'react-spinners'
import { ToastContainer, toast, Slide } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  channelSliceActions,
  channelSliceSelectors,
} from '../../slices/channel/channel.slice'
import {
  makerApi,
  Lsps1CreateOrderRequest,
} from '../../slices/makerApi/makerApi.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { Step3 } from './Step3'
import 'react-toastify/dist/ReactToastify.css'

export const Component = () => {
  const dispatch = useAppDispatch()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  //const navigate = useNavigate();

  const [nodeInfoRequest] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [createOrderRequest, createOrderResponse] =
    makerApi.endpoints.create_order.useLazyQuery()
  const [getOrderRequest, getOrderResponse] =
    makerApi.endpoints.get_order.useLazyQuery()
  //const [getInfoRequest, getInfoResponse] = makerApi.endpoints.get_info.useLazyQuery();
  const [paymentStatus, setPaymentStatus] = useState<
    'success' | 'error' | null
  >(null)

  const channelRequestForm = useAppSelector((state) =>
    channelSliceSelectors.form(state, 'request')
  )

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

  const onSubmitStep1 = useCallback(async () => {
    setLoading(true)
    const clientPubKey = (await nodeInfoRequest()).data?.pubkey
    if (!clientPubKey) {
      console.error('Could not get client pubkey')
      setLoading(false)
      return
    }

    const { capacitySat, assetId, assetAmount } = channelRequestForm
    const clientBalanceSat =
      'clientBalanceSat' in channelRequestForm
        ? channelRequestForm.clientBalanceSat
        : 0
    const channelExpireBlocks =
      'channelExpireBlocks' in channelRequestForm
        ? channelRequestForm.channelExpireBlocks
        : 0

    if (clientBalanceSat > capacitySat) {
      console.error('Client balance cannot be greater than capacity')
      setLoading(false)
      return
    }

    const payload: Lsps1CreateOrderRequest = {
      announce_channel: true,
      channel_expiry_blocks: channelExpireBlocks,
      client_balance_sat: clientBalanceSat,
      client_connection_url: `${clientPubKey}@kaleidoswap-node:9735`,
      funding_confirms_within_blocks: 1,
      lsp_balance_sat: capacitySat - clientBalanceSat,
      required_channel_confirmations: 3,
      ...(assetId && assetAmount
        ? {
            asset_id: assetId,
            client_asset_amount: 0,
            lsp_asset_amount: assetAmount,
          }
        : {}),
    }

    // log the payload for the request
    console.log(`Payload for create order request: ${JSON.stringify(payload)}`)
    const channelResponse = await createOrderRequest(payload)
    setLoading(false)

    if (channelResponse.error) {
      let message: string

      if ('status' in channelResponse.error) {
        const err = channelResponse.error as FetchBaseQueryError

        // Checks whether `data` is an object with `detail`
        if (err.data && typeof err.data === 'object' && 'detail' in err.data) {
          const detail = (err.data as { detail?: string }).detail
          message = `Error ${err.status}: ${detail || 'Unknown error'}`
        } else {
          message = `Error ${err.status}: Unknown error`
        }
      } else {
        const err = channelResponse.error as Error
        message = `Error: ${err.message || 'Unknown error'}`
      }

      // toast error the message
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
  }, [channelRequestForm, createOrderRequest, nodeInfoRequest])

  const onStep1Back = useCallback(() => {
    // Logic to go back from step 1
    console.log('Tornando indietro dallo step 1')
    // You can also reset states or perform other actions here
  }, [])

  const onStep2Back = useCallback(() => {
    dispatch(
      channelSliceActions.setChannelRequestForm({
        ...channelRequestForm,
      })
    )
    setStep(1)
  }, [dispatch, channelRequestForm])

  return (
    <div className="max-w-screen-lg w-full bg-blue-dark py-8 rounded px-14 pt-20 pb-8 relative">
      {loading && (
        <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <ClipLoader color={'#123abc'} loading={loading} size={50} />
        </div>
      )}
      <div className={step !== 1 ? 'hidden' : ''}>
        <Step1 error={''} onBack={onStep1Back} onNext={onSubmitStep1} />
      </div>

      <div className={step !== 2 ? 'hidden' : ''}>
        <Step2
          loading={getOrderResponse.isLoading}
          onBack={onStep2Back}
          order={createOrderResponse.data}
        />
      </div>

      <div className={step !== 3 ? 'hidden' : ''}>
        <Step3 paymentStatus={paymentStatus ?? ''} />
      </div>

      <ToastContainer />
    </div>
  )
}
