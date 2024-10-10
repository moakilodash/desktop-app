import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Select } from '../../components/Select'
import { MAX_CHANNEL_CAPACITY, MIN_CHANNEL_CAPACITY } from '../../constants'
import { CheckmarkIcon } from '../../icons/Checkmark'
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
}

interface FormFields {
  capacitySat: number
  pubKeyAndAddress: string
  assetAmount: number
  assetId: string
  assetTicker: string
  fee: 'slow' | 'medium' | 'fast'
}

export const Step2 = (props: Props) => {
  const newChannelForm = useAppSelector(
    (state) => channelSliceSelectors.form(state, 'new') as TNewChannelForm
  )

  const dispatch = useAppDispatch()

  const [maxCapacity, setMaxCapacity] = useState<number>(MAX_CHANNEL_CAPACITY)
  const [addAsset, setAddAsset] = useState(true)
  const [assetAmount, setAssetAmount] = useState(0)

  const [takerAssets, takerAssetsResponse] =
    nodeApi.endpoints.listAssets.useLazyQuery()
  const [assetBalance] = nodeApi.endpoints.assetBalance.useLazyQuery()

  const [maxAssetAmountMap, setMaxAssetAmountMap] = useState<
    Record<string, number>
  >({})

  const { register, handleSubmit, setValue, control, watch, formState } =
    useForm<FormFields>({
      criteriaMode: 'all',
      defaultValues: {
        ...newChannelForm,
      },
      resolver: zodResolver(NewChannelFormSchema),
    })

  useEffect(() => {
    takerAssets()
  }, [takerAssets])

  useEffect(() => {
    const fetchAssetBalances = async () => {
      if (
        takerAssetsResponse.isSuccess &&
        takerAssetsResponse.data?.nia.length > 0
      ) {
        setAddAsset(true)
        try {
          const assetPromises = takerAssetsResponse.data.nia.map(
            (asset: NiaAsset) =>
              assetBalance({ asset_id: asset.asset_id }).then((response) => ({
                asset_id: asset.asset_id,
                spendable: response.data?.spendable || 0,
              }))
          )
          const assetsWithBalances = await Promise.all(assetPromises)
          const newMaxAssetAmountMap = assetsWithBalances.reduce(
            (
              acc: Record<string, number>,
              current: { asset_id: string; spendable: number }
            ) => {
              const key = current.asset_id ?? ''
              acc[key] = current.spendable
              return acc
            },
            {} as Record<string, number>
          )
          setMaxAssetAmountMap(newMaxAssetAmountMap)
        } catch (error) {
          console.error('Failed to fetch asset balances:', error)
        }
      } else {
        setAddAsset(false)
      }
    }

    fetchAssetBalances()
  }, [
    takerAssets,
    assetBalance,
    takerAssetsResponse.isSuccess,
    takerAssetsResponse.data?.nia,
  ])

  const [btcBalance] = nodeApi.endpoints.btcBalance.useLazyQuery()

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const capacitySat = watch('capacitySat')

  // Fetch BTC balance as maximum capacity
  useEffect(() => {
    const fetchMaxCapacity = async () => {
      try {
        const balance = await btcBalance()
        const maxSpendable = balance.data?.vanilla.spendable || 100_000_000
        setMaxCapacity(Math.min(MAX_CHANNEL_CAPACITY, maxSpendable))
        console.log('BTC balance:', maxSpendable)
      } catch (error) {
        console.error('Failed to fetch BTC balance:', error)
      }
    }

    fetchMaxCapacity()
  }, [])

  const handleCapacityChange = (value: string) => {
    const numericValue = parseInt(value.replace(/,/g, ''), 10)
    if (!isNaN(numericValue)) {
      setValue(
        'capacitySat',
        Math.min(Math.max(numericValue, MIN_CHANNEL_CAPACITY), maxCapacity),
        { shouldValidate: true }
      )
    }
  }

  const handleAssetAmountChange = (value: string) => {
    const numericValue = parseInt(value.replace(/,/g, ''), 10)
    if (!isNaN(numericValue)) {
      setValue('assetAmount', numericValue, { shouldValidate: true })
      setAssetAmount(numericValue)
    }
  }

  const handleFeeChange = (fee: 'slow' | 'medium' | 'fast') => {
    setValue('fee', fee, { shouldValidate: true })
  }

  const onSubmit: SubmitHandler<FormFields> = useCallback(
    (data) => {
      const selectedAsset = takerAssetsResponse.data?.nia.find(
        (asset: NiaAsset) => asset.asset_id === data.assetId
      )
      const assetTicker = selectedAsset?.ticker || ''
      dispatch(channelSliceActions.setNewChannelForm({ ...data, assetTicker }))
      console.log('New channel form:', { ...data })
      props.onNext()
    },
    [dispatch, takerAssetsResponse.data?.nia, props]
  )

  return (
    <form className="max-w-3xl mx-auto" onSubmit={handleSubmit(onSubmit)}>
      <div className="text-center mb-10">
        <h3 className="text-3xl font-bold mb-4">Open a Channel - Step 2</h3>
        <h4 className="text-xl">Configure your channel capacity and assets</h4>
      </div>

      <div className="bg-section-lighter p-8 rounded-lg mb-10">
        <div className="flex mb-8">
          <input
            className="flex-grow px-6 py-4 border border-divider border-r-0 bg-blue-dark outline-none rounded-l"
            {...register('pubKeyAndAddress')}
            placeholder="Public Key"
            readOnly={true}
            type="text"
            value={newChannelForm.pubKeyAndAddress}
          />
          <div className="bg-blue-dark border border-divider border-l-0 rounded-r flex items-center px-6">
            <CheckmarkIcon />
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm mb-2">
            Channel Capacity (satoshis)
          </label>
          <div className="flex items-center space-x-4">
            <input
              {...register('capacitySat', { valueAsNumber: true })}
              className="flex-grow rounded bg-blue-dark px-4 py-3 outline-none"
              max={maxCapacity}
              min={MIN_CHANNEL_CAPACITY}
              onChange={(e) => handleCapacityChange(e.target.value)}
              placeholder="Enter amount"
              type="text"
              value={formatNumber(capacitySat)}
            />
            <span className="text-sm">{formatNumber(maxCapacity)} max</span>
          </div>
          <input
            className="w-full mt-2"
            max={maxCapacity}
            min={MIN_CHANNEL_CAPACITY}
            onChange={(e) => handleCapacityChange(e.target.value)}
            type="range"
            value={capacitySat}
          />
          {formState.errors.capacitySat && (
            <p className="text-red-500 text-sm mt-1">
              {formState.errors.capacitySat.message}
            </p>
          )}
        </div>

        {addAsset && (takerAssetsResponse.data?.nia?.length ?? 0) > 0 && (
          <div className="mb-8">
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
                      options={
                        takerAssetsResponse.data?.nia.map((a: NiaAsset) => ({
                          label: a.ticker,
                          value: a.asset_id,
                        })) || []
                      }
                      theme="dark"
                    />
                  )}
                />

                {watch('assetId') && (
                  <div className="mt-4">
                    <label className="block text-sm mb-2">Asset Amount</label>
                    <div className="flex items-center space-x-4">
                      <input
                        {...register('assetAmount', {
                          max:
                            (maxAssetAmountMap as Record<string, number>)[
                              watch('assetId')
                            ] || 0,
                          min: 0,
                          valueAsNumber: true,
                        })}
                        className="flex-grow rounded bg-blue-dark px-4 py-3 outline-none"
                        onChange={(e) =>
                          handleAssetAmountChange(e.target.value)
                        }
                        placeholder="Enter asset amount"
                        type="text"
                        value={formatNumber(assetAmount)}
                      />
                      <span className="text-sm">
                        {formatNumber(
                          (maxAssetAmountMap as Record<string, number>)[
                            watch('assetId')
                          ] || 0
                        )}{' '}
                        max
                      </span>
                    </div>
                    <input
                      className="w-full mt-2"
                      max={
                        (maxAssetAmountMap as Record<string, number>)[
                          watch('assetId')
                        ] || 0
                      }
                      min={0}
                      onChange={(e) => handleAssetAmountChange(e.target.value)}
                      type="range"
                      value={assetAmount}
                    />
                    {formState.errors.assetAmount && (
                      <p className="text-red-500 text-sm mt-1">
                        {formState.errors.assetAmount.message}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm mb-2">Transaction Fee</label>
          <div className="flex space-x-4">
            {['slow', 'medium', 'fast'].map((speed) => (
              <button
                className={`flex-1 py-2 px-4 bg-blue-dark border border-divider rounded text-center hover:bg-opacity-80 transition-colors ${
                  watch('fee') === speed ? 'bg-purple bg-opacity-20' : ''
                }`}
                key={speed}
                onClick={() =>
                  handleFeeChange(speed as 'slow' | 'medium' | 'fast')
                }
                type="button"
              >
                {speed.charAt(0).toUpperCase() + speed.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          className="px-6 py-3 rounded text-lg font-medium text-grey-light hover:bg-blue-dark transition-colors"
          onClick={() => props.onBack()}
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

      {!formState.isSubmitSuccessful && formState.isSubmitted ? (
        <FormError />
      ) : null}
    </form>
  )
}
