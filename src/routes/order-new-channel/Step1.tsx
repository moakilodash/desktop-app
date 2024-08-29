import { zodResolver } from '@hookform/resolvers/zod'
import React, { useCallback, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast, ToastContainer } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { AssetSelector } from '../../components/AssetSelector'
import { Select } from '../../components/Select'
import { MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY } from '../../constants'
import {
  OrderChannelFormSchema,
  TChannelRequestForm,
  orderChannelSliceSelectors,
  initialState,
} from '../../slices/channel/orderChannel.slice'
import { makerApi } from '../../slices/makerApi/makerApi.slice'

import { FormError } from './FormError'
import 'react-toastify/dist/ReactToastify.css'

interface Props {
  onNext: (data: TChannelRequestForm) => void
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
  assetAmount: number
  assetId: string
  capacitySat: number
  channelExpireBlocks: number
  clientBalanceSat: number
}

export const Step1: React.FC<Props> = ({ onNext }) => {
  const dispatch = useAppDispatch()
  const [assetMap, setAssetMap] = useState<Record<string, AssetInfo>>({})
  const [addAsset, setAddAsset] = useState(true)
  const orderChannelForm = useAppSelector((state) =>
    orderChannelSliceSelectors.form(state, 'request')
  )

  const { register, handleSubmit, setValue, control, watch, formState } =
    useForm<FormFields>({
      criteriaMode: 'all',
      defaultValues: {
        ...initialState.forms.request,
      },
      resolver: zodResolver(OrderChannelFormSchema),
      values: orderChannelForm,
    })

  const [getInfoRequest] = makerApi.endpoints.get_info.useLazyQuery()

  const assetAmount = watch('assetAmount')
  const capacitySat = watch('capacitySat')
  const clientBalanceSat = watch('clientBalanceSat')
  const assetId = watch('assetId')

  useEffect(() => {
    getInfoRequest().then((response) => {
      if (response.data?.assets) {
        const tmpMap: Record<string, AssetInfo> = {}
        if (Array.isArray(response.data.assets)) {
          response.data.assets.forEach((asset: AssetInfo) => {
            tmpMap[asset.asset_id] = asset
          })
        }
        setAssetMap(tmpMap)
      } else if (response.error) {
        toast.error(
          'There was an error fetching the assets. Please try again later.'
        )
      }
    })
  }, [getInfoRequest])

  const handleAmountChange =
    (setter: (value: number) => void) => (value: string) => {
      const numericValue = parseInt(value.replace(/,/g, ''), 10)
      if (!isNaN(numericValue)) {
        setter(numericValue)
      }
    }

  const onSubmit = useCallback(
    (data: TChannelRequestForm) => {
      console.log('Form submitted with data:', data)
      onNext(data)
    },
    [dispatch, onNext]
  )

  const maxAssetAmount = assetId
    ? assetMap[assetId]?.max_channel_amount || MAX_CHANNEL_CAPACITY
    : MAX_CHANNEL_CAPACITY

  return (
    <form
      className="bg-gray-900 text-white p-8 rounded-lg shadow-lg"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h3 className="text-3xl font-bold mb-6 text-center">
        Request an RGB Channel from LSP
      </h3>
      <h4 className="text-xl font-semibold mb-8 text-center text-gray-300">
        Select asset and amount for the requested channel
      </h4>

      <div className="space-y-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block text-sm font-medium mb-2">
            Channel Capacity (sats)
          </label>
          <div className="flex items-center space-x-4">
            <input
              {...register('capacitySat', { valueAsNumber: true })}
              className="bg-gray-700 text-white px-4 py-2 rounded-md w-full"
              max={MAX_CHANNEL_CAPACITY}
              min={MIN_CHANNEL_CAPACITY}
              onChange={(e) =>
                handleAmountChange(setValue.bind(null, 'capacitySat'))(
                  e.target.value
                )
              }
              placeholder="Enter amount"
              type="number"
            />
            <span className="text-lg font-semibold w-24 text-right">
              {capacitySat.toLocaleString()}
            </span>
          </div>
          <input
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"
            max={MAX_CHANNEL_CAPACITY}
            min={MIN_CHANNEL_CAPACITY}
            onChange={(e) =>
              handleAmountChange(setValue.bind(null, 'capacitySat'))(
                e.target.value
              )
            }
            step="1000"
            type="range"
            value={capacitySat}
          />
          {formState.errors.capacitySat && (
            <p className="text-red-500 text-sm mt-2">
              {formState.errors.capacitySat.message}
            </p>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block text-sm font-medium mb-2">
            Your Channel Liquidity (sats)
          </label>
          <div className="flex items-center space-x-4">
            <input
              {...register('clientBalanceSat', { valueAsNumber: true })}
              className="bg-gray-700 text-white px-4 py-2 rounded-md w-full"
              max={capacitySat}
              min={0}
              onChange={(e) =>
                handleAmountChange(setValue.bind(null, 'clientBalanceSat'))(
                  e.target.value
                )
              }
              placeholder="Enter amount"
              type="number"
            />
            <span className="text-lg font-semibold w-24 text-right">
              {clientBalanceSat.toLocaleString()}
            </span>
          </div>
          <input
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"
            max={capacitySat}
            min={0}
            onChange={(e) =>
              handleAmountChange(setValue.bind(null, 'clientBalanceSat'))(
                e.target.value
              )
            }
            step="1000"
            type="range"
            value={clientBalanceSat}
          />
          {formState.errors.clientBalanceSat && (
            <p className="text-red-500 text-sm mt-2">
              {formState.errors.clientBalanceSat.message}
            </p>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block text-sm font-medium mb-2">
            Channel Lock Duration
          </label>
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

        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="flex items-center space-x-3 mb-4">
            <input
              checked={addAsset}
              className="form-checkbox h-5 w-5 text-purple-500"
              onChange={(e) => setAddAsset(e.target.checked)}
              type="checkbox"
            />
            <span className="text-lg font-medium">Add Asset</span>
          </label>

          {addAsset && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Asset
                </label>
                <AssetSelector
                  assetMap={assetMap}
                  control={control}
                  name="assetId"
                />
              </div>

              {assetId && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Asset Amount
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      {...register('assetAmount', { valueAsNumber: true })}
                      className="bg-gray-700 text-white px-4 py-2 rounded-md w-full"
                      max={maxAssetAmount}
                      min={0}
                      onChange={(e) =>
                        handleAmountChange(setValue.bind(null, 'assetAmount'))(
                          e.target.value
                        )
                      }
                      placeholder="Enter amount"
                      type="number"
                    />
                    <span className="text-lg font-semibold w-24 text-right">
                      {assetAmount.toLocaleString()}
                    </span>
                  </div>
                  <input
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"
                    max={maxAssetAmount}
                    min={0}
                    onChange={(e) =>
                      handleAmountChange(setValue.bind(null, 'assetAmount'))(
                        e.target.value
                      )
                    }
                    step="1"
                    type="range"
                    value={assetAmount}
                  />
                  {formState.errors.assetAmount && (
                    <p className="text-red-500 text-sm mt-2">
                      {formState.errors.assetAmount.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-10">
        <button
          className="px-6 py-3 rounded-lg text-lg font-bold bg-purple-600 hover:bg-purple-700 transition-colors"
          type="submit"
        >
          Next Step
        </button>
      </div>

      {!formState.isSubmitSuccessful && formState.isSubmitted && <FormError />}
      <ToastContainer />
    </form>
  )
}
