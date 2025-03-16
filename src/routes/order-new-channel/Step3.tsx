import {
  AlertTriangle,
  Clock,
  Rocket,
  Settings,
  Zap,
  Info,
  Link as ChainIcon,
} from 'lucide-react'
import QRCode from 'qrcode.react'
import React, { useState, useCallback, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { ClipLoader } from 'react-spinners'
import { toast } from 'react-toastify'

import 'react-toastify/dist/ReactToastify.css'
import { useAppSelector } from '../../app/store/hooks'
import { formatBitcoinAmount } from '../../helpers/number'
import { useAppTranslation } from '../../hooks/useAppTranslation'
import { Lsps1CreateOrderResponse } from '../../slices/makerApi/makerApi.slice'
import { nodeApi, NiaAsset } from '../../slices/nodeApi/nodeApi.slice'
import { TFunction } from 'i18next'

interface StepProps {
  onBack: () => void
  loading: boolean
  order: Lsps1CreateOrderResponse | null
}

// Define the getFeeIcon function
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

// Function to convert blocks to human-readable time
const blocksToTime = (blocks: number, t: TFunction) => {
  const minutes = blocks * 10
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60

  let timeString = ''
  if (days > 0)
    timeString += `${days} ${days > 1 ? t('time.days') : t('time.day')}`
  if (hours > 0)
    timeString += `${timeString ? ', ' : ''}${hours} ${hours > 1 ? t('time.hours') : t('time.hour')}`
  if (mins > 0)
    timeString += `${timeString ? ', ' : ''}${mins} ${mins > 1 ? t('time.minutes') : t('time.minute')}`

  return timeString || t('time.lessThanMinute')
}

// Add this helper function near the top of the file
const formatAssetAmount = (
  amount: number | undefined,
  precision: number
): string => {
  if (amount === undefined) return '0'
  return (amount / Math.pow(10, precision)).toFixed(precision)
}

export const Step3: React.FC<StepProps> = ({ onBack, loading, order }) => {
  const { t } = useAppTranslation('orderNewChannel')
  const [paymentMethod, setPaymentMethod] = useState<'lightning' | 'onchain'>(
    'lightning'
  )
  const [useWalletFunds, setUseWalletFunds] = useState(false)
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)

  // Add queries for wallet balances
  const [btcBalance, btcBalanceResponse] =
    nodeApi.endpoints.btcBalance.useLazyQuery()
  const [listChannels, listChannelsResponse] =
    nodeApi.endpoints.listChannels.useLazyQuery()
  const [sendPayment] = nodeApi.endpoints.sendPayment.useLazyQuery()
  const [sendBtc] = nodeApi.endpoints.sendBtc.useLazyQuery()
  const [getAssetInfo] = nodeApi.endpoints.listAssets.useLazyQuery()
  const [assetInfo, setAssetInfo] = useState<NiaAsset | null>(null)
  const [selectedFee, setSelectedFee] = useState('normal')
  const [customFee, setCustomFee] = useState(1.0)
  const [showWalletConfirmation, setShowWalletConfirmation] = useState(false)
  const [isProcessingWalletPayment, setIsProcessingWalletPayment] =
    useState(false)

  // Define fee rates
  const feeRates = [
    { label: t('step3.payment.fees.slow'), rate: 1, value: 'slow' },
    { label: t('step3.payment.fees.normal'), rate: 2, value: 'normal' },
    { label: t('step3.payment.fees.fast'), rate: 3, value: 'fast' },
    { label: t('step3.payment.fees.custom'), rate: customFee, value: 'custom' },
  ]

  // Add new state for payment status
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | null>(
    null
  )

  // Add loading state for data fetching
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Memoize the refresh function
  const refreshData = useCallback(async () => {
    // Only set loading if we don't have data yet
    if (!btcBalanceResponse.data || !listChannelsResponse.data) {
      setIsLoadingData(true)
    }

    try {
      const [balanceResult, channelsResult] = await Promise.all([
        btcBalance({ skip_sync: false }),
        listChannels(),
      ])

      // Only update state if values have changed
      if (
        JSON.stringify(balanceResult.data) !==
          JSON.stringify(btcBalanceResponse.data) ||
        JSON.stringify(channelsResult.data) !==
          JSON.stringify(listChannelsResponse.data)
      ) {
        // Data has changed, allow re-render
        return
      }
    } finally {
      setIsLoadingData(false)
    }
  }, [
    btcBalance,
    listChannels,
    btcBalanceResponse.data,
    listChannelsResponse.data,
  ])

  // Optimize the refresh interval
  useEffect(() => {
    // Only start interval if we're not processing payment
    if (isProcessingWalletPayment) return

    // Initial fetch
    refreshData()

    // Use RAF for smoother updates
    let rafId: number
    const interval = setInterval(() => {
      rafId = requestAnimationFrame(() => {
        refreshData()
      })
    }, 10000)

    return () => {
      clearInterval(interval)
      cancelAnimationFrame(rafId)
    }
  }, [refreshData, isProcessingWalletPayment])

  useEffect(() => {
    const fetchAssetInfo = async () => {
      if (order?.asset_id) {
        const result = await getAssetInfo()
        if (result.data) {
          const asset = result.data.nia.find(
            (a) => a.asset_id === order.asset_id
          )
          if (asset) {
            setAssetInfo(asset)
          }
        }
      }
    }
    fetchAssetInfo()
  }, [order?.asset_id, getAssetInfo])

  // Calculate available liquidity
  const channels = listChannelsResponse?.data?.channels || []
  const outboundLiquidity = channels.reduce(
    (sum, channel) => sum + channel.outbound_balance_msat / 1000,
    0
  )
  const vanillaChainBalance = btcBalanceResponse.data?.vanilla.spendable || 0
  const coloredChainBalance = btcBalanceResponse.data?.colored.spendable || 0
  const onChainBalance = vanillaChainBalance + coloredChainBalance

  // Function to handle wallet payment
  const handleWalletPayment = async () => {
    setIsProcessingWalletPayment(true)
    try {
      if (paymentMethod === 'lightning' && order?.payment?.bolt11) {
        await sendPayment({ invoice: order.payment.bolt11.invoice })
        toast.success(t('step3.payment.success.lightning'))
      } else if (paymentMethod === 'onchain' && order?.payment?.onchain) {
        const feeRate =
          selectedFee === 'custom'
            ? customFee
            : feeRates.find((rate) => rate.value === selectedFee)?.rate || 1
        await sendBtc({
          address: order.payment.onchain.address,
          amount: order.payment.onchain.order_total_sat,
          fee_rate: feeRate,
        })
        toast.success(t('step3.payment.success.onchain'))
      }
      setPaymentStatus('paid')
      setShowWalletConfirmation(false)
    } catch (error) {
      toast.error(t('step3.payment.error', { error: (error as Error).message }))
    } finally {
      setIsProcessingWalletPayment(false)
    }
  }

  const handleCopy = useCallback(() => {
    toast.success(t('step3.payment.external.copied'))
  }, [])

  if (loading || !order) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700/50">
          <ClipLoader color={'#3B82F6'} loading={true} size={50} />
          <span className="ml-4 text-gray-300">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  if (!order.payment || (!order.payment.bolt11 && !order.payment.onchain)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white">
        <h3 className="text-2xl font-semibold mb-4">
          {t('step3.errors.invalidOrder')}
        </h3>
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
          onClick={onBack}
        >
          {t('common.back')}
        </button>
      </div>
    )
  }

  const totalAmount = order.payment.onchain
    ? order.payment.onchain.order_total_sat / 100000000
    : order.payment.bolt11
      ? order.payment.bolt11.order_total_sat / 100000000
      : 0

  const paymentURI =
    paymentMethod === 'lightning' && order.payment.bolt11
      ? `lightning:${order.payment.bolt11.invoice}`
      : order.payment.onchain
        ? `bitcoin:${order.payment.onchain.address}?amount=${totalAmount}`
        : ''

  const currentPayment =
    paymentMethod === 'lightning' ? order.payment.bolt11 : order.payment.onchain

  const totalCapacity = order.lsp_balance_sat + order.client_balance_sat

  // Render confirmation modal
  const renderWalletConfirmationModal = () => (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() =>
          !isProcessingWalletPayment && setShowWalletConfirmation(false)
        }
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 max-w-md w-full">
          {isProcessingWalletPayment ? (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 mb-4">
                <div
                  className="w-full h-full border-4 border-blue-500/30 border-t-blue-500 
                              rounded-full animate-spin"
                />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {t('step3.payment.wallet.confirmation.processing')}
              </h3>
              <p className="text-slate-400 text-center">
                {t('step3.payment.wallet.confirmation.wait')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-bold text-white">
                  {t('step3.payment.wallet.confirmation.title')}
                </h3>
              </div>
              <div className="space-y-4">
                {/* Payment Details Section */}
                <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Payment Type:</span>
                    <span className="text-white font-medium flex items-center gap-2">
                      {paymentMethod === 'lightning' ? (
                        <>
                          <Zap className="w-4 h-4 text-yellow-500" />
                          {t('step3.payment.methods.lightning')}
                        </>
                      ) : (
                        <>
                          <ChainIcon className="w-4 h-4 text-blue-500" />
                          {t('step3.payment.methods.onchain')}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Balance Section */}
                <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      {t('step3.payment.wallet.available')}
                    </span>
                    <span className="text-white font-medium">
                      {paymentMethod === 'lightning'
                        ? `${formatBitcoinAmount(outboundLiquidity, bitcoinUnit)}`
                        : `${formatBitcoinAmount(onChainBalance, bitcoinUnit)}`}{' '}
                      {bitcoinUnit}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      {t('step3.payment.external.amountToPay')}
                    </span>
                    <span className="text-white font-medium">
                      {formatBitcoinAmount(
                        currentPayment?.order_total_sat || 0,
                        bitcoinUnit
                      )}{' '}
                      {bitcoinUnit}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      {t('step3.payment.wallet.remaining')}
                    </span>
                    <span className="text-white font-medium">
                      {formatBitcoinAmount(
                        paymentMethod === 'lightning'
                          ? outboundLiquidity -
                              (currentPayment?.order_total_sat || 0)
                          : onChainBalance -
                              (currentPayment?.order_total_sat || 0),
                        bitcoinUnit
                      )}{' '}
                      {bitcoinUnit}
                    </span>
                  </div>
                </div>

                {/* Fee Section - Only for on-chain */}
                {paymentMethod === 'onchain' && (
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        {t('step3.payment.fees.rate')}
                      </span>
                      <span className="text-white font-medium">
                        {selectedFee === 'custom'
                          ? `${customFee} sat/vB`
                          : `${feeRates.find((rate) => rate.value === selectedFee)?.rate} sat/vB`}
                      </span>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-800 my-4" />
                <p className="text-yellow-500/80 text-sm">
                  {t('step3.payment.wallet.confirmation.warning')}
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-700
                             text-slate-300 hover:bg-slate-800 transition-colors"
                    onClick={() => setShowWalletConfirmation(false)}
                    type="button"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700
                             text-white rounded-xl font-medium transition-colors"
                    onClick={handleWalletPayment}
                    type="button"
                  >
                    {t('step3.payment.wallet.confirmation.confirm')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // Update the wallet payment section in the render
  const renderWalletPaymentSection = () => {
    // Check if we have valid balance data
    const hasBalanceData =
      !isLoadingData &&
      typeof outboundLiquidity === 'number' &&
      typeof onChainBalance === 'number'

    if (!hasBalanceData) {
      return (
        <div className="bg-gray-900/50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-center gap-3 p-4">
            <ClipLoader color="#3B82F6" size={24} />
            <span className="text-gray-400">
              {t('step3.payment.wallet.loading')}
            </span>
          </div>
        </div>
      )
    }

    const insufficientBalance =
      paymentMethod === 'lightning'
        ? outboundLiquidity < (currentPayment?.order_total_sat || 0)
        : onChainBalance < (currentPayment?.order_total_sat || 0)

    return (
      <div className="bg-gray-900/50 rounded-xl p-6 mb-6">
        {insufficientBalance ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h4 className="text-red-500 font-medium mb-1">
                {t('step3.payment.wallet.insufficient.title')}
              </h4>
              <p className="text-gray-400 text-sm">
                {t(
                  `step3.payment.wallet.insufficient.message.${paymentMethod}`
                )}
              </p>
              <div className="mt-2 text-sm">
                <span className="text-gray-400">Required: </span>
                <span className="text-white font-medium">
                  {formatBitcoinAmount(
                    currentPayment?.order_total_sat || 0,
                    bitcoinUnit
                  )}{' '}
                  {bitcoinUnit}
                </span>
                <span className="text-gray-400 mx-2">|</span>
                <span className="text-gray-400">
                  {t('step3.payment.wallet.insufficient.available')}:{' '}
                </span>
                <span className="text-white font-medium">
                  {formatBitcoinAmount(
                    paymentMethod === 'lightning'
                      ? outboundLiquidity
                      : onChainBalance,
                    bitcoinUnit
                  )}{' '}
                  {bitcoinUnit}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center space-x-3">
                <input
                  checked={useWalletFunds}
                  className="form-checkbox h-5 w-5 text-blue-500 rounded border-gray-600 bg-gray-700"
                  onChange={(e) => setUseWalletFunds(e.target.checked)}
                  type="checkbox"
                />
                <span className="text-white font-medium">
                  {t('step3.payment.wallet.useWallet')}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {t('step3.payment.wallet.available')}:
                </span>
                {isLoadingData ? (
                  <div className="flex items-center gap-2">
                    <ClipLoader color="#3B82F6" size={16} />
                    <span className="text-gray-400">
                      {t('step3.payment.wallet.loading')}
                    </span>
                  </div>
                ) : (
                  <span className="text-white font-medium">
                    {paymentMethod === 'lightning'
                      ? `${formatBitcoinAmount(outboundLiquidity, bitcoinUnit)}`
                      : `${formatBitcoinAmount(onChainBalance, bitcoinUnit)}`}{' '}
                    {bitcoinUnit}
                  </span>
                )}
              </div>
            </div>

            {useWalletFunds && (
              <div className="space-y-6">
                {paymentMethod === 'onchain' && (
                  <div>
                    <label className="text-sm font-medium text-slate-400 mb-2 block">
                      {t('step3.payment.fees.title')}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {feeRates.map((rate) => (
                        <button
                          className={`
                            p-4 rounded-xl border-2 transition-all duration-200
                            flex items-center justify-between
                            ${
                              selectedFee === rate.value
                                ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                                : 'border-slate-700 text-slate-400 hover:border-blue-500/50'
                            }
                          `}
                          key={rate.value}
                          onClick={() => setSelectedFee(rate.value)}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            {getFeeIcon(rate.value)}
                            <span>{rate.label}</span>
                          </div>
                          <span className="text-sm">
                            {rate.value !== 'custom'
                              ? `${rate.rate} sat/vB`
                              : ''}
                          </span>
                        </button>
                      ))}
                    </div>

                    {selectedFee === 'custom' && (
                      <input
                        className="mt-4 w-full px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 
                               focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                        onChange={(e) =>
                          setCustomFee(parseFloat(e.target.value))
                        }
                        placeholder={t('step3.payment.fees.customPlaceholder')}
                        step="0.1"
                        type="number"
                        value={customFee}
                      />
                    )}
                  </div>
                )}

                <button
                  className={`w-full px-6 py-3 rounded-lg transition-all duration-200 
                           flex items-center justify-center gap-2 ${
                             (paymentMethod === 'lightning' &&
                               outboundLiquidity >=
                                 (currentPayment?.order_total_sat || 0)) ||
                             (paymentMethod === 'onchain' &&
                               onChainBalance >=
                                 (currentPayment?.order_total_sat || 0))
                               ? 'bg-blue-500 hover:bg-blue-600 text-white'
                               : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                           }`}
                  disabled={
                    (paymentMethod === 'lightning' &&
                      outboundLiquidity <
                        (currentPayment?.order_total_sat || 0)) ||
                    (paymentMethod === 'onchain' &&
                      onChainBalance < (currentPayment?.order_total_sat || 0))
                  }
                  onClick={() => setShowWalletConfirmation(true)}
                >
                  <span className="flex items-center gap-2">
                    {paymentMethod === 'lightning' ? '⚡' : '₿'}
                    {t('step3.payment.wallet.pay', {
                      amount: formatBitcoinAmount(
                        currentPayment?.order_total_sat || 0,
                        bitcoinUnit
                      ),
                      type:
                        paymentMethod === 'lightning'
                          ? 'off-chain'
                          : 'on-chain',
                      unit: bitcoinUnit,
                    })}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Add success message component
  const renderSuccessMessage = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {t('step3.payment.success.title')}
        </h3>
        <p className="text-gray-400 mb-4">
          {t('step3.payment.success.message')}
        </p>
        <div className="w-full max-w-sm bg-gray-900/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">
              {t('step3.payment.external.amountToPay')}:
            </span>
            <span className="text-white font-medium">
              {formatBitcoinAmount(
                currentPayment?.order_total_sat || 0,
                bitcoinUnit
              )}{' '}
              {bitcoinUnit}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">
              {t('step3.payment.methods.title')}:
            </span>
            <span className="text-white font-medium flex items-center gap-2">
              {paymentMethod === 'lightning' ? (
                <>
                  <Zap className="w-4 h-4 text-yellow-500" />
                  {t('step3.payment.methods.lightning')}
                </>
              ) : (
                <>
                  <ChainIcon className="w-4 h-4 text-blue-500" />
                  {t('step3.payment.methods.onchain')}
                </>
              )}
            </span>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 text-blue-400">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>{t('step3.payment.success.waiting')}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header with Flow Description */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            {t('step3.title')}
          </h2>
          <p className="text-gray-400 mt-2">{t('step3.subtitle')}</p>
        </div>

        {/* Step Progress */}
        <div className="flex justify-between mb-8">
          <div className="flex items-center opacity-50">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
              1
            </div>
            <div className="ml-3">
              <p className="font-medium text-white">
                {t('common.steps.connect')}
              </p>
              <p className="text-sm text-gray-400">
                {t('common.steps.completed')}
              </p>
            </div>
          </div>
          <div className="flex-1 mx-4 mt-5">
            <div className="h-1 bg-gray-700">
              <div className="h-1 bg-blue-500 w-full"></div>
            </div>
          </div>
          <div className="flex items-center opacity-50">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
              2
            </div>
            <div className="ml-3">
              <p className="font-medium text-white">
                {t('common.steps.configure')}
              </p>
              <p className="text-sm text-gray-400">
                {t('common.steps.completed')}
              </p>
            </div>
          </div>
          <div className="flex-1 mx-4 mt-5">
            <div className="h-1 bg-gray-700"></div>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              3
            </div>
            <div className="ml-3">
              <p className="font-medium text-white">
                {t('common.steps.payment')}
              </p>
              <p className="text-sm text-gray-400">
                {t('common.steps.current')}
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <span className="bg-blue-500 w-2 h-2 rounded-full mr-2"></span>
              {t('step3.orderSummary.title')}
            </div>
            {order.order_id && (
              <div className="text-sm text-gray-400 flex items-center gap-2">
                {t('step3.orderSummary.orderId.label')}:
                <CopyToClipboard
                  onCopy={() =>
                    toast.success(t('step3.orderSummary.orderId.copied'))
                  }
                  text={order.order_id}
                >
                  <button className="font-mono bg-gray-900/50 px-2 py-1 rounded hover:bg-gray-900/80 transition-colors cursor-pointer">
                    {order.order_id}
                  </button>
                </CopyToClipboard>
              </div>
            )}
          </h3>

          <div className="space-y-4">
            {/* Channel Capacity Breakdown */}
            <div className="bg-gray-900/50 rounded-lg p-4">
              <span className="text-sm text-gray-400">
                {t('step3.orderSummary.capacity.title')}
              </span>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">
                    {t('step3.orderSummary.capacity.yourBalance')}:
                  </span>
                  <span className="text-white font-medium">
                    {formatBitcoinAmount(order.client_balance_sat, bitcoinUnit)}{' '}
                    {bitcoinUnit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">
                    {t('step3.orderSummary.capacity.lspBalance')}:
                  </span>
                  <span className="text-white font-medium">
                    {formatBitcoinAmount(order.lsp_balance_sat, bitcoinUnit)}{' '}
                    {bitcoinUnit}
                  </span>
                </div>
                <div className="h-px bg-gray-700 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">
                    {t('step3.orderSummary.capacity.total')}:
                  </span>
                  <span className="text-white font-semibold">
                    {formatBitcoinAmount(totalCapacity, bitcoinUnit)}{' '}
                    {bitcoinUnit}
                  </span>
                </div>
              </div>
            </div>

            {order?.asset_id && assetInfo && (
              <div className="bg-gray-900/50 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">
                    {t('step3.orderSummary.asset.title')}
                  </span>
                  <span className="px-2 py-1 bg-blue-500/10 rounded-md text-blue-400 text-xs">
                    RGB Asset
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">
                      {t('step3.orderSummary.asset.name')}:
                    </span>
                    <span className="text-white font-medium">
                      {assetInfo.name} ({assetInfo.ticker})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">
                      {t('step3.orderSummary.asset.yourBalance')}:
                    </span>
                    <span className="text-white font-medium">
                      {formatAssetAmount(
                        order.client_asset_amount,
                        assetInfo.precision
                      )}{' '}
                      {assetInfo.ticker}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">
                      {t('step3.orderSummary.asset.lspBalance')}:
                    </span>
                    <span className="text-white font-medium">
                      {formatAssetAmount(
                        order.lsp_asset_amount,
                        assetInfo.precision
                      )}{' '}
                      {assetInfo.ticker}
                    </span>
                  </div>
                  <div className="h-px bg-gray-700 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">
                      {t('step3.orderSummary.asset.total')}:
                    </span>
                    <span className="text-white font-semibold">
                      {formatAssetAmount(
                        (order.lsp_asset_amount || 0) +
                          (order.client_asset_amount || 0),
                        assetInfo.precision
                      )}{' '}
                      {assetInfo.ticker}
                    </span>
                  </div>
                </div>
                {assetInfo.details && (
                  <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Info className="w-4 h-4" />
                      <span>{t('step3.orderSummary.asset.details')}:</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-300">
                      {assetInfo.details}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="bg-gray-900/50 rounded-lg p-4">
              <span className="text-sm text-gray-400">
                {t('step3.orderSummary.costs.title')}
              </span>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">
                    {t('step3.orderSummary.costs.channelAmount')}:
                  </span>
                  <span className="text-white font-medium">
                    {formatBitcoinAmount(
                      (currentPayment?.order_total_sat || 0) -
                        (currentPayment?.fee_total_sat || 0),
                      bitcoinUnit
                    )}{' '}
                    {bitcoinUnit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">
                    {t('step3.orderSummary.costs.serviceFee')}:
                  </span>
                  <span className="text-white font-medium">
                    {formatBitcoinAmount(
                      currentPayment?.fee_total_sat || 0,
                      bitcoinUnit
                    )}{' '}
                    {bitcoinUnit}
                  </span>
                </div>
                <div className="h-px bg-gray-700 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">
                    {t('step3.orderSummary.costs.total')}:
                  </span>
                  <span className="text-white font-semibold">
                    {formatBitcoinAmount(
                      currentPayment?.order_total_sat || 0,
                      bitcoinUnit
                    )}{' '}
                    {bitcoinUnit}
                  </span>
                </div>
              </div>
            </div>

            {/* Channel Duration */}
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">
                  {t('step3.orderSummary.duration.label')}:
                </span>
                <span className="text-white font-medium">
                  {order.channel_expiry_blocks}{' '}
                  {t('step3.orderSummary.duration.blocks')}
                  <span className="text-gray-400 ml-2">
                    ({blocksToTime(order.channel_expiry_blocks, t)})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400">
              <span className="text-sm">
                {t('step3.orderSummary.expiry.label')}:
              </span>
              <span className="font-medium">
                {new Date(currentPayment?.expires_at || '').toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Section - Show either payment methods or success message */}
        {paymentStatus === 'paid' ? (
          renderSuccessMessage()
        ) : (
          <>
            {/* Payment Method Selection */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <span className="bg-blue-500 w-2 h-2 rounded-full mr-2"></span>
                {t('step3.payment.title')}
              </h3>

              <div className="flex justify-center mb-6">
                <div className="bg-gray-900/50 p-1 rounded-xl">
                  {['lightning', 'onchain'].map((method) => (
                    <button
                      className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                        paymentMethod === method
                          ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      key={method}
                      onClick={() =>
                        setPaymentMethod(method as 'lightning' | 'onchain')
                      }
                    >
                      {method === 'lightning'
                        ? t('step3.payment.methods.lightning')
                        : t('step3.payment.methods.onchain')}
                    </button>
                  ))}
                </div>
              </div>

              {renderWalletPaymentSection()}

              {!useWalletFunds && (
                <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                  <div className="bg-white p-6 rounded-xl shadow-lg transition-transform hover:scale-105">
                    <QRCode size={240} value={paymentURI} />
                  </div>

                  <div className="flex flex-col space-y-4">
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                      <h4 className="text-sm text-gray-400 mb-1">
                        {t('step3.payment.external.amountToPay')}
                      </h4>
                      <p className="text-2xl font-bold text-white">
                        {formatBitcoinAmount(
                          currentPayment?.order_total_sat || 0,
                          bitcoinUnit
                        )}{' '}
                        {bitcoinUnit}
                      </p>
                    </div>

                    <CopyToClipboard
                      onCopy={handleCopy}
                      text={
                        paymentMethod === 'lightning'
                          ? order?.payment?.bolt11?.invoice
                          : order?.payment?.onchain?.address
                      }
                    >
                      <button
                        className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                       transform transition-all duration-200 hover:scale-105 focus:outline-none 
                                       focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      >
                        {paymentMethod === 'lightning'
                          ? t('step3.payment.external.copyInvoice')
                          : t('step3.payment.external.copyAddress')}
                      </button>
                    </CopyToClipboard>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Back Button - Hide when payment is successful */}
        {paymentStatus !== 'paid' && (
          <div className="flex justify-center">
            <button
              className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 
                       transition-all duration-200 focus:outline-none focus:ring-2 
                       focus:ring-gray-500 focus:ring-opacity-50"
              onClick={onBack}
            >
              {t('common.back')}
            </button>
          </div>
        )}
      </div>
      {showWalletConfirmation && renderWalletConfirmationModal()}
    </div>
  )
}
