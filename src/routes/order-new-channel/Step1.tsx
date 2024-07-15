import { ChevronDownIcon, CopyIcon, CheckIcon } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast, ToastContainer } from 'react-toastify'

import { useAppDispatch } from '../../app/store/hooks'
import { Select } from '../../components/Select'
import { MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY } from '../../constants'
import {
  // OrderChannelFormSchema,
  orderChannelSliceActions,
  // orderChannelSliceSelectors,
  initialState,
} from '../../slices/channel/orderChannel.slice'
import { makerApi } from '../../slices/makerApi/makerApi.slice'

import { FormError } from './FormError'

interface Props {
  onBack: VoidFunction
  onNext: VoidFunction
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
}

interface AssetOptionProps {
  assetInfo: AssetInfo
  assetId: string
  onSelect: (value: string) => void
}

const AssetOption: React.FC<AssetOptionProps> = ({
  assetInfo,
  assetId,
  onSelect,
}) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(assetId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="flex justify-between items-center p-3 hover:bg-gray-700 cursor-pointer"
      onClick={() => onSelect(assetId)}
    >
      <div className="flex items-center">
        {/* <img 
          src={assetIcons[assetInfo.ticker] || '/icons/default.svg'} 
          alt={assetInfo.ticker}
          className="w-6 h-6 mr-2"
        /> */}
        <div>
          <div className="font-medium">{`${assetInfo.name} (${assetInfo.ticker})`}</div>
          <div className="text-sm text-gray-400 break-all">{assetId}</div>
        </div>
      </div>
      <button
        className="p-1 hover:bg-gray-600 rounded"
        onClick={copyToClipboard}
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      </button>
    </div>
  )
}

interface AssetSelectorProps {
  control: any
  name: string
  assetMap: Record<string, AssetInfo>
}

const AssetSelector: React.FC<AssetSelectorProps> = ({
  control,
  name,
  assetMap,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selectedAsset = assetMap[field.value]
        return (
          <div className="relative">
            <div
              className="bg-gray-700 p-3 rounded-md flex justify-between items-center cursor-pointer"
              onClick={() => setIsOpen(!isOpen)}
            >
              {field.value && selectedAsset ? (
                <div className="flex items-center">
                  {/* <img 
                    src={assetIcons[selectedAsset.ticker] || '/icons/default.svg'} 
                    alt={selectedAsset.ticker}
                    className="w-6 h-6 mr-2"
                  /> */}
                  <span>{`${selectedAsset.name} (${selectedAsset.ticker})`}</span>
                </div>
              ) : (
                <span>Select an asset</span>
              )}
              <ChevronDownIcon size={20} />
            </div>
            {isOpen && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                {Object.entries(assetMap).map(([assetId, assetInfo]) => (
                  <AssetOption
                    assetId={assetId}
                    assetInfo={assetInfo}
                    key={assetId}
                    onSelect={(value) => {
                      field.onChange(value)
                      setIsOpen(false)
                    }}
                  />
                ))}
              </div>
            )}
            {field.value && selectedAsset && (
              <div className="mt-2 text-sm text-gray-400 break-all">
                Asset ID: {field.value}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}

export const Step1: React.FC<Props> = ({ onBack, onNext }) => {
  const dispatch = useAppDispatch()
  const [maxCapacity, setMaxCapacity] = useState<number>(MAX_CHANNEL_CAPACITY)
  const [assetMap, setAssetMap] = useState<Record<string, AssetInfo>>({})
  const [addAsset, setAddAsset] = useState(true)
  const [getInfoRequest, getInfoResponse] =
    makerApi.endpoints.get_info.useLazyQuery()

  const form = useForm<FormFields>({
    defaultValues: initialState.forms.request,
    // resolver: zodResolver(
    //   OrderChannelFormSchema.pick({
    //     capacitySat: true,
    //     clientBalanceSat: true,
    //     assetId: true,
    //     assetAmount: true,
    //     channelExpireBlocks: true,
    //   })
    // ),
  })
  const { control, handleSubmit, register, setValue, watch, formState } = form

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
      getInfoResponse.data.assets.forEach((asset) => {
        tmpMap[asset.asset_id] = asset
      })
      setAssetMap(tmpMap)
    } else if (getInfoResponse.isError) {
      toast.error(
        'There was an error fetching the assets. Please try again later.'
      )
    }
  }, [getInfoResponse])

  const handleAmountChange =
    (setter: (value: number) => void) => (value: string) => {
      const numericValue = parseInt(value.replace(/,/g, ''), 10)
      if (!isNaN(numericValue)) {
        setter(numericValue)
      }
    }

  useEffect(() => {
    const subscription = watch((value) => {
      dispatch(orderChannelSliceActions.setChannelRequestForm(value))
    })
    return () => subscription.unsubscribe()
  }, [watch, dispatch])

  const onSubmit: SubmitHandler<FormFields> = useCallback(
    (data) => {
      console.log(data)
      dispatch(orderChannelSliceActions.setChannelRequestForm(data))
      // console.log(channelRequestForm);
      onNext()
    },
    [dispatch, onNext]
  )

  const maxAssetAmount = assetId
    ? assetMap[assetId]?.max_channel_amount || maxCapacity
    : maxCapacity

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
              max={maxCapacity}
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
            max={maxCapacity}
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
                active={field.value}
                onSelect={(value) => field.onChange(parseInt(value))}
                options={[
                  { label: '1 week', value: 6 * 24 * 7 },
                  { label: '1 month', value: 6 * 24 * 30 },
                  { label: '6 months', value: 6 * 24 * 30 * 6 },
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
          className="px-6 py-3 rounded-lg text-lg font-medium text-gray-300 hover:text-white transition-colors"
          onClick={onBack}
          type="button"
        >
          Go Back
        </button>
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
