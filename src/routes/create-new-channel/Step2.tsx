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
} from '../../slices/channel/channel.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

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
}

export const Step2 = (props: Props) => {
  const newChannelForm = useAppSelector((state) =>
    channelSliceSelectors.form(state, 'new')
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
        takerAssetsResponse.data?.assets.length > 0
      ) {
        setAddAsset(true)
        try {
          const assetPromises = takerAssetsResponse.data.assets.map((asset) =>
            assetBalance({ asset_id: asset.asset_id }).then((response) => ({
              asset_id: asset.asset_id,
              spendable: response.data?.spendable || 0,
            }))
          )
          const assetsWithBalances = await Promise.all(assetPromises)
          const newMaxAssetAmountMap = assetsWithBalances.reduce(
            (acc, current) => {
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
    takerAssetsResponse.data?.assets,
  ])

  const [btcBalance, btcBalanceResponse] =
    nodeApi.endpoints.btcBalance.useLazyQuery()

  // Format numbers with commas
  const formatNumber = (num) => {
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
    }
  }

  const onSubmit: SubmitHandler<FormFields> = useCallback(
    (data) => {
      const selectedAsset = takerAssetsResponse.data?.assets.find(
        (asset) => asset.asset_id === data.assetId
      )
      const assetTicker = selectedAsset?.ticker || ''
      dispatch(channelSliceActions.setNewChannelForm({ ...data, assetTicker }))
      console.log('New channel form:', { ...data })
      props.onNext()
    },
    [dispatch, takerAssetsResponse.data?.assets, props]
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="text-center mb-10">
        <h3 className="text-2xl font-semibold mb-4">Open a Channel - Step 2</h3>
        <h4 className="text-lg font-medium mb-2">
          Select the amount of satoshi to spend to open the channel
        </h4>
      </div>

      <div className="px-20">
        <div className="flex mb-10">
          <input
            className="px-6 py-4 w-full border border-divider border-r-0 bg-blue-dark outline-none rounded-l"
            {...register('pubKeyAndAddress')}
            placeholder="Paste the Public Key Here"
            readOnly={true}
            type="text"
            value={newChannelForm.pubKeyAndAddress}
          />

          <div className="bg-blue-dark border border-divider border-l-0 rounded-r flex items-center px-6">
            <CheckmarkIcon />
          </div>
        </div>

        <div className="bg-section-lighter px-6 rounded divide-y divide-divider">
          <div className="py-6">
            <div className="text-xs mb-3">Select amount of satoshi</div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  {...register('capacitySat', { valueAsNumber: true })}
                  className="rounded bg-blue-dark px-4 py-3 w-full outline-none"
                  max={maxCapacity}
                  min={MIN_CHANNEL_CAPACITY}
                  onChange={(e) => handleCapacityChange(e.target.value)}
                  placeholder="Enter amount"
                  type="text"
                  value={formatNumber(capacitySat)}
                />

                <input
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  max={maxCapacity}
                  min={MIN_CHANNEL_CAPACITY}
                  onChange={(e) => handleCapacityChange(e.target.value)}
                  step="1"
                  type="range"
                  value={capacitySat}
                />
                <div className="text-sm text-red mt-2">
                  {formState.errors.capacitySat && (
                    <p className="text-red-500 text-xs italic">
                      {formState.errors.capacitySat.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {addAsset &&
            (takerAssetsResponse.data?.assets?.length ?? 0) > 0 && ( // Ensure there are assets before showing the option
              <>
                <div className="checkbox-container">
                  <label>
                    <input
                      checked={addAsset}
                      className="checkbox-input"
                      onChange={(e) => setAddAsset(e.target.checked)}
                      type="checkbox"
                    />
                    Add Asset
                  </label>
                </div>

                <div className="py-6">
                  <div className="text-xs mb-3">Select asset</div>
                  <div>
                    <Controller
                      control={control}
                      name="assetId"
                      render={({ field }) => (
                        <Select
                          {...field}
                          active={field.value}
                          onSelect={field.onChange}
                          options={
                            takerAssetsResponse.data?.assets.map((a) => ({
                              label: a.ticker,
                              value: a.asset_id,
                            })) || []
                          }
                          theme="dark"
                        />
                      )}
                    />
                  </div>
                  {watch('assetId') && (
                    <>
                      <div className="text-xs mb-3">Select asset amount </div>

                      <div className="flex-1">
                        <input
                          {...register('assetAmount', {
                            max:
                              (maxAssetAmountMap as Record<string, number>)[
                                watch('assetId')
                              ] || 0,
                            min: 0,
                            valueAsNumber: true,
                          })}
                          className="rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          onChange={(e) =>
                            handleAssetAmountChange(e.target.value)
                          }
                          placeholder="Enter asset amount"
                          type="text"
                          value={formatNumber(assetAmount)}
                        />

                        <input
                          {...register('assetAmount', {
                            valueAsNumber: true,
                          })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                          max={
                            (maxAssetAmountMap as Record<string, number>)[
                              watch('assetId')
                            ] || 0
                          }
                          min={0}
                          onChange={(e) =>
                            handleAssetAmountChange(e.target.value)
                          }
                          step="1"
                          type="range"
                          value={formatNumber(assetAmount)}
                        />

                        <div className="text-sm text-red mt-2">
                          {formState.errors.capacitySat && (
                            <p className="text-red-500 text-xs italic">
                              {formState.errors.capacitySat.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="text-sm text-red mt-2">
                    {formState.errors.assetId?.message}
                  </div>
                </div>
              </>
            )}
          <div className="py-6">
            <div className="text-xs mb-3">Transaction Fee</div>
            <div className="flex items-center space-x-6">
              <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => null}
              >
                <div className="flex-auto w-4 h-4 rounded border-2 border-grey-lighter" />
                <div className="text-grey-lighter">Slow</div>
              </div>

              <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => null}
              >
                <div className="flex-auto w-4 h-4 rounded border-2 border-grey-lighter" />
                <div className="text-grey-lighter">Medium</div>
              </div>

              <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => null}
              >
                <div className="flex-auto w-4 h-4 rounded border-2 border-grey-lighter" />
                <div className="text-grey-lighter">Fast</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-20">
        <button
          className="px-6 py-3 rounded text-lg font-medium text-grey-light"
          onClick={() => props.onBack()}
          type="button"
        >
          Go Back
        </button>

        <button
          className="px-6 py-3 rounded border text-lg font-bold border-purple"
          type="submit"
        >
          Next Step
        </button>
      </div>

      {!formState.isSubmitSuccessful && formState.isSubmitted ? (
        <FormError />
      ) : null}
    </form>
  )
}
