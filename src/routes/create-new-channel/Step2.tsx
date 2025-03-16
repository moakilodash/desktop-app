import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Select } from '../../components/Select'
import { MAX_CHANNEL_CAPACITY, MIN_CHANNEL_CAPACITY } from '../../constants'
import { useAppTranslation } from '../../hooks/useAppTranslation'
import {
  NewChannelFormSchema,
  channelSliceActions,
  channelSliceSelectors,
  TNewChannelForm,
} from '../../slices/channel/channel.slice'
import { nodeApi, NiaAsset } from '../../slices/nodeApi/nodeApi.slice'

import { FormError } from './FormError'

interface Props {
  onBack: VoidFunction
  onNext: VoidFunction
  feeRates: Record<string, number>
}

interface FormFields {
  capacitySat: number
  pubKeyAndAddress: string
  assetAmount: number
  assetId: string
  assetTicker: string
  fee: 'slow' | 'medium' | 'fast'
}

const Step2Schema = NewChannelFormSchema.omit({
  pubKeyAndAddress: true,
}).extend({
  assetId: z.string().optional(),
  assetTicker: z.string().optional(),
  pubKeyAndAddress: z.string(),
})

export const Step2 = (props: Props) => {
  const { t } = useAppTranslation('createNewChannel')

  const newChannelForm = useAppSelector(
    (state) => channelSliceSelectors.form(state, 'new') as TNewChannelForm
  )

  const dispatch = useAppDispatch()

  const [maxCapacity, setMaxCapacity] = useState<number>(MAX_CHANNEL_CAPACITY)
  const [addAsset, setAddAsset] = useState<boolean>(false)
  const [assetAmount, setAssetAmount] = useState<number>(0)
  const [hasAvailableAssets, setHasAvailableAssets] = useState<boolean>(false)
  const [maxAssetAmountMap, setMaxAssetAmountMap] = useState<
    Record<string, number>
  >({})

  const [takerAssets, takerAssetsResponse] =
    nodeApi.endpoints.listAssets.useLazyQuery()
  const [btcBalance] = nodeApi.endpoints.btcBalance.useLazyQuery()

  const { handleSubmit, setValue, control, watch, formState, clearErrors } =
    useForm<FormFields>({
      criteriaMode: 'all',
      defaultValues: {
        ...newChannelForm,
        capacitySat: newChannelForm.capacitySat || MIN_CHANNEL_CAPACITY,
        fee: newChannelForm.fee || 'medium',
        pubKeyAndAddress: newChannelForm.pubKeyAndAddress,
      },
      mode: 'onChange',
      resolver: zodResolver(Step2Schema),
    })

  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (name && formState.errors[name]) {
        clearErrors(name)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, clearErrors, formState.errors])

  const capacitySat = watch('capacitySat')
  const selectedFee = watch('fee')

  useEffect(() => {
    takerAssets()
  }, [takerAssets])

  useEffect(() => {
    const fetchBtcBalance = async () => {
      try {
        const balance = await btcBalance({ skip_sync: false })
        const totalSpendable =
          (balance.data?.vanilla.spendable || 0) +
          (balance.data?.colored.spendable || 0)
        const newMaxCapacity = Math.min(MAX_CHANNEL_CAPACITY, totalSpendable)
        setMaxCapacity(newMaxCapacity)

        // Set initial capacity if not already set
        if (!capacitySat) {
          setValue('capacitySat', MIN_CHANNEL_CAPACITY)
        }
      } catch (error) {
        console.error('Failed to fetch BTC balance:', error)
        setMaxCapacity(MAX_CHANNEL_CAPACITY)
      }
    }

    fetchBtcBalance()
  }, [btcBalance, setValue, capacitySat])

  useEffect(() => {
    if (
      takerAssetsResponse.isSuccess &&
      takerAssetsResponse.data?.nia.length > 0
    ) {
      const filteredAssets = takerAssetsResponse.data.nia.filter(
        (asset) => asset.balance.spendable > 0
      )

      setHasAvailableAssets(filteredAssets.length > 0)
      if (filteredAssets.length > 0) {
        const newMaxAssetAmountMap = filteredAssets.reduce(
          (acc: Record<string, number>, current: NiaAsset) => {
            acc[current.asset_id] = current.balance.spendable
            return acc
          },
          {}
        )
        setMaxAssetAmountMap(newMaxAssetAmountMap)
      } else {
        setAddAsset(false)
      }
    } else {
      setHasAvailableAssets(false)
      setAddAsset(false)
    }
  }, [takerAssetsResponse])

  useEffect(() => {
    if (formState.isSubmitted) {
      clearErrors()
    }
  }, [capacitySat, watch('assetAmount'), watch('assetId'), clearErrors])

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US')
  }

  const parseInputValue = (value: string): number => {
    const sanitized = value.replace(/[^0-9]/g, '')
    return sanitized ? parseInt(sanitized, 10) : MIN_CHANNEL_CAPACITY
  }

  const handleCapacityChange = (value: string) => {
    const numericValue = parseInputValue(value)
    const clampedValue = Math.min(
      Math.max(numericValue, MIN_CHANNEL_CAPACITY),
      maxCapacity
    )
    setValue('capacitySat', clampedValue, {
      shouldDirty: true,
      shouldValidate: true,
    })
    if (formState.errors.capacitySat) {
      clearErrors('capacitySat')
    }
  }

  const handleAssetAmountChange = (value: string) => {
    const numericValue = parseInputValue(value)
    const maxAmount = maxAssetAmountMap[watch('assetId')] || 0
    const clampedValue = Math.min(Math.max(numericValue, 0), maxAmount)

    setValue('assetAmount', clampedValue, { shouldValidate: true })
    setAssetAmount(clampedValue)
  }

  const handleFeeChange = (fee: 'slow' | 'medium' | 'fast') => {
    setValue('fee', fee, { shouldValidate: true })
  }

  const onSubmit: SubmitHandler<FormFields> = useCallback(
    (data) => {
      const selectedAsset = takerAssetsResponse.data?.nia.find(
        (asset: NiaAsset) => asset.asset_id === data.assetId
      )

      const formData = {
        ...data,
        assetAmount: addAsset ? data.assetAmount : 0,
        assetId: addAsset ? data.assetId : undefined,
        assetTicker: addAsset ? selectedAsset?.ticker || '' : '',
      }

      dispatch(channelSliceActions.setNewChannelForm(formData))
      props.onNext()
    },
    [dispatch, takerAssetsResponse.data?.nia, props, addAsset]
  )

  const availableAssets =
    takerAssetsResponse.data?.nia.filter(
      (asset) => asset.balance.spendable > 0
    ) || []

  return (
    <form className="max-w-3xl mx-auto" onSubmit={handleSubmit(onSubmit)}>
      <div className="text-center mb-10">
        <h3 className="text-3xl font-bold text-white mb-4">
          {t('steps.step2.title')}
        </h3>
        <h4 className="text-xl text-gray-400">{t('steps.step2.subtitle')}</h4>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
        {/* PubKey display section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {t('steps.step2.channelWith')}
          </label>
          <div className="bg-gray-900/50 px-4 py-3 rounded-lg break-all font-mono text-sm text-white">
            {newChannelForm.pubKeyAndAddress}
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {t('steps.step2.capacity.label')}
            <span className="text-xs text-gray-500 ml-2">
              {t('steps.step2.capacity.help')}
            </span>
          </label>
          <div className="flex items-center space-x-4">
            <input
              className="flex-grow rounded bg-blue-dark px-4 py-3 outline-none"
              onChange={(e) => handleCapacityChange(e.target.value)}
              placeholder={t('steps.step2.capacity.enterAmount')}
              type="text"
              value={capacitySat ? formatNumber(capacitySat) : ''}
            />
            <span className="text-sm">
              {formatNumber(maxCapacity)} {t('steps.step2.capacity.max')}
            </span>
          </div>
          <input
            className="w-full mt-2"
            max={maxCapacity}
            min={MIN_CHANNEL_CAPACITY}
            onChange={(e) => handleCapacityChange(e.target.value)}
            type="range"
            value={capacitySat || MIN_CHANNEL_CAPACITY}
          />
          {formState.errors.capacitySat && (
            <p className="text-red-500 text-sm mt-1">
              {formState.errors.capacitySat.message}
            </p>
          )}
        </div>

        {/* Asset section */}
        <div className="border-t border-gray-700/50 my-8"></div>

        {hasAvailableAssets ? (
          <div className="mb-8">
            <h5 className="text-lg font-semibold text-white mb-4">
              {t('steps.step2.assets.title')}
            </h5>
            <label className="flex items-center text-sm mb-4 text-gray-400">
              <input
                checked={addAsset}
                className="mr-2 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                onChange={(e) => setAddAsset(e.target.checked)}
                type="checkbox"
              />
              {t('steps.step2.assets.addAsset')}
            </label>

            {addAsset && (
              <>
                <label className="block text-sm mb-2">
                  {t('steps.step2.assets.selectAsset')}
                </label>
                <Controller
                  control={control}
                  name="assetId"
                  render={({ field }) => (
                    <Select
                      {...field}
                      active={field.value}
                      onSelect={field.onChange}
                      options={availableAssets.map((a: NiaAsset) => ({
                        label: a.ticker,
                        value: a.asset_id,
                      }))}
                      theme="dark"
                    />
                  )}
                />

                {watch('assetId') && (
                  <div className="mt-4">
                    <label className="block text-sm mb-2">
                      {t('steps.step2.assets.amount')}
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        className="flex-grow rounded bg-blue-dark px-4 py-3 outline-none"
                        onChange={(e) =>
                          handleAssetAmountChange(e.target.value)
                        }
                        placeholder={t('steps.step2.assets.enterAmount')}
                        type="text"
                        value={assetAmount ? formatNumber(assetAmount) : ''}
                      />
                      <span className="text-sm">
                        {formatNumber(maxAssetAmountMap[watch('assetId')] || 0)}{' '}
                        {t('steps.step2.capacity.max')}
                      </span>
                    </div>
                    <input
                      className="w-full mt-2"
                      max={maxAssetAmountMap[watch('assetId')] || 0}
                      min={0}
                      onChange={(e) => handleAssetAmountChange(e.target.value)}
                      type="range"
                      value={assetAmount}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="mb-8 text-center">
            <p className="text-yellow-500">
              {t('steps.step2.assets.noAssets')}
            </p>
          </div>
        )}

        {/* Fee selection section */}
        <div className="border-t border-gray-700/50 my-8"></div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {t('steps.step2.fee.label')}
          </label>
          <div className="flex space-x-4">
            {['slow', 'medium', 'fast'].map((speed) => (
              <button
                className={`flex-1 py-2 px-4 rounded-lg text-center transition-colors
                  ${
                    selectedFee === speed
                      ? 'bg-purple-600/20 border border-purple-500 text-white'
                      : 'bg-gray-900/50 border border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                key={speed}
                onClick={() =>
                  handleFeeChange(speed as 'slow' | 'medium' | 'fast')
                }
                type="button"
              >
                {speed.charAt(0).toUpperCase() + speed.slice(1)}
                <span className="text-xs text-gray-500 ml-2">
                  (
                  {`${props.feeRates[speed] / 1000} ${t('steps.step2.fee.rate')}`}
                  )
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          className="px-8 py-3 rounded-lg text-lg font-bold
            bg-gray-700 hover:bg-gray-600 text-gray-300
            transform transition-all duration-200
            focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50
            shadow-md hover:shadow-lg
            flex items-center"
          onClick={props.onBack}
          type="button"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {t('steps.common.back')}
        </button>

        <button
          className="px-8 py-3 rounded-lg text-lg font-bold text-white
            bg-blue-600 hover:bg-blue-700
            transform transition-all duration-200
            focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            shadow-lg hover:shadow-xl
            flex items-center"
          type="submit"
        >
          {t('steps.common.next')}
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      </div>

      {!formState.isSubmitSuccessful && formState.isSubmitted && (
        <FormError
          errors={Object.entries(formState.errors).reduce(
            (acc, [key, error]) => {
              if (error?.message) {
                acc[key] = [error.message]
              }
              return acc
            },
            {} as Record<string, string[]>
          )}
          message={t('formError.checkForm')}
        />
      )}
    </form>
  )
}
