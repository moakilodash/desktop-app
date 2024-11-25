// Step2.tsx - Main deposit component with improved UI
import {
  CircleCheckBig,
  CircleX,
  ArrowRight,
  ArrowLeft,
  Copy,
  Loader,
  Wallet,
  Zap,
  Link as ChainIcon,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

import { useAppSelector } from '../../../../app/store/hooks'
import { BTC_ASSET_ID } from '../../../../constants'
import { nodeApi } from '../../../../slices/nodeApi/nodeApi.slice'

interface Props {
  assetId: string
  onBack: VoidFunction
  onNext: VoidFunction
}

export const Step2 = ({ assetId, onBack, onNext }: Props) => {
  const [network, setNetwork] = useState<'on-chain' | 'lightning'>('on-chain')
  const [address, setAddress] = useState<string>()
  const [loading, setLoading] = useState<boolean>(false)
  const [amount, setAmount] = useState<string>('')

  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)
  const [addressQuery] = nodeApi.endpoints.address.useLazyQuery()
  const [lnInvoice] = nodeApi.endpoints.lnInvoice.useLazyQuery()
  const [rgbInvoice] = nodeApi.endpoints.rgbInvoice.useLazyQuery()

  const { data: invoiceStatus } = nodeApi.useInvoiceStatusQuery(
    { invoice: address as string },
    {
      pollingInterval: 1000,
      skip: !address?.startsWith('ln') || network !== 'lightning',
    }
  )

  // Reset address when switching networks
  useEffect(() => {
    setAddress(undefined)
    setAmount('')
  }, [network])

  // Add new state and query for asset info
  const [assetTicker, setAssetTicker] = useState<string>('')
  const { data: assetList } = nodeApi.endpoints.listAssets.useQuery()

  // Add useEffect to set asset ticker when assetList is loaded
  useEffect(() => {
    if (assetList?.nia && assetId !== BTC_ASSET_ID) {
      const asset = assetList.nia.find((a) => a.asset_id === assetId)
      if (asset) {
        setAssetTicker(asset.ticker)
      }
    }
  }, [assetList, assetId])

  // Add effect to clear address when amount changes for lightning
  useEffect(() => {
    if (network === 'lightning' && address) {
      setAddress(undefined)
    }
  }, [amount, network])

  // Add new state for recipient ID
  const [recipientId, setRecipientId] = useState<string>()

  const generateAddress = async () => {
    setLoading(true)
    try {
      if (network === 'lightning') {
        if (!amount || parseFloat(amount) <= 0) {
          toast.error('Please enter a valid amount')
          setLoading(false)
          return
        }
        const res = await lnInvoice(
          assetId === BTC_ASSET_ID
            ? {
                amt_msat:
                  bitcoinUnit === 'SAT'
                    ? Number(amount) * 1000
                    : Number(amount) * Math.pow(10, 8) * 1000,
              }
            : {
                asset_amount: Number(amount),
                asset_id: assetId,
              }
        )
        if ('error' in res) {
          toast.error('Failed to generate Lightning invoice')
        } else {
          setAddress(res.data?.invoice)
        }
      } else if (assetId !== BTC_ASSET_ID) {
        const res = await rgbInvoice({ asset_id: assetId })
        if ('error' in res) {
          toast.error('Failed to generate RGB invoice')
        } else {
          setAddress(res.data?.invoice)
          setRecipientId(res.data?.recipient_id)
        }
      } else {
        const res = await addressQuery()
        setAddress(res.data?.address)
      }
    } catch (error) {
      toast.error('Failed to generate address')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address ?? '')
      toast.success('Address copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }

  const handleCopyRecipientId = async () => {
    try {
      await navigator.clipboard.writeText(recipientId ?? '')
      toast.success('Recipient ID copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy recipient ID')
    }
  }

  const NetworkOption = ({
    type,
    icon: Icon,
    label,
  }: {
    type: 'on-chain' | 'lightning'
    icon: any
    label: string
  }) => (
    <button
      className={`
        flex-1 py-4 px-6 flex flex-col items-center justify-center gap-2
        rounded-xl transition-all duration-200 border-2
        ${
          network === type
            ? 'bg-blue-500/10 border-blue-500 text-blue-500'
            : 'border-slate-700 hover:border-blue-500/50 text-slate-400 hover:text-blue-500/80'
        }
      `}
      onClick={() => setNetwork(type)}
    >
      <Icon className={`w-6 h-6 ${network === type ? 'animate-pulse' : ''}`} />
      <span className="font-medium">{label}</span>
    </button>
  )

  const getStatusColor = () => {
    if (!invoiceStatus) return 'text-slate-400'
    switch (invoiceStatus.status) {
      case 'Pending':
        return 'text-yellow-500'
      case 'Succeeded':
        return 'text-green-500'
      default:
        return 'text-red-500'
    }
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
      <div className="flex flex-col items-center mb-8">
        <Wallet className="w-12 h-12 text-blue-500 mb-4" />
        <h3 className="text-3xl font-bold text-white mb-2">Fund Your Wallet</h3>
        <p className="text-slate-400 text-center max-w-md">
          Choose your preferred deposit method and follow the steps below
        </p>
      </div>

      <div className="space-y-6">
        {/* Network Selection */}
        <div className="flex gap-4 p-1">
          <NetworkOption icon={ChainIcon} label="On-chain" type="on-chain" />
          <NetworkOption icon={Zap} label="Lightning" type="lightning" />
        </div>

        {/* Amount Input for Lightning */}
        {network === 'lightning' && (
          <div className="space-y-2 animate-fadeIn">
            <label className="text-sm font-medium text-slate-400">Amount</label>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 
                         focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white
                         placeholder:text-slate-600 transition-all duration-200"
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                type="number"
                value={amount}
              />
              <div className="px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 text-slate-400">
                {assetId === BTC_ASSET_ID ? bitcoinUnit : assetTicker}
              </div>
            </div>
          </div>
        )}

        {/* Generate Button or Address Display */}
        {!address ? (
          <button
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900
                     text-white rounded-xl font-medium transition-all duration-200 
                     flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            disabled={loading || (network === 'lightning' && !amount)}
            onClick={generateAddress}
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>
                  Generate {network === 'lightning' ? 'Invoice' : 'Address'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Payment Status */}
            {invoiceStatus && (
              <div
                className={`flex items-center justify-center gap-2 ${getStatusColor()}`}
              >
                {invoiceStatus.status === 'Pending' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Waiting for payment...</span>
                  </>
                ) : invoiceStatus.status === 'Succeeded' ? (
                  <>
                    <CircleCheckBig className="w-5 h-5" />
                    <span>Payment received!</span>
                  </>
                ) : (
                  <>
                    <CircleX className="w-5 h-5" />
                    <span>{invoiceStatus.status}</span>
                  </>
                )}
              </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-6 bg-white rounded-2xl shadow-xl">
                <QRCodeCanvas
                  includeMargin={true}
                  level="H"
                  size={200}
                  value={address}
                />
              </div>
            </div>

            {/* Address Display */}
            <div
              className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 
                          flex items-center justify-between group hover:border-blue-500/50 
                          transition-all duration-200"
            >
              <div className="truncate flex-1 text-slate-300 font-mono text-sm">
                {address.length > 45 ? `${address.slice(0, 42)}...` : address}
              </div>
              <button
                className="ml-2 p-2 hover:bg-blue-500/10 rounded-lg transition-colors
                         text-slate-400 hover:text-blue-500"
                onClick={handleCopy}
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient ID Display for Assets */}
            {assetId !== BTC_ASSET_ID && recipientId && (
              <div
                className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 
                            flex items-center justify-between group hover:border-blue-500/50 
                            transition-all duration-200"
              >
                <div className="truncate flex-1 text-slate-300 font-mono text-sm">
                  <span className="text-slate-400 mr-2">Recipient ID:</span>
                  {recipientId.length > 45
                    ? `${recipientId.slice(0, 42)}...`
                    : recipientId}
                </div>
                <button
                  className="ml-2 p-2 hover:bg-blue-500/10 rounded-lg transition-colors
                           text-slate-400 hover:text-blue-500"
                  onClick={handleCopyRecipientId}
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <button
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors 
                     flex items-center gap-2 hover:bg-slate-800/50 rounded-lg"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                     transition-colors flex items-center gap-2"
            onClick={onNext}
          >
            <span>Finish</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
