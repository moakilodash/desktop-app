import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { TRADE_PATH, WALLET_DASHBOARD_PATH } from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Spinner } from '../../components/Spinner'
import { MIN_CHANNEL_CAPACITY } from '../../constants'
import {
  channelSliceActions,
  channelSliceSelectors,
  TNewChannelForm,
} from '../../slices/channel/channel.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { Step3 } from './Step3'
import { Step4 } from './Step4'

const FEE_RATES = {
  fast: 3000,
  medium: 2000,
  slow: 1000,
}

export const Component = () => {
  const dispatch = useAppDispatch()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [feeRates, setFeeRates] = useState(FEE_RATES)

  const navigate = useNavigate()

  const [openChannel, openChannelResponse] =
    nodeApi.endpoints.openChannel.useLazyQuery()
  const [getBtcBalance] = nodeApi.endpoints.btcBalance.useLazyQuery()
  const [estimateFee] = nodeApi.endpoints.estimateFee.useLazyQuery()

  const [isLoading, setIsLoading] = useState(true)
  const [insufficientBalance, setInsufficientBalance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channelOpeningError, setChannelOpeningError] = useState<string | null>(
    null
  )

  const newChannelForm = useAppSelector((state) =>
    channelSliceSelectors.form(state, 'new')
  )

  useEffect(() => {
    const fetchFees = async () => {
      const slowFeePromise = estimateFee({ blocks: 6 }).unwrap()
      const mediumFeePromise = estimateFee({ blocks: 3 }).unwrap()
      const fastFeePromise = estimateFee({ blocks: 1 }).unwrap()

      try {
        const [slowFee, mediumFee, fastFee] = await Promise.all([
          slowFeePromise,
          mediumFeePromise,
          fastFeePromise,
        ])
        setFeeRates({
          fast: fastFee.fee_rate * 1000,
          medium: mediumFee.fee_rate * 1000,
          slow: slowFee.fee_rate * 1000,
        })
      } catch (e) {
        console.error(e)
      }
    }

    fetchFees()
  }, [estimateFee])

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
          setError('Failed to fetch balance')
        }
      } catch (err) {
        setError('An error occurred while fetching balance')
      } finally {
        setIsLoading(false)
      }
    }

    checkInitialBalance()
  }, [getBtcBalance])

  const onSubmit = useCallback(async () => {
    const form = newChannelForm as TNewChannelForm
    setChannelOpeningError(null)

    try {
      const openChannelResponse = await openChannel({
        asset_amount: form.assetAmount,
        asset_id: form.assetId,
        capacity_sat: form.capacitySat,
        fee_rate_msat: feeRates[form.fee],
        peer_pubkey_and_opt_addr: form.pubKeyAndAddress,
      })

      if (openChannelResponse.error) {
        const errorMessage =
          typeof openChannelResponse.error === 'object' &&
          openChannelResponse.error !== null
            ? (openChannelResponse.error as any).data?.error ||
              JSON.stringify(openChannelResponse.error)
            : String(openChannelResponse.error)
        throw new Error(errorMessage)
      }

      console.log('Opened channel successfully:', openChannelResponse.data)
      setStep(4)
    } catch (error) {
      console.error('Failed to open channel:', error)
      setChannelOpeningError(
        error instanceof Error ? error.message : 'An unknown error occurred'
      )
      setStep(4)
    }
  }, [openChannel, newChannelForm])

  const onStep2Back = useCallback(() => {
    dispatch(
      channelSliceActions.setNewChannelForm({
        ...newChannelForm,
      })
    )
    setStep(1)
  }, [dispatch, channelSliceActions, setStep, newChannelForm])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner
          color="#8FD5EA"
          overlay={false}
          size={120}
          speed="normal"
          thickness={4}
        />
        <div className="ml-4">Checking balance...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        {error}. Please try again later.
      </div>
    )
  }

  return (
    <div className="max-w-screen-lg w-full bg-blue-dark py-8 rounded px-14 pt-20 pb-8">
      {insufficientBalance ? (
        <div className="text-center">
          <p className="text-red-500 mb-4">
            Insufficient balance to open a channel. You need at least{' '}
            {MIN_CHANNEL_CAPACITY} satoshis.
          </p>
          <p className="text-red-500 mb-4">
            Deposit some funds to your wallet to continue.
          </p>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate(WALLET_DASHBOARD_PATH)}
          >
            Go to Dashboard Page
          </button>
        </div>
      ) : (
        <>
          <div className={step !== 1 ? 'hidden' : ''}>
            <Step1 error={''} onNext={() => setStep(2)} />
          </div>

          <div className={step !== 2 ? 'hidden' : ''}>
            <Step2
              feeRates={feeRates}
              onBack={onStep2Back}
              onNext={() => setStep(3)}
            />
          </div>

          <div className={step !== 3 ? 'hidden' : ''}>
            <Step3
              error={
                (openChannelResponse.error as { data: { error: string } })?.data
                  .error
              }
              onBack={() => setStep(2)}
              onNext={onSubmit}
            />
          </div>

          <div className={step !== 4 ? 'hidden' : ''}>
            <Step4
              error={channelOpeningError}
              onFinish={() => navigate(TRADE_PATH)}
              onRetry={() => setStep(3)}
            />
          </div>
        </>
      )}
    </div>
  )
}
