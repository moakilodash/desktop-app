import QRCode from 'qrcode.react'
import { useState, useCallback } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { ClipLoader } from 'react-spinners'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface OrderPayment {
  bolt11?: {
    invoice: string
    order_total_sat: number
    fee_total_sat: number
    state: string
    expires_at: string
  }
  onchain?: {
    address: string
    order_total_sat: number
    fee_total_sat: number
    state: string
    expires_at: string
    min_onchain_payment_confirmations: number
    min_fee_for_0conf: number
  }
}

interface Order {
  order_id: string
  lsp_balance_sat: number
  client_balance_sat: number
  channel_expiry_blocks: number
  announce_channel: boolean
  asset_id?: string
  lsp_asset_amount?: number
  client_asset_amount?: number
  payment: OrderPayment
}

interface StepProps {
  onBack: () => void
  loading: boolean
  order: Order | null
}

export const Step3: React.FC<StepProps> = ({ onBack, loading, order }) => {
  const [paymentMethod, setPaymentMethod] = useState<'lightning' | 'onchain'>(
    'lightning'
  )

  const handleCopy = useCallback(() => {
    toast.success('Payment details copied to clipboard!')
  }, [])

  if (loading || !order) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-800 text-white">
        <ClipLoader color={'#123abc'} loading={true} size={50} />
        <span className="ml-4">Loading order details...</span>
      </div>
    )
  }

  if (!order.payment || (!order.payment.bolt11 && !order.payment.onchain)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white">
        <h3 className="text-2xl font-semibold mb-4">
          Error: Invalid order data
        </h3>
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
          onClick={onBack}
        >
          Back
        </button>
      </div>
    )
  }

  const totalAmount = order.payment.onchain
    ? order.payment.onchain.order_total_sat / 100000000
    : order.payment?.bolt11.order_total_sat / 100000000

  const paymentURI =
    paymentMethod === 'lightning'
      ? `lightning:${order.payment.bolt11?.invoice}`
      : `bitcoin:${order.payment.onchain?.address}?amount=${totalAmount}`

  const currentPayment =
    paymentMethod === 'lightning' ? order.payment.bolt11 : order.payment.onchain

  const totalCapacity = order.lsp_balance_sat + order.client_balance_sat
  const totalAssetAmount =
    (order.lsp_asset_amount || 0) + (order.client_asset_amount || 0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white p-4">
      <div className="w-full max-w-3xl">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Channel Order Details
        </h2>

        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Order Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <span className="font-semibold">Order ID:</span>{' '}
                {order.order_id}
              </p>
              <p>
                <span className="font-semibold">Total Capacity:</span>{' '}
                {totalCapacity.toLocaleString()} sats
              </p>
            </div>
            <div>
              <p>
                <span className="font-semibold">Channel Expiry:</span>{' '}
                {order.channel_expiry_blocks} blocks
              </p>
              <p>
                <span className="font-semibold">Announce Channel:</span>{' '}
                {order.announce_channel ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          {order.asset_id && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Asset Information</h4>
              <p>
                <span className="font-semibold">Asset ID:</span>{' '}
                {order.asset_id}
              </p>
              <p>
                <span className="font-semibold">Total Asset Amount:</span>{' '}
                {totalAssetAmount.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Payment Details</h3>
          <div className="flex justify-center mb-4">
            <button
              className={`px-4 py-2 ${paymentMethod === 'lightning' ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-300'} rounded-l-lg focus:outline-none`}
              onClick={() => setPaymentMethod('lightning')}
            >
              Lightning
            </button>
            <button
              className={`px-4 py-2 ${paymentMethod === 'onchain' ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-300'} rounded-r-lg focus:outline-none`}
              onClick={() => setPaymentMethod('onchain')}
            >
              On-chain
            </button>
          </div>
          <div className="flex flex-col items-center mb-4">
            <QRCode size={200} value={paymentURI} />
            <div className="mt-2">
              <CopyToClipboard
                onCopy={handleCopy}
                text={
                  paymentMethod === 'lightning'
                    ? order.payment.bolt11.invoice
                    : order.payment.onchain.address
                }
              >
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none">
                  Copy {paymentMethod === 'lightning' ? 'Invoice' : 'Address'}
                </button>
              </CopyToClipboard>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <span className="font-semibold">Amount:</span>{' '}
                {(currentPayment.order_total_sat / 100000000).toFixed(8)} BTC
              </p>
              <p>
                <span className="font-semibold">Fee:</span>{' '}
                {(currentPayment.fee_total_sat / 100000000).toFixed(8)} BTC
              </p>
              <p>
                <span className="font-semibold">Total:</span>{' '}
                {(
                  (currentPayment.order_total_sat +
                    currentPayment.fee_total_sat) /
                  100000000
                ).toFixed(8)}{' '}
                BTC
              </p>
            </div>
            <div>
              <p>
                <span className="font-semibold">Payment State:</span>{' '}
                {currentPayment.state}
              </p>
              <p>
                <span className="font-semibold">Expires at:</span>{' '}
                {new Date(currentPayment.expires_at).toLocaleString()}
              </p>
              {paymentMethod === 'onchain' && (
                <>
                  <p>
                    <span className="font-semibold">Min Confirmations:</span>{' '}
                    {order.payment.onchain.min_onchain_payment_confirmations}
                  </p>
                  <p>
                    <span className="font-semibold">Min Fee for 0-conf:</span>{' '}
                    {(
                      order.payment.onchain.min_fee_for_0conf / 100000000
                    ).toFixed(8)}{' '}
                    BTC
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
