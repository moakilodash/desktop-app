import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Select } from '../../components/Select'
import { MAX_CHANNEL_CAPACITY, MIN_CHANNEL_CAPACITY } from '../../constants'
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

const Step2Schema = NewChannelFormSchema.extend({
  assetId: z.string().optional(),
  assetTicker: z.string().optional(),
})

export const Step2 = (props: Props) => {
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

  const { handleSubmit, setValue, control, watch, formState } =
    useForm<FormFields>({
      criteriaMode: 'all',
      defaultValues: {
        ...newChannelForm,
        capacitySat: newChannelForm.capacitySat || MIN_CHANNEL_CAPACITY,
        fee: newChannelForm.fee || 'medium',
      },
      resolver: zodResolver(Step2Schema),
    })

  const capacitySat = watch('capacitySat')
  const selectedFee = watch('fee')

  useEffect(() => {
    takerAssets()
  }, [takerAssets])

  useEffect(() => {
    const fetchBtcBalance = async () => {
      try {
        const balance = await btcBalance({ skip_sync: false })
        const maxSpendable =
          balance.data?.vanilla.spendable || MAX_CHANNEL_CAPACITY
        const newMaxCapacity = Math.min(MAX_CHANNEL_CAPACITY, maxSpendable)
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
    setValue('capacitySat', clampedValue, { shouldValidate: true })
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
        <h3 className="text-3xl font-bold mb-4">Open a Channel - Step 2</h3>
        <h4 className="text-xl">Configure your channel capacity and assets</h4>
      </div>

      <div className="bg-section-lighter p-8 rounded-lg mb-10">
        {/* Add PubKey display section */}
        <div className="mb-8">
          <label className="block text-sm mb-2">
            Opening Channel with Node:
          </label>
          <div className="bg-blue-dark px-4 py-3 rounded break-all font-mono text-sm">
            {newChannelForm.pubKeyAndAddress}
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm mb-2">
            Channel Capacity (satoshis)
            <span className="text-xs text-gray-500 ml-2">
              (The amount of BTC you want to allocate to this channel)
            </span>
          </label>
          <div className="flex items-center space-x-4">
            <input
              className="flex-grow rounded bg-blue-dark px-4 py-3 outline-none"
              onChange={(e) => handleCapacityChange(e.target.value)}
              placeholder="Enter amount"
              type="text"
              value={capacitySat ? formatNumber(capacitySat) : ''}
            />
            <span className="text-sm">{formatNumber(maxCapacity)} max</span>
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
        <div className="border-t border-divider my-8"></div>

        {hasAvailableAssets ? (
          <div className="mb-8">
            <h5 className="text-lg font-semibold mb-4">RGB Assets</h5>
            <label className="flex items-center text-sm mb-4">
              <input
                checked={addAsset}
                className="mr-2"
                onChange={(e) => setAddAsset(e.target.checked)}
                type="checkbox"
              />
              Add Asset
            </label>

            {addAsset && (
              <>
                <label className="block text-sm mb-2">Select Asset</label>
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
                    <label className="block text-sm mb-2">Asset Amount</label>
                    <div className="flex items-center space-x-4">
                      <input
                        className="flex-grow rounded bg-blue-dark px-4 py-3 outline-none"
                        onChange={(e) =>
                          handleAssetAmountChange(e.target.value)
                        }
                        placeholder="Enter asset amount"
                        type="text"
                        value={assetAmount ? formatNumber(assetAmount) : ''}
                      />
                      <span className="text-sm">
                        {formatNumber(maxAssetAmountMap[watch('assetId')] || 0)}{' '}
                        max
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
              You do not have any spendable on-chain RGB assets to open a
              channel with.
            </p>
          </div>
        )}

        {/* Fee selection section */}
        <div className="border-t border-divider my-8"></div>

        <div>
          <label className="block text-sm mb-2">Transaction Fee</label>
          <div className="flex space-x-4">
            {['slow', 'medium', 'fast'].map((speed) => (
              <button
                className={`flex-1 py-2 px-4 bg-blue-dark border border-divider rounded text-center hover:bg-opacity-80 transition-colors ${
                  selectedFee === speed ? 'bg-purple bg-opacity-20' : ''
                }`}
                key={speed}
                onClick={() =>
                  handleFeeChange(speed as 'slow' | 'medium' | 'fast')
                }
                type="button"
              >
                {speed.charAt(0).toUpperCase() + speed.slice(1)}
                <span className="text-xs text-gray-500 ml-2">
                  ({`${props.feeRates[speed] / 1000} sat/Bv`})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          className="px-6 py-3 rounded text-lg font-medium text-grey-light hover:bg-blue-dark transition-colors"
          onClick={props.onBack}
          type="button"
        >
          Back
        </button>
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-purple hover:bg-purple hover:bg-opacity-20 transition-colors"
          type="submit"
        >
          Next
        </button>
      </div>

      {!formState.isSubmitSuccessful && formState.isSubmitted && <FormError />}
    </form>
  )
}
