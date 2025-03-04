import {
  ArrowRight,
  Wallet,
  Zap,
  Link as ChainIcon,
  ChevronDown,
  Clock,
  Rocket,
  Settings,
  Copy,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks'
import { BTC_ASSET_ID } from '../../../../constants'
import {
  nodeApi,
  ApiError,
  DecodeInvoiceResponse,
} from '../../../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../../../slices/ui/ui.slice'

interface Fields {
  address: string
  amount: number
  fee_rate: string
  asset_id: string
  network: 'on-chain' | 'lightning'
}

export const WithdrawModalContent = () => {
  const dispatch = useAppDispatch()
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)
  const transportEndpoint = useAppSelector(
    (state) => state.nodeSettings.data.proxy_endpoint
  )
  const [assetBalance, setAssetBalance] = useState(0)
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [customFee, setCustomFee] = useState(1.0)
  const [feeEstimations, setFeeEstimations] = useState({
    fast: 3,
    normal: 2,
    slow: 1,
  })
  const [decodedInvoice, setDecodedInvoice] =
    useState<DecodeInvoiceResponse | null>(null)
  const [isDecodingInvoice, setIsDecodingInvoice] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingData, setPendingData] = useState<Fields | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const [sendBtc] = nodeApi.useLazySendBtcQuery()
  const [sendAsset] = nodeApi.useLazySendAssetQuery()
  const [sendPayment] = nodeApi.useLazySendPaymentQuery()
  const [estimateFee] = nodeApi.useLazyEstimateFeeQuery()
  const assets = nodeApi.endpoints.listAssets.useQuery()
  const [decodeInvoice] = nodeApi.useLazyDecodeInvoiceQuery()

  const form = useForm<Fields>({
    defaultValues: {
      address: '',
      amount: 0,
      asset_id: BTC_ASSET_ID,
      fee_rate: 'normal',
      network: 'on-chain',
    },
  })

  const {
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form
  const network = watch('network')
  const assetId = watch('asset_id')
  const feeRate = watch('fee_rate')

  const availableAssets = [
    { label: bitcoinUnit, value: BTC_ASSET_ID },
    ...(assets.data?.nia.map((asset) => ({
      label: asset.ticker,
      value: asset.asset_id,
    })) ?? []),
  ]

  const feeRates = [
    { label: 'Slow', rate: feeEstimations.slow, value: 'slow' },
    { label: 'Normal', rate: feeEstimations.normal, value: 'normal' },
    { label: 'Fast', rate: feeEstimations.fast, value: 'fast' },
    { label: 'Custom', rate: customFee, value: 'custom' },
  ]

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.startsWith('ln')) {
        setIsDecodingInvoice(true)
        try {
          const decoded = await decodeInvoice({ invoice: text }).unwrap()
          setDecodedInvoice(decoded)
          setValue('address', text)
        } catch (error) {
          toast.error('Invalid Lightning invoice')
          setDecodedInvoice(null)
        } finally {
          setIsDecodingInvoice(false)
        }
      } else {
        setValue('address', text)
        setDecodedInvoice(null)
      }
    } catch (error) {
      toast.error('Failed to paste from clipboard')
    }
  }

  const handleInvoiceChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const invoice = e.target.value
    if (invoice.startsWith('ln')) {
      setIsDecodingInvoice(true)
      try {
        const decoded = await decodeInvoice({ invoice }).unwrap()
        setDecodedInvoice(decoded)
      } catch (error) {
        setDecodedInvoice(null)
      } finally {
        setIsDecodingInvoice(false)
      }
    } else {
      setDecodedInvoice(null)
    }
  }

  const getFeeIcon = (type: string) => {
    switch (type) {
      case 'slow':
        return <Clock className="w-4 h-4" />
      case 'fast':
        return <Rocket className="w-4 h-4" />
      case 'custom':
        return <Settings className="w-4 h-4" />
      default:
        return <Zap className="w-4 h-4" />
    }
  }

  const formatAmount = (amount: number, assetId: string) => {
    if (!amount) return '0'

    if (assetId === BTC_ASSET_ID) {
      return bitcoinUnit === 'SAT'
        ? Math.round(amount).toLocaleString()
        : (amount / 100000000).toLocaleString(undefined, {
            maximumFractionDigits: 8,
            minimumFractionDigits: 0,
          })
    }

    const assetInfo = assets.data?.nia.find((a) => a.asset_id === assetId)
    const precision = assetInfo?.precision ?? 0
    const formattedAmount = amount / Math.pow(10, precision)

    return formattedAmount.toLocaleString(undefined, {
      maximumFractionDigits: precision,
    })
  }

  const getMinAmount = () => {
    if (assetId === BTC_ASSET_ID) {
      return bitcoinUnit === 'SAT' ? 1 : 0.00000001
    }
    return 1
  }

  const getMinAmountMessage = () => {
    if (assetId === BTC_ASSET_ID) {
      return bitcoinUnit === 'SAT' ? '1 SAT' : '0.00000001 BTC'
    }
    return '1'
  }

  const parseAssetAmount = useCallback(
    (amount: number, assetId: string): number => {
      if (assetId === BTC_ASSET_ID) {
        return bitcoinUnit === 'SAT'
          ? Math.round(amount)
          : Math.round(amount * 100000000)
      }

      const assetInfo = assets.data?.nia.find((a) => a.asset_id === assetId)
      const precision = assetInfo?.precision ?? 0
      return Math.round(amount * Math.pow(10, precision))
    },
    [assets.data?.nia, bitcoinUnit]
  )

  const onSubmit = async (data: Fields) => {
    setPendingData(data)
    setShowConfirmation(true)
  }

  const handleConfirmedSubmit = async () => {
    if (!pendingData) return
    setIsConfirming(true)

    try {
      if (pendingData.network === 'lightning') {
        if (!pendingData.address.startsWith('ln')) {
          throw new Error('Invalid Lightning invoice')
        }

        const res = await sendPayment({
          invoice: pendingData.address,
        }).unwrap()

        if ('error' in res) {
          throw new Error(
            (res.error as ApiError)?.data?.error || 'Payment failed'
          )
        }

        if (res.status !== 'Pending') {
          throw new Error(`Payment ${res.status.toLowerCase()}`)
        }
      } else if (pendingData.network === 'on-chain') {
        if (pendingData.asset_id === BTC_ASSET_ID) {
          const amountInSats =
            bitcoinUnit === 'SAT'
              ? Math.round(Number(pendingData.amount))
              : Math.round(Number(pendingData.amount) * 100000000)

          const res = await sendBtc({
            address: pendingData.address,
            amount: amountInSats,
            fee_rate:
              pendingData.fee_rate !== 'custom'
                ? feeEstimations[
                    pendingData.fee_rate as keyof typeof feeEstimations
                  ]
                : customFee,
          }).unwrap()

          if ('error' in res) {
            throw new Error(
              (res.error as ApiError)?.data?.error || 'Payment failed'
            )
          }
        } else {
          const rawAmount = parseAssetAmount(
            Number(pendingData.amount),
            pendingData.asset_id
          )

          const res = await sendAsset({
            amount: rawAmount,
            asset_id: pendingData.asset_id,
            fee_rate:
              pendingData.fee_rate !== 'custom'
                ? feeEstimations[
                    pendingData.fee_rate as keyof typeof feeEstimations
                  ]
                : customFee,
            recipient_id: pendingData.address,
            transport_endpoint: transportEndpoint,
          }).unwrap()

          if ('error' in res) {
            throw new Error(
              (res.error as ApiError)?.data?.error || 'Payment failed'
            )
          }
        }
      }

      setShowConfirmation(false)
      setPendingData(null)
      setIsConfirming(false)

      toast.success('Withdrawal successful', {
        progressStyle: { background: '#3B82F6' },
      })

      setTimeout(() => {
        dispatch(uiSliceActions.setModal({ type: 'none' }))
      }, 1500)
    } catch (error: any) {
      const errorMessage = error?.message || 'Withdrawal failed'
      toast.error(errorMessage, {
        autoClose: 5000,
      })
      setIsConfirming(false)
    }
  }

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (assetId === BTC_ASSET_ID) {
          const balance = await dispatch(
            nodeApi.endpoints.btcBalance.initiate({ skip_sync: false })
          ).unwrap()
          if (bitcoinUnit === 'SAT') {
            setAssetBalance(balance.vanilla.spendable)
          } else {
            setAssetBalance(balance.vanilla.spendable / 100000000)
          }
        } else {
          const balance = await dispatch(
            nodeApi.endpoints.assetBalance.initiate({ asset_id: assetId })
          ).unwrap()
          setAssetBalance(balance.spendable)
        }
      } catch (error) {
        setAssetBalance(0)
      }
    }

    fetchBalance()
  }, [assetId, dispatch, bitcoinUnit])

  useEffect(() => {
    const fetchFees = async () => {
      if (network !== 'on-chain' || assetId !== BTC_ASSET_ID) return

      try {
        const [slow, normal, fast] = await Promise.all([
          estimateFee({ blocks: 6 }).unwrap(),
          estimateFee({ blocks: 3 }).unwrap(),
          estimateFee({ blocks: 1 }).unwrap(),
        ])
        setFeeEstimations({
          fast: fast.fee_rate,
          normal: normal.fee_rate,
          slow: slow.fee_rate,
        })
      } catch (error) {
        console.error('Failed to fetch fee estimates:', error)
      }
    }

    fetchFees()
  }, [network, assetId, estimateFee])

  const getAssetTicker = useCallback(
    (assetId: string | null) => {
      if (!assetId || !assets.data?.nia) return null
      const asset = assets.data.nia.find((a) => a.asset_id === assetId)
      return asset?.ticker || null
    },
    [assets.data?.nia]
  )

  const renderPaymentHash = (hash: string) => (
    <div className="group relative">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Payment Hash:</span>
        <button
          className="text-white font-mono hover:text-blue-400 transition-colors"
          onClick={() => navigator.clipboard.writeText(hash)}
          title="Click to copy"
        >
          {`${hash.slice(0, 8)}...${hash.slice(-8)}`}
        </button>
      </div>

      {/* Full hash tooltip */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 
                    opacity-0 group-hover:opacity-100 transition-opacity
                    pointer-events-none"
      >
        <div
          className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2
                      border border-slate-700 shadow-lg whitespace-nowrap"
        >
          <div className="font-mono">{hash}</div>
          <div
            className="absolute left-1/2 -bottom-1 w-2 h-2 bg-slate-800 
                        -translate-x-1/2 rotate-45 border-r border-b border-slate-700"
          ></div>
        </div>
      </div>
    </div>
  )

  const renderOnChainContent = () => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-slate-400 mb-2 block">
          Select Asset & Amount
        </label>
        <div className="flex gap-4">
          <div className="flex-1">
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <div className="relative">
                  <input
                    className={`w-full px-4 py-3 bg-slate-800/50 rounded-xl border
                    ${errors.amount ? 'border-red-500' : 'border-slate-700'}
                    focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white
                    placeholder:text-slate-600 pr-20`}
                    min="0"
                    placeholder="0.00"
                    step="any"
                    type="number"
                    {...field}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      if (!isNaN(value) && value >= 0) {
                        field.onChange(value)
                      }
                    }}
                    style={{
                      MozAppearance: 'textfield',
                      WebkitAppearance: 'none',
                    }}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs 
                             text-blue-500 hover:text-blue-400 transition-colors
                             bg-slate-800/50 rounded-md"
                    onClick={() => field.onChange(assetBalance)}
                    type="button"
                  >
                    MAX
                  </button>
                </div>
              )}
              rules={{
                max: {
                  message: 'Amount exceeds balance',
                  value: assetBalance,
                },
                min: {
                  message: `Minimum amount is ${getMinAmountMessage()}`,
                  value: getMinAmount(),
                },
                required: 'Amount is required',
                validate: {
                  positive: (value) =>
                    value > 0 || 'Amount must be greater than 0',
                },
              }}
            />
          </div>

          <Controller
            control={control}
            name="asset_id"
            render={({ field }) => (
              <div className="relative">
                <button
                  className="h-full px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 
                           hover:border-blue-500/50 transition-all duration-200
                           flex items-center gap-2 min-w-[120px]"
                  onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                  type="button"
                >
                  <span className="text-white">
                    {
                      availableAssets.find((a) => a.value === field.value)
                        ?.label
                    }
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showAssetDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-xl border 
                                border-slate-700 shadow-xl z-50"
                  >
                    {availableAssets.map((asset) => (
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-blue-500/10 
                                 transition-colors first:rounded-t-xl last:rounded-b-xl
                                 text-white"
                        key={asset.value}
                        onClick={() => {
                          field.onChange(asset.value)
                          setShowAssetDropdown(false)
                        }}
                        type="button"
                      >
                        {asset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-slate-400">Available:</span>
          <span className="text-slate-300">
            {formatAmount(assetBalance, assetId)}{' '}
            {assetId === BTC_ASSET_ID
              ? bitcoinUnit
              : availableAssets.find((a) => a.value === assetId)?.label}
          </span>
        </div>
        {errors.amount && (
          <div className="text-red-500 text-sm mt-1">
            {errors.amount.message}
          </div>
        )}
      </div>

      {network === 'on-chain' && (
        <div>
          <label className="text-sm font-medium text-slate-400 mb-2 block">
            Transaction Fee
          </label>
          <div className="grid grid-cols-2 gap-4">
            {feeRates.map((rate) => (
              <Controller
                control={control}
                key={rate.value}
                name="fee_rate"
                render={({ field }) => (
                  <button
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-200
                      flex items-center justify-between
                      ${
                        field.value === rate.value
                          ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                          : 'border-slate-700 text-slate-400 hover:border-blue-500/50'
                      }
                    `}
                    onClick={() => field.onChange(rate.value)}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      {getFeeIcon(rate.value)}
                      <span>{rate.label}</span>
                    </div>
                    <span className="text-sm">
                      {rate.value !== 'custom' ? `${rate.rate} sat/vB` : ''}
                    </span>
                  </button>
                )}
              />
            ))}
          </div>

          {feeRate === 'custom' && (
            <input
              className="mt-4 w-full px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 
                       focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
              onChange={(e) => setCustomFee(parseFloat(e.target.value))}
              placeholder="Enter custom fee rate (sat/vB)"
              step="0.1"
              type="number"
              value={customFee}
            />
          )}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-slate-400 mb-2 block">
          {assetId === BTC_ASSET_ID ? 'Withdrawal Address' : 'Blinded UTXO'}
        </label>
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <div>
              <input
                className={`w-full px-4 py-3 bg-slate-800/50 rounded-xl border
                ${errors.address ? 'border-red-500' : 'border-slate-700'}
                focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white
                placeholder:text-slate-600`}
                placeholder={
                  assetId === BTC_ASSET_ID
                    ? 'Paste BTC address here'
                    : 'Paste blinded UTXO here: bcrt:utxob:...'
                }
                type="text"
                {...field}
              />
              {assetId !== BTC_ASSET_ID && (
                <p className="text-sm text-slate-400 mt-2">
                  For asset transfers, please provide a blinded UTXO as the
                  recipient identifier
                </p>
              )}
            </div>
          )}
          rules={{ required: 'Address is required' }}
        />
        {errors.address && (
          <div className="text-red-500 text-sm mt-1">
            {errors.address.message}
          </div>
        )}
      </div>
    </div>
  )

  const renderLightningContent = () => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-slate-400 mb-2 block">
          Lightning Invoice
        </label>
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <div className="space-y-4">
              <div className="relative">
                <input
                  className={`w-full px-4 py-3 bg-slate-800/50 rounded-xl border
                    ${errors.address ? 'border-red-500' : 'border-slate-700'}
                    focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white
                    placeholder:text-slate-600 pr-12`}
                  placeholder="Paste invoice here"
                  type="text"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e)
                    handleInvoiceChange(e)
                  }}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 
                           hover:bg-blue-500/10 rounded-lg transition-colors 
                           text-slate-400 hover:text-blue-500"
                  onClick={handlePasteFromClipboard}
                  title="Paste from Clipboard"
                  type="button"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              {isDecodingInvoice && (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Decoding invoice...
                </div>
              )}

              {decodedInvoice && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-white font-medium mb-3">
                    Payment Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Amount:</span>
                      <span className="text-white">
                        {formatAmount(
                          decodedInvoice.amt_msat / 1000,
                          BTC_ASSET_ID
                        )}{' '}
                        {bitcoinUnit}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Network:</span>
                      <span className="text-white">
                        {decodedInvoice.network}
                      </span>
                    </div>

                    {decodedInvoice.asset_id !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Asset:</span>
                        <span className="text-white">
                          {getAssetTicker(decodedInvoice.asset_id) ||
                            decodedInvoice.asset_id}
                          <span className="text-slate-400 text-xs ml-2">
                            ({decodedInvoice.asset_id.slice(0, 8)}...)
                          </span>
                        </span>
                      </div>
                    )}

                    {decodedInvoice.asset_amount !== null &&
                      decodedInvoice.asset_id !== null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Asset Amount:</span>
                          <span className="text-white">
                            {formatAmount(
                              decodedInvoice.asset_amount,
                              decodedInvoice.asset_id
                            )}{' '}
                            {getAssetTicker(decodedInvoice.asset_id)}
                          </span>
                        </div>
                      )}

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Expires in:</span>
                      <span className="text-white">
                        {Math.max(
                          0,
                          Math.floor(
                            (decodedInvoice.timestamp +
                              decodedInvoice.expiry_sec -
                              Date.now() / 1000) /
                              60
                          )
                        )}{' '}
                        minutes
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-700 my-2"></div>

                    {/* Technical Details */}
                    <div className="space-y-2">
                      {renderPaymentHash(decodedInvoice.payment_hash)}

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Payee:</span>
                        <span className="text-white font-mono text-xs">
                          {`${decodedInvoice.payee_pubkey.slice(0, 8)}...${decodedInvoice.payee_pubkey.slice(-8)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {errors.address && (
                <div className="text-red-500 text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {errors.address.message}
                </div>
              )}
            </div>
          )}
          rules={{
            required: 'Invoice is required',
            validate: {
              isLightning: (v) =>
                v.startsWith('ln') || 'Invalid Lightning invoice',
            },
          }}
        />
      </div>
    </div>
  )

  const renderConfirmationModal = () => (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {
          if (!isConfirming) {
            setShowConfirmation(false)
            setPendingData(null)
          }
        }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 max-w-md w-full">
          {isConfirming ? (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 mb-4">
                <div
                  className="w-full h-full border-4 border-blue-500/30 border-t-blue-500 
                              rounded-full animate-spin"
                />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Processing{' '}
                {pendingData?.network === 'lightning'
                  ? 'Payment'
                  : 'Withdrawal'}
              </h3>
              <p className="text-slate-400 text-center">
                Please wait while we process your transaction...
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-bold text-white">
                  Confirm Withdrawal
                </h3>
              </div>

              {pendingData && (
                <div className="space-y-4">
                  {pendingData.network === 'lightning' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Payment Type:</span>
                        <span className="text-white">Lightning Invoice</span>
                      </div>
                      {decodedInvoice && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Amount:</span>
                            <span className="text-white">
                              {formatAmount(
                                decodedInvoice.amt_msat / 1000,
                                BTC_ASSET_ID
                              )}{' '}
                              {bitcoinUnit}
                            </span>
                          </div>
                          {decodedInvoice.asset_id !== null && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Asset:</span>
                              <span className="text-white">
                                {getAssetTicker(decodedInvoice.asset_id) ||
                                  decodedInvoice.asset_id}
                              </span>
                            </div>
                          )}
                          {decodedInvoice.asset_amount !== null &&
                            decodedInvoice.asset_id !== null && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-400">
                                  Asset Amount:
                                </span>
                                <span className="text-white">
                                  {formatAmount(
                                    decodedInvoice.asset_amount,
                                    decodedInvoice.asset_id
                                  )}{' '}
                                  {getAssetTicker(decodedInvoice.asset_id)}
                                </span>
                              </div>
                            )}
                          {renderPaymentHash(decodedInvoice.payment_hash)}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Payment Type:</span>
                        <span className="text-white">On-chain Transfer</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Amount:</span>
                        <span className="text-white">
                          {formatAmount(
                            pendingData.amount,
                            pendingData.asset_id
                          )}{' '}
                          {pendingData.asset_id === BTC_ASSET_ID
                            ? bitcoinUnit
                            : availableAssets.find(
                                (a) => a.value === pendingData.asset_id
                              )?.label}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">To:</span>
                        <span className="text-white font-mono text-sm">
                          {`${pendingData.address.slice(0, 12)}...${pendingData.address.slice(-12)}`}
                        </span>
                      </div>
                      {pendingData.fee_rate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Fee Rate:</span>
                          <span className="text-white">
                            {pendingData.fee_rate === 'custom'
                              ? `${customFee} sat/vB`
                              : `${feeEstimations[pendingData.fee_rate as keyof typeof feeEstimations]} sat/vB`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-800 my-4" />

                  <p className="text-yellow-500/80 text-sm">
                    Please verify all details before confirming. This action
                    cannot be undone.
                  </p>

                  <div className="flex gap-3 mt-6">
                    <button
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-700
                               text-slate-300 hover:bg-slate-800 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isConfirming}
                      onClick={() => {
                        setShowConfirmation(false)
                        setPendingData(null)
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700
                               text-white rounded-xl font-medium transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
                      disabled={isConfirming}
                      onClick={handleConfirmedSubmit}
                      type="button"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Wallet className="w-12 h-12 text-blue-500 mb-4" />
          <h3 className="text-3xl font-bold text-white mb-2">
            Withdraw Assets
          </h3>
          <p className="text-slate-400 text-center max-w-md">
            {network === 'lightning'
              ? 'Paste a Lightning invoice to make a payment'
              : 'Choose your asset and enter the withdrawal details'}
          </p>
        </div>

        <form
          className="space-y-6 max-w-xl mx-auto"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {/* Network Selection */}
          <div className="flex gap-4">
            <Controller
              control={control}
              name="network"
              render={({ field }) => (
                <>
                  <button
                    className={`
                      flex-1 py-4 px-6 flex flex-col items-center justify-center gap-2
                      rounded-xl transition-all duration-200 border-2
                      ${
                        field.value === 'on-chain'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                          : 'border-slate-700 hover:border-blue-500/50 text-slate-400 hover:text-blue-500/80'
                      }
                    `}
                    onClick={() => {
                      field.onChange('on-chain')
                      setValue('asset_id', BTC_ASSET_ID)
                      setValue('address', '')
                    }}
                    type="button"
                  >
                    <ChainIcon className="w-6 h-6" />
                    <span>On-chain</span>
                  </button>
                  <button
                    className={`
                      flex-1 py-4 px-6 flex flex-col items-center justify-center gap-2
                      rounded-xl transition-all duration-200 border-2
                      ${
                        field.value === 'lightning'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                          : 'border-slate-700 hover:border-blue-500/50 text-slate-400 hover:text-blue-500/80'
                      }
                    `}
                    onClick={() => {
                      field.onChange('lightning')
                      setValue('address', '')
                    }}
                    type="button"
                  >
                    <Zap className="w-6 h-6" />
                    <span>Lightning</span>
                  </button>
                </>
              )}
            />
          </div>

          {/* Content based on network type */}
          {network === 'lightning'
            ? renderLightningContent()
            : renderOnChainContent()}

          {/* Submit Button */}
          <button
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900
                     disabled:cursor-not-allowed text-white rounded-xl font-medium 
                     transition-colors flex items-center justify-center gap-2 mt-6"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {network === 'lightning' ? 'Pay Invoice' : 'Withdraw'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent 
                              animate-spin mb-4"
                />
                <h4 className="text-xl font-semibold text-white mb-2">
                  Processing{' '}
                  {network === 'lightning' ? 'Payment' : 'Withdrawal'}
                </h4>
                <p className="text-slate-400 text-center">
                  Please wait while we process your transaction. This may take a
                  moment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Toast Styles */}
        <style>
          {`
            .Toastify__toast {
              border-radius: 12px;
              font-weight: 500;
            }
            
            .Toastify__toast--success {
              background: rgba(16, 185, 129, 0.1) !important;
              backdrop-filter: blur(8px);
              border: 1px solid rgba(16, 185, 129, 0.2);
              color: #fff !important;
            }
            
            .Toastify__toast--error {
              background: rgba(239, 68, 68, 0.1) !important;
              backdrop-filter: blur(8px);
              border: 1px solid rgba(239, 68, 68, 0.2);
              color: #fff !important;
              font-weight: 500;
            }

            .Toastify__toast-body {
              font-family: inherit;
              padding: 8px;
            }

            .Toastify__progress-bar {
              height: 3px;
            }
          `}
        </style>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && renderConfirmationModal()}
    </>
  )
}
