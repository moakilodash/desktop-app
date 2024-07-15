import QRCode from 'qrcode.react'
import { useState, useCallback } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { ClipLoader } from 'react-spinners'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface Props {
  onBack: VoidFunction
  loading: boolean
  order: any
}

export const Step2 = (props: Props) => {
  const [paymentMethod, setPaymentMethod] = useState('lightning')
  const { onBack, loading, order } = props

  const paymentURI =
    paymentMethod === 'lightning'
      ? `lightning:${order?.payment?.bolt11_invoice}`
      : `bitcoin:${order?.payment?.onchain_address}?amount=${order?.payment?.order_total_sat / 100000000}`

  const handleCopy = useCallback(() => {
    toast.success('Invoice copied to clipboard!')
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white">
      <div className="text-center mt-6">
        <h3 className="text-2xl font-semibold mb-4">
          Pay for the requested channel
        </h3>
        <div className="flex justify-center mb-4">
          <button
            className={`px-4 py-2 ${paymentMethod === 'lightning' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'} rounded-l-lg focus:outline-none`}
            onClick={() => setPaymentMethod('lightning')}
          >
            Lightning
          </button>
          <button
            className={`px-4 py-2 ${paymentMethod === 'onchain' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'} rounded-r-lg focus:outline-none`}
            onClick={() => setPaymentMethod('onchain')}
          >
            On-chain
          </button>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <ClipLoader color={'#123abc'} loading={loading} size={50} />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <QRCode size={256} value={paymentURI} />
              <div className="mt-2 flex items-center space-x-2">
                <CopyToClipboard
                  onCopy={handleCopy}
                  text={
                    paymentMethod === 'lightning'
                      ? order?.payment?.bolt11_invoice
                      : order?.payment?.onchain_address
                  }
                >
                  <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none">
                    Copy Invoice
                  </button>
                </CopyToClipboard>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 bg-gray-700 p-4 rounded shadow-lg max-w-md mx-auto">
          <h4 className="text-xl mb-2">Payment Recap</h4>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>
              {(order?.payment?.order_total_sat / 100000000).toFixed(8)} BTC
            </span>
          </div>
          <div className="flex justify-between">
            <span>Fee:</span>
            <span>
              {(order?.payment?.fee_total_sat / 100000000).toFixed(8)} BTC
            </span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>
              {(
                (order?.payment?.order_total_sat +
                  order?.payment?.fee_total_sat) /
                100000000
              ).toFixed(8)}{' '}
              BTC
            </span>
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-20 space-x-4">
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
          onClick={onBack}
        >
          Back
        </button>
      </div>
      <ToastContainer />
    </div>
  )
}
