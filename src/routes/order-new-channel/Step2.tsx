import { zodResolver } from '@hookform/resolvers/zod'
import React, { useCallback, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'

import { useAppSelector } from '../../app/store/hooks'
import { AssetSelector } from '../../components/AssetSelector'
import { Select } from '../../components/Select'
import { MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY } from '../../constants'
import {
  orderChannelSliceSelectors,
  initialState,
} from '../../slices/channel/orderChannel.slice'
import { makerApi } from '../../slices/makerApi/makerApi.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { FormError } from './FormError'
import 'react-toastify/dist/ReactToastify.css'

interface Props {
  onNext: (data: TChannelRequestForm) => void
  onBack: () => void
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

const OrderChannelFormSchema = z.object({
  assetAmount: z.string(),
  assetId: z.string(),
  capacitySat: z.string(),
  channelExpireBlocks: z.number(),
  clientBalanceSat: z.string(),
})

type FormFields = {
  assetAmount: string
  assetId: string
  capacitySat: string
  channelExpireBlocks: number
  clientBalanceSat: string
}

export type TChannelRequestForm = {
  assetAmount: number
  assetId: string
  capacitySat: number
  channelExpireBlocks: number
  clientBalanceSat: number
}

export const Step2: React.FC<Props> = ({ onNext }) => {
  const [assetMap, setAssetMap] = useState<Record<string, AssetInfo>>({})
  const [addAsset, setAddAsset] = useState(false)
  const [coloredBtcBalance, setColoredBtcBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const orderChannelForm = useAppSelector((state) =>
    orderChannelSliceSelectors.form(state, 'request')
  ) as unknown as FormFields

  const { register, handleSubmit, setValue, control, watch, formState } =
    useForm<FormFields>({
      criteriaMode: 'all',
      defaultValues: {
        ...initialState.forms.request,
        assetAmount: '0',
        capacitySat: MIN_CHANNEL_CAPACITY.toString(),
        clientBalanceSat: '0',
      },
      resolver: zodResolver(OrderChannelFormSchema),
      values: orderChannelForm,
    })

  const [getInfoRequest] = makerApi.endpoints.get_info.useLazyQuery()
  const [getBtcBalanceRequest] = nodeApi.endpoints.btcBalance.useLazyQuery()
  // const [getCreateUTXOsRequest] = nodeApi.endpoints.createUTXOs.useLazyQuery()

  const assetAmount = watch('assetAmount')
  const capacitySat = watch('capacitySat')
  const clientBalanceSat = watch('clientBalanceSat')
  const assetId = watch('assetId')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [infoResponse, balanceResponse] = await Promise.all([
          getInfoRequest(),
          getBtcBalanceRequest(),
        ])

        if (infoResponse.data?.assets) {
          const tmpMap: Record<string, AssetInfo> = {}
          if (Array.isArray(infoResponse.data.assets)) {
            infoResponse.data.assets.forEach((asset: AssetInfo) => {
              tmpMap[asset.asset_id] = asset
            })
          }
          setAssetMap(tmpMap)
        }

        if (balanceResponse.data) {
          setColoredBtcBalance(balanceResponse.data.colored.spendable)
        }
      } catch (error) {
        toast.error('Error fetching data. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [getInfoRequest, getBtcBalanceRequest])

  const getAssetPrecision = useCallback(
    (assetId: string) => {
      const assetInfo = assetMap[assetId]
      return assetInfo ? assetInfo.precision : 8 // Default to 8 if not found
    },
    [assetMap]
  )
  const handleAssetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    let parsedValue = parseFloat(value)

    if (isNaN(parsedValue)) {
      parsedValue = 0
    }

    const maxAmount = getAssetMaxAmount()
    parsedValue = Math.max(0, Math.min(maxAmount, parsedValue))

    setValue('assetAmount', parsedValue.toString())
  }

  const parseAssetAmount = useCallback(
    (amount: string, assetId: string): number => {
      const precision = getAssetPrecision(assetId)
      const multiplier = Math.pow(10, precision)
      if (amount === '') {
        return 0
      }
      const cleanAmount = amount.replace(/[^\d.-]/g, '')
      return Math.round(parseFloat(cleanAmount) * multiplier)
    },
    [getAssetPrecision]
  )

  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'capacitySat' | 'clientBalanceSat' | 'assetAmount'
  ) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    let parsedValue = parseInt(value, 10)

    if (field === 'capacitySat') {
      parsedValue = Math.max(
        MIN_CHANNEL_CAPACITY,
        Math.min(MAX_CHANNEL_CAPACITY, parsedValue)
      )
    } else if (field === 'clientBalanceSat') {
      const maxClientBalance = parseInt(capacitySat.replace(/[^0-9]/g, ''), 10)
      parsedValue = Math.max(0, Math.min(maxClientBalance, parsedValue))
    } else if (field === 'assetAmount' && assetId) {
      const maxAssetAmount = assetMap[assetId]?.max_channel_amount || 0
      parsedValue = Math.max(0, Math.min(maxAssetAmount, parsedValue))
    }

    const formattedValue = new Intl.NumberFormat('en-US').format(parsedValue)
    setValue(field, formattedValue)
  }

  const handleSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'capacitySat' | 'clientBalanceSat' | 'assetAmount'
  ) => {
    const value = parseInt(e.target.value, 10)
    const formattedValue = new Intl.NumberFormat('en-US').format(value)
    setValue(field, formattedValue)
  }

  const onSubmit = useCallback(
    (data: FormFields) => {
      if (
        addAsset &&
        parseInt(data.capacitySat.replace(/[^0-9]/g, ''), 10) >
          coloredBtcBalance
      ) {
        return
      }

      const submissionData: TChannelRequestForm = {
        ...data,
        assetAmount: addAsset
          ? parseAssetAmount(data.assetAmount, data.assetId)
          : 0,
        capacitySat: parseInt(data.capacitySat.replace(/[^0-9]/g, ''), 10),
        channelExpireBlocks: data.channelExpireBlocks,
        clientBalanceSat: parseInt(
          data.clientBalanceSat.replace(/[^0-9]/g, ''),
          10
        ),
      }
      console.log('Form submitted with data:', submissionData)
      onNext(submissionData)
    },
    [addAsset, coloredBtcBalance, onNext, parseAssetAmount]
  )

  const handleAssetAmountSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value)
    setValue('assetAmount', value.toString())
  }

  const getAssetMaxAmount = useCallback(() => {
    if (!assetId || !assetMap[assetId]) return 0
    const { max_channel_amount, precision } = assetMap[assetId]
    return max_channel_amount / Math.pow(10, precision)
  }, [assetId, assetMap])

  const handleCreateUTXO = async () => {
    try {
      setIsLoading(true)
      // const response = await getCreateUTXOsRequest()
      // if (response.data) {
      //   toast.success('New colored UTXOs created successfully.')
      //   const balanceResponse = await getBtcBalanceRequest()
      //   if (balanceResponse.data) {
      //     setColoredBtcBalance(balanceResponse.data.colored.spendable)
      //   }
      // }
    } catch (error) {
      toast.error('Failed to create new colored UTXOs. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isCapacityExceedingBalance =
    addAsset &&
    parseInt(capacitySat.replace(/[^0-9]/g, ''), 10) > coloredBtcBalance

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

      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="space-y-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              Channel Capacity (sats)
            </label>
            <div className="flex items-center space-x-4">
              <input
                {...register('capacitySat')}
                className={`bg-gray-700 text-white px-4 py-2 rounded-md w-full ${
                  isCapacityExceedingBalance ? 'border-red-500 border-2' : ''
                }`}
                onChange={(e) => handleAmountChange(e, 'capacitySat')}
                placeholder="Enter amount"
                type="text"
              />
            </div>
            <input
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"
              max={MAX_CHANNEL_CAPACITY}
              min={MIN_CHANNEL_CAPACITY}
              onChange={(e) => handleSliderChange(e, 'capacitySat')}
              step="1000"
              type="range"
              value={parseInt(capacitySat.replace(/[^0-9]/g, ''), 10)}
            />
            {formState.errors.capacitySat && (
              <p className="text-red-500 text-sm mt-2">
                {formState.errors.capacitySat.message}
              </p>
            )}
            {isCapacityExceedingBalance && (
              <div className="mt-2 text-red-500">
                <p>
                  Capacity exceeds available colored sats (
                  {new Intl.NumberFormat('en-US').format(coloredBtcBalance)}{' '}
                  sats).
                </p>
                <button
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={handleCreateUTXO}
                  type="button"
                >
                  Create New Colored UTXO
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              Your Channel Liquidity (sats)
            </label>
            <div className="flex items-center space-x-4">
              <input
                {...register('clientBalanceSat')}
                className="bg-gray-700 text-white px-4 py-2 rounded-md w-full"
                onChange={(e) => handleAmountChange(e, 'clientBalanceSat')}
                placeholder="Enter amount"
                type="text"
              />
            </div>
            <input
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"
              max={parseInt(capacitySat.replace(/[^0-9]/g, ''), 10)}
              min={0}
              onChange={(e) => handleSliderChange(e, 'clientBalanceSat')}
              step="1000"
              type="range"
              value={parseInt(clientBalanceSat.replace(/[^0-9]/g, ''), 10)}
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
                        {...register('assetAmount')}
                        className="bg-gray-700 text-white px-4 py-2 rounded-md w-full"
                        onChange={handleAssetAmountChange}
                        placeholder="Enter amount"
                        step="0.1"
                        type="text"
                      />
                    </div>
                    <input
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"
                      max={getAssetMaxAmount()}
                      min={0}
                      onChange={handleAssetAmountSliderChange}
                      step={0.1}
                      type="range"
                      value={parseFloat(assetAmount)}
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
      )}

      <div className="flex justify-end space-x-4 mt-10">
        <button
          className={`px-6 py-3 rounded-lg text-lg font-bold ${
            isCapacityExceedingBalance || isLoading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 transition-colors'
          }`}
          disabled={isCapacityExceedingBalance || isLoading}
          type="submit"
        >
          Next Step
        </button>
      </div>

      {!formState.isSubmitSuccessful && formState.isSubmitted && <FormError />}
    </form>
  )
}
