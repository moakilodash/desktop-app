import { openUrl } from '@tauri-apps/plugin-opener'
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
  AlertTriangle,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

import { useAppSelector } from '../../../../app/store/hooks'
import btcLogo from '../../../../assets/bitcoin-logo.svg'
import rgbLogo from '../../../../assets/rgb-symbol-color.svg'
import { CreateUTXOModal } from '../../../../components/CreateUTXOModal'
import { BTC_ASSET_ID } from '../../../../constants'
import { useUtxoErrorHandler } from '../../../../hooks/useUtxoErrorHandler'
import { nodeApi, Network } from '../../../../slices/nodeApi/nodeApi.slice'

interface Props {
  assetId?: string
  onBack: VoidFunction
  onNext: VoidFunction
}

export const Step2 = ({ assetId, onBack, onNext }: Props) => {
  const [network, setNetwork] = useState<'on-chain' | 'lightning'>('on-chain')
  const [address, setAddress] = useState<string>()
  const [loading, setLoading] = useState<boolean>(false)
  const [amount, setAmount] = useState<string>('')
  const [noColorableUtxos, setNoColorableUtxos] = useState<boolean>(false)

  const { showUtxoModal, setShowUtxoModal, utxoModalProps, handleApiError } =
    useUtxoErrorHandler()

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
    setNoColorableUtxos(false)
  }, [network])

  const [assetTicker, setAssetTicker] = useState<string>('')
  const [assetName, setAssetName] = useState<string>('')
  const { data: assetList } = nodeApi.endpoints.listAssets.useQuery()

  useEffect(() => {
    if (assetList?.nia && assetId !== BTC_ASSET_ID && assetId) {
      const asset = assetList.nia.find((a) => a.asset_id === assetId)
      if (asset) {
        setAssetTicker(asset.ticker)
        setAssetName(asset.name)
      }
    } else if (assetId === BTC_ASSET_ID) {
      setAssetTicker('BTC')
      setAssetName('Bitcoin')
    }
  }, [assetList, assetId])

  useEffect(() => {
    if (network === 'lightning' && address) {
      setAddress(undefined)
    }
  }, [amount, network])

  const [recipientId, setRecipientId] = useState<string>()

  // Add network info query
  const { data: networkInfo } = nodeApi.endpoints.networkInfo.useQuery()

  // Function to render faucet suggestion
  const renderFaucetSuggestion = () => {
    if (!networkInfo || networkInfo.network === Network.Mainnet) return null

    let faucetInfo = {
      description: '',
      link: '',
      linkText: '',
      title: '',
    }

    switch (networkInfo.network) {
      case Network.Signet:
        faucetInfo = {
          description:
            'Get test coins from the Mutinynet faucet to try out the application.',
          link: 'https://faucet.mutinynet.com/',
          linkText: 'Visit Mutinynet Faucet',
          title: 'Mutinynet Faucet Available',
        }
        break
      case Network.Regtest:
        faucetInfo = {
          description:
            'Get test coins from the RGB Tools Telegram bot to try out the application.',
          link: 'https://t.me/rgb_lightning_bot',
          linkText: 'Open RGB Tools Bot',
          title: 'RGB Tools Bot Available',
        }
        break
      case Network.Testnet:
        faucetInfo = {
          description:
            'Get test coins from a Bitcoin testnet faucet to try out the application.',
          link: 'https://faucet.mutinynet.com/',
          linkText: 'Visit Testnet Faucet',
          title: 'Testnet Faucet Available',
        }
        break
    }

    return (
      <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
        <h4 className="text-green-400 font-medium mb-2">{faucetInfo.title}</h4>
        <p className="text-green-300/80 text-sm mb-3">
          {faucetInfo.description}
        </p>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 
                   hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm"
          onClick={() => {
            openUrl(faucetInfo.link)
          }}
        >
          <ArrowRight className="w-4 h-4" />
          {faucetInfo.linkText}
        </button>
      </div>
    )
  }

  const generateRgbInvoice = async () => {
    try {
      const res = await rgbInvoice(assetId ? { asset_id: assetId } : {})
      setNoColorableUtxos(false)
      if ('error' in res && res.error) {
        const errorMessage =
          'data' in res.error ? res.error.data?.error : 'Unknown error'

        // Check if this is a UTXO-related error
        const wasHandled = handleApiError(
          res.error,
          'issuance',
          0,
          generateRgbInvoice
        )

        if (!wasHandled) {
          // Check specifically for no colorable UTXOs error to show our custom message
          if (errorMessage.includes('No uncolored UTXOs are available')) {
            setNoColorableUtxos(true)
          } else {
            toast.error('Failed to generate RGB invoice: ' + errorMessage)
          }
        }
      } else {
        setAddress(res.data?.invoice)
        setRecipientId(res.data?.recipient_id)
      }
    } catch (error) {
      toast.error('Failed to generate RGB invoice')
    }
  }

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
      } else if (!assetId || assetId !== BTC_ASSET_ID) {
        await generateRgbInvoice()
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
  }) => {
    const isDisabled = type === 'lightning' && !assetId

    return (
      <button
        className={`
          flex-1 py-4 px-6 flex flex-col items-center justify-center gap-2
          rounded-xl transition-all duration-200 border-2
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${
            network === type
              ? 'bg-blue-500/10 border-blue-500 text-blue-500'
              : 'border-slate-700 hover:border-blue-500/50 text-slate-400 hover:text-blue-500/80'
          }
        `}
        disabled={isDisabled}
        onClick={() => !isDisabled && setNetwork(type)}
      >
        <Icon
          className={`w-6 h-6 ${network === type ? 'animate-pulse' : ''}`}
        />
        <span className="font-medium">{label}</span>
        {isDisabled && (
          <span className="text-xs text-slate-500">Requires asset ID</span>
        )}
      </button>
    )
  }

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
        {/* Display selected asset icon */}
        {assetId === BTC_ASSET_ID ? (
          <img alt="Bitcoin" className="w-12 h-12 mb-4" src={btcLogo} />
        ) : (
          <img alt="RGB Asset" className="w-12 h-12 mb-4" src={rgbLogo} />
        )}

        {/* Show the asset name and ticker prominently */}
        <h3 className="text-3xl font-bold text-white mb-2">
          {assetId
            ? assetTicker
              ? `Deposit ${assetTicker}`
              : 'Deposit Asset'
            : 'Deposit Any RGB Asset'}
        </h3>

        {assetName && <div className="text-slate-400 mb-2">{assetName}</div>}

        {assetId && assetId !== BTC_ASSET_ID && (
          <div className="text-xs text-slate-500 mt-1 bg-slate-800 px-3 py-1 rounded-full">
            {assetId.slice(0, 10)}...{assetId.slice(-10)}
          </div>
        )}

        <p className="text-slate-400 text-center max-w-md mt-4">
          Choose your preferred deposit method and follow the steps below
        </p>
      </div>

      <div className="space-y-6">
        {/* Show network info and faucet suggestion if on test network */}
        {networkInfo && networkInfo.network !== Network.Mainnet && (
          <div className="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-blue-400 text-sm flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500/20 text-xs font-medium">
                {networkInfo.network}
              </span>
              You are connected to {networkInfo.network}. Use test coins for
              experimenting.
            </p>
          </div>
        )}

        {/* Render faucet suggestion */}
        {renderFaucetSuggestion()}

        {/* No Colorable UTXOs Warning */}
        {noColorableUtxos && (
          <div className="mb-6 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
            <div className="flex items-start">
              <AlertTriangle className="text-yellow-500 w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-yellow-400 font-medium mb-2">
                  Colorable UTXOs Required
                </h4>
                <p className="text-yellow-300/80 text-sm mb-3">
                  To receive RGB assets on-chain, you need to have colorable
                  UTXOs available. These are special UTXOs that can hold RGB
                  assets.
                </p>
                <button
                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 
                          rounded-lg transition-colors text-sm flex items-center gap-2"
                  onClick={() => setShowUtxoModal(true)}
                >
                  <Wallet className="w-4 h-4" />
                  Create Colorable UTXOs
                </button>
              </div>
            </div>
          </div>
        )}

        {!assetId && (
          <div className="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-blue-400 text-sm">
              You are generating a deposit address that can receive any RGB
              asset. Make sure to communicate with the sender about which asset
              they intend to send.
            </p>
          </div>
        )}

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
            {assetId && assetId !== BTC_ASSET_ID && (
              <div className="mt-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-blue-400">
                  <span className="font-medium">Note:</span> 3,000 sats will be
                  included in the lightning invoice. This is required for RGB
                  asset transfers over the Lightning Network.
                </p>
              </div>
            )}
          </div>
        )}

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
              <div className="truncate flex-1 text-slate-300 font-mono text-sm flex items-center gap-2">
                <span
                  className={`
                  px-2 py-1 rounded-md text-xs font-medium
                  ${
                    assetId === BTC_ASSET_ID
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                  }
                `}
                >
                  {assetId === BTC_ASSET_ID ? 'BTC Address' : 'RGB Invoice'}
                </span>
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

      {/* UTXO Modal for handling UTXO-related errors */}
      <CreateUTXOModal
        error={utxoModalProps.error}
        isOpen={showUtxoModal}
        onClose={() => setShowUtxoModal(false)}
        onSuccess={() => setShowUtxoModal(false)}
        operationType="issuance"
        retryFunction={utxoModalProps.retryFunction}
      />
    </div>
  )
}
