import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast /* ToastContainer */ } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Select } from '../../components/Select'
import { MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY } from '../../constants'
import { CheckmarkIcon } from '../../icons/Checkmark'
import {
  ChannelRequestFormSchema,
  channelSliceActions,
  channelSliceSelectors,
} from '../../slices/channel/channel.slice'
import { makerApi } from '../../slices/makerApi/makerApi.slice'

import { FormError } from './FormError'

interface Props {
  onBack: VoidFunction
  onNext: VoidFunction
  error: string
}

interface AssetInfo {
  name: string
  ticker: string
  asset_id: string
  precision: number
  min_initial_client_amount: number
  max_initial_client_amount: number
  min_initial_lsp_amount: number
  max_initial_lsp_amount: number
  min_channel_amount: number
  max_channel_amount: number
}

interface FormFields {
  capacitySat: number
  clientBalanceSat: number
  assetId: string
  assetAmount: number
  channelExpireBlocks: number
  pubKeyAndAddress?: string
}

export const Step1 = ({ error, onNext, onBack }: Props) => {
  const channelRequestForm = useAppSelector((state) =>
    channelSliceSelectors.form(state, 'request')
  )

  const dispatch = useAppDispatch()
  const [maxCapacity] = useState<number>(MAX_CHANNEL_CAPACITY)
  const [assetMap, setAssetMap] = useState<Record<string, AssetInfo>>({})
  const [addAsset, setAddAsset] = useState(true)
  const [getInfoRequest, getInfoResponse] =
    makerApi.endpoints.get_info.useLazyQuery()

  const { register, handleSubmit, setValue, control, watch, formState } =
    useForm<FormFields>({
      criteriaMode: 'all',
      defaultValues: {
        ...channelRequestForm,
      },
      resolver: zodResolver(ChannelRequestFormSchema),
    })

  const assetAmount = watch('assetAmount')
  const capacitySat = watch('capacitySat')
  const clientBalanceSat = watch('clientBalanceSat')
  const assetId = watch('assetId')

  useEffect(() => {
    getInfoRequest()
  }, [getInfoRequest])

  useEffect(() => {
    if (getInfoResponse.isSuccess && getInfoResponse.data?.assets) {
      const tmpMap: Record<string, AssetInfo> = {}

      // Iteration on nested assets
      Object.values(getInfoResponse.data.assets).forEach((assetGroup) => {
        Object.values(assetGroup).forEach((asset: AssetInfo) => {
          tmpMap[asset.asset_id] = asset
        })
      })

      setAssetMap(tmpMap)
    }
  }, [getInfoResponse])

  const handleAmountChange =
    (setter: (value: string) => void) => (value: string) => {
      const numericValue = parseInt(value.replace(/,/g, ''), 10)
      if (!isNaN(numericValue)) {
        setter(value)
      }
    }

  const onSubmit: SubmitHandler<FormFields> = useCallback(
    (data) => {
      console.log(data)
      dispatch(channelSliceActions.setChannelRequestForm({ ...data }))
      onNext() // Use onNext from props
    },
    [dispatch, onNext]
  )

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="text-center mb-10">
        <h3 className="text-2xl font-semibold mb-4">
          Request an RGB Channel from LSP - Step 1
        </h3>
        <h4 className="text-lg font-medium mb-2">
          Select asset and amount for the requested channel
        </h4>
      </div>

      <div className="px-20">
        <div className="flex mb-10">
          <input
            className="px-6 py-4 w-full border border-divider border-r-0 bg-blue-dark outline-none rounded-l"
            {...register('pubKeyAndAddress')}
            placeholder="Paste the Public Key Here"
            readOnly
            type="text"
            value="https://localhost:8000"
          />
          <div className="bg-blue-dark border border-divider border-l-0 rounded-r flex items-center px-6">
            <CheckmarkIcon />
          </div>
        </div>

        <div className="bg-section-lighter px-6 py-6 rounded divide-y divide-divider">
          <div className="py-6">
            <div className="text-xs mb-3">Select channel capacity</div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  {...register('capacitySat', { valueAsNumber: true })}
                  className="rounded bg-blue-dark px-4 py-3 w-full outline-none"
                  max={maxCapacity}
                  min={MIN_CHANNEL_CAPACITY}
                  onChange={(e) =>
                    handleAmountChange(setValue.bind(null, 'capacitySat'))(
                      e.target.value
                    )
                  }
                  placeholder="Enter amount"
                  type="text"
                  value={capacitySat.toLocaleString()}
                />
                <input
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  max={maxCapacity}
                  min={MIN_CHANNEL_CAPACITY}
                  onChange={(e) =>
                    handleAmountChange(setValue.bind(null, 'capacitySat'))(
                      e.target.value
                    )
                  }
                  step="1"
                  type="range"
                  value={capacitySat}
                />
                {formState.errors.capacitySat && (
                  <div className="text-sm text-red mt-2">
                    <p className="text-red-500 text-xs italic">
                      {formState.errors.capacitySat.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="py-6">
            <div className="text-xs mb-3">Select your channel liquidity</div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  {...register('clientBalanceSat', { valueAsNumber: true })}
                  className="rounded bg-blue-dark px-4 py-3 w-full outline-none"
                  max={capacitySat}
                  min={0}
                  onChange={(e) =>
                    handleAmountChange(setValue.bind(null, 'clientBalanceSat'))(
                      e.target.value
                    )
                  }
                  placeholder="Enter amount"
                  type="text"
                  value={clientBalanceSat.toLocaleString()}
                />
                <input
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  max={capacitySat}
                  min={0}
                  onChange={(e) =>
                    handleAmountChange(setValue.bind(null, 'clientBalanceSat'))(
                      e.target.value
                    )
                  }
                  step="1"
                  type="range"
                  value={clientBalanceSat}
                />
                {formState.errors.clientBalanceSat && (
                  <div className="text-sm text-red mt-2">
                    <p className="text-red-500 text-xs italic">
                      {formState.errors.clientBalanceSat.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="py-6">
            <div className="text-xs mb-3">Select channel lock duration</div>
            <Controller
              control={control}
              name="channelExpireBlocks"
              render={({ field }) => (
                <Select
                  active={field.value.toString()}
                  onSelect={(value) => field.onChange(parseInt(value))}
                  options={[
                    { label: '1 week', value: (6 * 24 * 7).toString() },
                    { label: '1 month', value: (6 * 24 * 30).toString() },
                    { label: '6 months', value: (6 * 24 * 30 * 6).toString() },
                  ]}
                  theme="dark"
                />
              )}
            />
          </div>

          <div className="py-6">
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
            {addAsset && (
              <>
                <div className="text-xs mb-3">Select asset</div>
                <Controller
                  control={control}
                  name="assetId"
                  render={({ field }) => (
                    <Select
                      active={field.value}
                      onSelect={field.onChange}
                      options={Object.entries(assetMap).map(
                        ([, /*assetId*/ assetInfo]) => ({
                          label: `${assetInfo.name} (${assetInfo.ticker})`,
                          value: assetInfo.asset_id,
                        })
                      )}
                      theme="dark"
                    />
                  )}
                />
                {assetId && (
                  <>
                    <div className="text-xs mb-3">
                      Select amount of the asset
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <input
                          {...register('assetAmount', { valueAsNumber: true })}
                          className="rounded bg-blue-dark px-4 py-3 w-full outline-none"
                          max={assetMap[assetId]?.max_channel_amount || 10000}
                          min={0}
                          onChange={(e) =>
                            handleAmountChange(
                              setValue.bind(null, 'assetAmount')
                            )(e.target.value)
                          }
                          placeholder="Enter amount"
                          type="number"
                          value={assetAmount}
                        />
                        <input
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                          max={assetMap[assetId]?.max_channel_amount || 10000}
                          min={0}
                          onChange={(e) =>
                            handleAmountChange(
                              setValue.bind(null, 'assetAmount')
                            )(e.target.value)
                          }
                          step="1"
                          type="range"
                          value={assetAmount}
                        />
                        {formState.errors.assetAmount && (
                          <div className="text-sm text-red mt-2">
                            <p className="text-red-500 text-xs italic">
                              {formState.errors.assetAmount.message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-20">
        <button
          className="px-6 py-3 rounded text-lg font-medium text-grey-light"
          onClick={onBack} // Use onBack from props
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

      {!formState.isSubmitSuccessful && formState.isSubmitted && <FormError />}
    </form>
  )
}
