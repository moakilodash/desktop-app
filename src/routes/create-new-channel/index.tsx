import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { TRADE_PATH, WALLET_DASHBOARD_PATH } from '../../app/router/paths'
import { Spinner } from '../../components/Spinner'
import { MIN_CHANNEL_CAPACITY } from '../../constants'
import { TNewChannelForm } from '../../slices/channel/channel.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { FormError } from './FormError'
import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { Step3 } from './Step3'
import { Step4 } from './Step4'

const DEFAULT_FEE_RATES = {
  fast: 3000,
  medium: 2000,
  slow: 1000,
}

const initialFormState: TNewChannelForm = {
  assetAmount: 0,
  assetId: '',
  assetTicker: '',
  capacitySat: MIN_CHANNEL_CAPACITY,
  fee: 'medium',
  pubKeyAndAddress: '',
}

export const Component = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [feeRates, setFeeRates] = useState(DEFAULT_FEE_RATES)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState<TNewChannelForm>(initialFormState)

  const navigate = useNavigate()

  const [openChannel] = nodeApi.endpoints.openChannel.useLazyQuery()
  const [getBtcBalance] = nodeApi.endpoints.btcBalance.useLazyQuery()
  const [estimateFee] = nodeApi.endpoints.estimateFee.useLazyQuery()
  const [getNetworkInfo] = nodeApi.endpoints.networkInfo.useLazyQuery()

  const [isLoading, setIsLoading] = useState(true)
  const [insufficientBalance, setInsufficientBalance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channelOpeningError, setChannelOpeningError] = useState<string | null>(
    null
  )

  // Clear form errors when changing steps
  useEffect(() => {
    setFormError(null)
  }, [step])

  useEffect(() => {
    const fetchFees = async () => {
      try {
        // Get network info first
        const networkInfo = await getNetworkInfo().unwrap()
        const network = networkInfo?.network?.toLowerCase()

        // Use default fee rates for regtest
        if (network === 'regtest') {
          setFeeRates(DEFAULT_FEE_RATES)
          return
        }

        // For other networks, fetch fee rates
        const [slowFee, mediumFee, fastFee] = await Promise.all([
          estimateFee({ blocks: 6 }).unwrap(),
          estimateFee({ blocks: 3 }).unwrap(),
          estimateFee({ blocks: 1 }).unwrap(),
        ])
        setFeeRates({
          fast: fastFee.fee_rate * 1000,
          medium: mediumFee.fee_rate * 1000,
          slow: slowFee.fee_rate * 1000,
        })
      } catch (e) {
        console.error('Failed to fetch fee rates:', e)
        setFormError('Failed to fetch fee rates. Please try again.')
      }
    }

    fetchFees()
  }, [estimateFee, getNetworkInfo])

  useEffect(() => {
    const checkInitialBalance = async () => {
      setIsLoading(true)
      try {
        const response = await getBtcBalance({ skip_sync: false })
        if (response.data) {
          const totalSpendable =
            response.data.vanilla.spendable + response.data.colored.spendable

          setInsufficientBalance(totalSpendable < MIN_CHANNEL_CAPACITY)
        } else {
          throw new Error('Failed to fetch balance')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balance')
      } finally {
        setIsLoading(false)
      }
    }

    checkInitialBalance()
  }, [getBtcBalance])

  const validateForm = () => {
    if (!formData.pubKeyAndAddress) {
      setFormError('Peer connection information is required')
      return false
    }

    if (!formData.capacitySat || formData.capacitySat < MIN_CHANNEL_CAPACITY) {
      setFormError(
        `Channel capacity must be at least ${MIN_CHANNEL_CAPACITY} satoshis`
      )
      return false
    }

    if (!formData.fee) {
      setFormError('Please select a fee rate')
      return false
    }

    return true
  }

  const onSubmit = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    setChannelOpeningError(null)

    try {
      const openChannelResponse = await openChannel({
        asset_amount: formData.assetAmount,
        asset_id: formData.assetId,
        capacity_sat: formData.capacitySat,
        fee_rate_msat: feeRates[formData.fee],
        peer_pubkey_and_opt_addr: formData.pubKeyAndAddress,
      }).unwrap()

      if (
        'error' in openChannelResponse &&
        typeof openChannelResponse.error === 'string'
      ) {
        throw new Error(openChannelResponse.error)
      }

      console.log('Channel opened successfully:', openChannelResponse)
      setStep(4)
    } catch (error) {
      console.error('Failed to open channel:', error)
      setChannelOpeningError(
        error instanceof Error ? error.message : 'Failed to open channel'
      )
      setStep(4)
    }
  }, [openChannel, formData, feeRates])

  const handleFormUpdate = (updates: Partial<TNewChannelForm>) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner color="#8FD5EA" overlay={false} size={120} />
        <div className="ml-4 text-gray-400">Checking balance...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center">
        <FormError message={error} />
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-screen-lg w-full bg-blue-darkest/80 backdrop-blur-sm rounded-2xl border border-white/5 shadow-2xl px-8 py-12">
      {insufficientBalance ? (
        <div className="text-center p-8 animate-fadeIn">
          <FormError
            message={`Insufficient balance to open a channel. You need at least ${MIN_CHANNEL_CAPACITY} satoshis.`}
          />
          <button
            className="mt-6 px-8 py-3 bg-cyan text-blue-darkest font-semibold rounded-xl
            hover:bg-cyan-400 active:bg-cyan-600 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-cyan/50 focus:ring-offset-2 focus:ring-offset-blue-darkest
            transform hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate(WALLET_DASHBOARD_PATH)}
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {formError && <FormError message={formError} />}

          {step === 1 && (
            <Step1
              formData={formData}
              onFormUpdate={handleFormUpdate}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <Step2
              feeRates={feeRates}
              formData={formData}
              onBack={() => setStep(1)}
              onFormUpdate={handleFormUpdate}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <Step3
              error={formError || undefined}
              feeRates={feeRates}
              formData={formData}
              onBack={() => setStep(2)}
              onFormUpdate={handleFormUpdate}
              onNext={onSubmit}
            />
          )}

          {step === 4 && (
            <Step4
              error={channelOpeningError}
              onFinish={() => navigate(TRADE_PATH)}
              onRetry={() => setStep(3)}
            />
          )}
        </>
      )}
    </div>
  )
}
