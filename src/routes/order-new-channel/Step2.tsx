import { zodResolver } from '@hookform/resolvers/zod'
import React, { useCallback, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-toastify'
import * as z from 'zod'

import { useAppDispatch } from '../../app/store/hooks'
import { AssetSelector } from '../../components/AssetSelector'
import { Select } from '../../components/Select'
import { MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY } from '../../constants'
import {
  formatNumberWithCommas,
  parseNumberWithCommas,
} from '../../helpers/number'
import {
  orderChannelSliceActions,
  OrderChannelFormSchema,
  TChannelRequestForm,
} from '../../slices/channel/orderChannel.slice'
import { makerApi } from '../../slices/makerApi/makerApi.slice'

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

interface LspOptions {
  min_required_channel_confirmations: number
  min_funding_confirms_within_blocks: number
  min_onchain_payment_confirmations: number
  supports_zero_channel_reserve: boolean
  min_onchain_payment_size_sat: number
  max_channel_expiry_blocks: number
  min_initial_client_balance_sat: number
  max_initial_client_balance_sat: number
  min_initial_lsp_balance_sat: number
  max_initial_lsp_balance_sat: number
  min_channel_balance_sat: number
  max_channel_balance_sat: number
}

const FormFieldsSchema = z.object({
  assetAmount: z.string().optional().default(''),
  assetId: z.string().optional().default(''),
  capacitySat: z.string(),
  channelExpireBlocks: z.number(),
  clientBalanceSat: z.string(),
})

type FormFields = z.infer<typeof FormFieldsSchema>

interface NumberInputProps {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  precision?: number
  label: string
  placeholder?: string
  className?: string
  error?: string
  showSlider?: boolean
  onSliderChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  sliderStep?: number
  sliderValue?: number
}

const formatSliderValue = (value: number, precision: number = 0): string => {
  if (isNaN(value) || value === 0) return ''
  const formattedValue = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(value)
  return formattedValue
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  precision = 0,
  label,
  placeholder,
  className = '',
  error,
  showSlider = false,
  onSliderChange,
  sliderStep,
  sliderValue,
}) => {
  const [displayValue, setDisplayValue] = useState(
    value ? formatNumberWithCommas(value) : ''
  )
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value ? formatNumberWithCommas(value) : '')
    }
  }, [value, isFocused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseNumberWithCommas(e.target.value)

    if (rawValue === '' || rawValue === '.') {
      setDisplayValue(rawValue)
      onChange(rawValue)
      return
    }

    const parsedValue = parseFloat(rawValue)
    if (isNaN(parsedValue)) return

    // Handle precision
    const [whole, decimal] = rawValue.split('.')
    let formattedValue = rawValue
    if (decimal && decimal.length > precision) {
      formattedValue = `${whole}.${decimal.slice(0, precision)}`
    }

    if (max !== undefined && parsedValue > max) {
      formattedValue = max.toString()
    }

    setDisplayValue(formattedValue)
    onChange(formattedValue)
  }

  // Add a new function to handle blur event
  const handleBlur = () => {
    setIsFocused(false)

    if (!value) {
      setDisplayValue('')
      return
    }

    const parsedValue = parseFloat(value)
    if (isNaN(parsedValue)) {
      setDisplayValue(formatNumberWithCommas(value))
      return
    }

    // Don't apply min constraints on blur - let the form submission handle it
    // Only apply max constraints to prevent errors
    let finalValue = value
    if (max !== undefined && parsedValue > max) {
      finalValue = max.toString()
      onChange(finalValue)
    }

    setDisplayValue(formatNumberWithCommas(finalValue))
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
        <span className="text-sm text-gray-400">
          {value ? formatSliderValue(parseFloat(value || '0'), precision) : ''}
        </span>
      </div>
      <div className="relative">
        <input
          className={`w-full px-4 py-3 bg-gray-700/50 border ${
            error ? 'border-red-500' : 'border-gray-600'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-white`}
          onBlur={handleBlur}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true)
            setDisplayValue(parseNumberWithCommas(value))
          }}
          placeholder={placeholder}
          type="text"
          value={
            isFocused ? displayValue : formatNumberWithCommas(displayValue)
          }
        />
        {error && <p className="absolute text-sm text-red-500 mt-1">{error}</p>}
      </div>
      {showSlider && (
        <input
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4 accent-blue-500"
          max={max}
          min={min}
          onChange={onSliderChange}
          step={sliderStep}
          type="range"
          value={sliderValue}
        />
      )}
    </div>
  )
}

export const Step2: React.FC<Props> = ({ onNext, onBack }) => {
  const dispatch = useAppDispatch()
  const [assetMap, setAssetMap] = useState<Record<string, AssetInfo>>({})
  const [addAsset, setAddAsset] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [lspOptions, setLspOptions] = useState<LspOptions | null>(null)
  const [effectiveMinCapacity, setEffectiveMinCapacity] =
    useState<number>(MIN_CHANNEL_CAPACITY)
  const [effectiveMaxCapacity, setEffectiveMaxCapacity] =
    useState<number>(MAX_CHANNEL_CAPACITY)

  const { handleSubmit, setValue, control, watch, formState } =
    useForm<FormFields>({
      defaultValues: {
        assetAmount: '',
        assetId: '',
        capacitySat: '',
        channelExpireBlocks: 1008,
        clientBalanceSat: '',
      },
      resolver: zodResolver(FormFieldsSchema),
    })

  const [getInfoRequest] = makerApi.endpoints.get_info.useLazyQuery()

  const assetId = watch('assetId')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const infoResponse = await getInfoRequest()

        if (infoResponse.data) {
          if (infoResponse.data.options) {
            setLspOptions(infoResponse.data.options)

            const lspMinCapacity =
              infoResponse.data.options.min_channel_balance_sat || 0
            const lspMaxCapacity =
              infoResponse.data.options.max_channel_balance_sat ||
              Number.MAX_SAFE_INTEGER

            const newMinCapacity = Math.max(
              MIN_CHANNEL_CAPACITY,
              lspMinCapacity
            )
            setEffectiveMinCapacity(newMinCapacity)

            const newMaxCapacity = Math.min(
              MAX_CHANNEL_CAPACITY,
              lspMaxCapacity
            )
            setEffectiveMaxCapacity(newMaxCapacity)
          }

          if (infoResponse.data.assets) {
            const tmpMap: Record<string, AssetInfo> = {}
            if (Array.isArray(infoResponse.data.assets)) {
              infoResponse.data.assets.forEach((asset: AssetInfo) => {
                tmpMap[asset.asset_id] = asset
              })
            }
            setAssetMap(tmpMap)
          }
        }
      } catch (error) {
        toast.error('Error fetching data. Please try again later.', {
          autoClose: 5000,
          position: 'bottom-right',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [getInfoRequest, setValue])

  const getAssetPrecision = useCallback(
    (assetId: string) => {
      const assetInfo = assetMap[assetId]
      return assetInfo ? assetInfo.precision : 8
    },
    [assetMap]
  )

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

  const onSubmit = useCallback(
    (data: FormFields) => {
      // Check if required fields are filled, but don't block on minimum values
      if (!data.capacitySat) {
        toast.error('Please enter a channel capacity.', {
          autoClose: 5000,
          position: 'bottom-right',
        })
        return
      }

      if (!data.clientBalanceSat) {
        toast.error('Please enter your channel liquidity.', {
          autoClose: 5000,
          position: 'bottom-right',
        })
        return
      }

      if (addAsset && !data.assetId) {
        toast.error('Please select an asset before proceeding.', {
          autoClose: 5000,
          position: 'bottom-right',
        })
        return
      }

      // Apply min/max constraints before submission
      let capacitySat = data.capacitySat
      let clientBalanceSat = data.clientBalanceSat

      const parsedCapacitySat = parseInt(capacitySat.replace(/[^0-9]/g, ''), 10)

      // Always adjust to minimum instead of blocking submission
      if (
        isNaN(parsedCapacitySat) ||
        parsedCapacitySat < effectiveMinCapacity
      ) {
        capacitySat = effectiveMinCapacity.toString()
        setValue('capacitySat', capacitySat)
        toast.info(
          `Channel capacity adjusted to minimum: ${formatNumberWithCommas(capacitySat)} sats`,
          {
            autoClose: 3000,
            position: 'bottom-right',
          }
        )
      }

      const parsedClientBalanceSat = parseInt(
        clientBalanceSat.replace(/[^0-9]/g, ''),
        10
      )

      const minClientBalance = lspOptions?.min_initial_client_balance_sat || 0
      if (
        isNaN(parsedClientBalanceSat) ||
        parsedClientBalanceSat < minClientBalance
      ) {
        clientBalanceSat = minClientBalance.toString()
        setValue('clientBalanceSat', clientBalanceSat)
        toast.info(
          `Channel liquidity adjusted to minimum: ${formatNumberWithCommas(clientBalanceSat)} sats`,
          {
            autoClose: 3000,
            position: 'bottom-right',
          }
        )
      }

      let assetAmount = data.assetAmount || ''
      if (addAsset && data.assetId) {
        const assetInfo = assetMap[data.assetId]
        if (assetInfo) {
          const minAssetAmount =
            assetInfo.min_channel_amount / Math.pow(10, assetInfo.precision)
          const parsedAmount = parseFloat(assetAmount || '0')

          if (
            (parsedAmount !== 0 && isNaN(parsedAmount)) ||
            (parsedAmount > 0 && parsedAmount < minAssetAmount)
          ) {
            assetAmount = minAssetAmount.toString()
            setValue('assetAmount', assetAmount)
            toast.info(
              `Asset amount adjusted to minimum: ${formatNumberWithCommas(assetAmount)} ${assetInfo.ticker}`,
              {
                autoClose: 3000,
                position: 'bottom-right',
              }
            )
          }
        }
      }

      const parsedAssetAmount =
        addAsset && data.assetId
          ? parseAssetAmount(assetAmount, data.assetId)
          : 0

      const submissionData: TChannelRequestForm = {
        assetAmount: parsedAssetAmount,
        assetId: data.assetId || '',
        capacitySat: parsedCapacitySat,
        channelExpireBlocks: data.channelExpireBlocks,
        clientBalanceSat: parsedClientBalanceSat,
      }

      try {
        // Validate the data using the schema
        OrderChannelFormSchema.parse(submissionData)

        // If validation passes, update Redux and proceed
        dispatch(orderChannelSliceActions.setChannelRequestForm(submissionData))
        onNext(submissionData)
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error.errors)

          // Instead of showing an error, adjust the values and try again
          const adjustedData = { ...submissionData }
          let madeAdjustments = false

          error.errors.forEach((err) => {
            const path = err.path.join('.')
            if (path === 'capacitySat' && err.message.includes('minimum')) {
              adjustedData.capacitySat = effectiveMinCapacity
              setValue('capacitySat', effectiveMinCapacity.toString())
              madeAdjustments = true
            } else if (
              path === 'capacitySat' &&
              err.message.includes('maximum')
            ) {
              adjustedData.capacitySat = MAX_CHANNEL_CAPACITY
              setValue('capacitySat', MAX_CHANNEL_CAPACITY.toString())
              madeAdjustments = true
            } else if (
              path === 'clientBalanceSat' &&
              err.message.includes('minimum')
            ) {
              const minValue = lspOptions?.min_initial_client_balance_sat || 0
              adjustedData.clientBalanceSat = minValue
              setValue('clientBalanceSat', minValue.toString())
              madeAdjustments = true
            } else if (
              path === 'assetAmount' &&
              addAsset &&
              data.assetId &&
              assetMap[data.assetId]
            ) {
              const assetInfo = assetMap[data.assetId]
              const minAssetAmount =
                assetInfo.min_channel_amount / Math.pow(10, assetInfo.precision)
              adjustedData.assetAmount =
                minAssetAmount * Math.pow(10, assetInfo.precision)
              setValue('assetAmount', minAssetAmount.toString())
              madeAdjustments = true
            }
          })

          if (madeAdjustments) {
            toast.info('Some values were adjusted to meet requirements.', {
              autoClose: 3000,
              position: 'bottom-right',
            })

            // Update Redux and proceed with adjusted data
            dispatch(
              orderChannelSliceActions.setChannelRequestForm(adjustedData)
            )
            onNext(adjustedData)
            return
          }

          toast.error(
            'There was an error with the form data. Please check your inputs.'
          )
        } else {
          toast.error('An unexpected error occurred. Please try again.')
        }
      }
    },
    [
      addAsset,
      onNext,
      parseAssetAmount,
      dispatch,
      setValue,
      effectiveMinCapacity,
      lspOptions,
      assetMap,
    ]
  )

  const getAssetMaxAmount = useCallback(() => {
    if (!assetId || !assetMap[assetId]) return 0
    const { max_channel_amount, precision } = assetMap[assetId]
    return max_channel_amount / Math.pow(10, precision)
  }, [assetId, assetMap])

  const getAssetMinAmount = useCallback(() => {
    if (!assetId || !assetMap[assetId]) return 0
    const { min_channel_amount, precision } = assetMap[assetId]
    return min_channel_amount / Math.pow(10, precision)
  }, [assetId, assetMap])

  const getChannelExpiryOptions = useCallback(() => {
    const options = [
      { label: '1 week', value: (6 * 24 * 7).toString() },
      { label: '1 month', value: (6 * 24 * 30).toString() },
    ]

    const sixMonthsBlocks = 6 * 24 * 30 * 6
    if (
      !lspOptions ||
      sixMonthsBlocks <= lspOptions.max_channel_expiry_blocks
    ) {
      options.push({ label: '6 months', value: sixMonthsBlocks.toString() })
    }

    return options
  }, [lspOptions])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Configure Your Channel
          </h2>
          <p className="text-gray-400 mt-2">Set up your channel parameters</p>
          <p className="text-gray-400 mt-1">
            Fees will be calculated in the next step based on all parameters
            including channel capacity, duration, and assets
          </p>
        </div>

        <div className="flex justify-between mb-8">
          <div className="flex items-center opacity-50">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
              1
            </div>
            <div className="ml-3">
              <p className="font-medium text-white">Connect LSP</p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
          </div>
          <div className="flex-1 mx-4 mt-5">
            <div className="h-1 bg-gray-700">
              <div className="h-1 bg-blue-500 w-1/2"></div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              2
            </div>
            <div className="ml-3">
              <p className="font-medium text-white">Configure</p>
              <p className="text-sm text-gray-400">Current step</p>
            </div>
          </div>
          <div className="flex-1 mx-4 mt-5">
            <div className="h-1 bg-gray-700"></div>
          </div>
          <div className="flex items-center opacity-50">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
              3
            </div>
            <div className="ml-3">
              <p className="font-medium text-white">Payment</p>
              <p className="text-sm text-gray-400">Next step</p>
            </div>
          </div>
        </div>

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
                  <span className="ml-2 text-gray-400 hover:text-gray-300 cursor-help relative group">
                    ⓘ
                    <span
                      className="invisible group-hover:visible absolute left-0 
                      bg-gray-900 text-white text-sm rounded py-1 px-2 w-80
                      shadow-lg z-50 top-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      The total size of your Lightning channel in satoshis. Min:{' '}
                      {effectiveMinCapacity.toLocaleString()} sats Max:{' '}
                      {effectiveMaxCapacity.toLocaleString()} sats. This
                      determines the maximum amount you can send or receive
                      through this channel. You'll need to pay fees based on
                      this capacity.
                    </span>
                  </span>
                </label>
                <NumberInput
                  className="group transition-all duration-300 hover:translate-x-1"
                  error={formState.errors.capacitySat?.message}
                  label=""
                  max={effectiveMaxCapacity}
                  min={effectiveMinCapacity}
                  onChange={(value) => setValue('capacitySat', value)}
                  onSliderChange={(e) =>
                    setValue('capacitySat', e.target.value)
                  }
                  placeholder="Enter amount"
                  showSlider
                  sliderStep={1000}
                  sliderValue={
                    watch('capacitySat')
                      ? parseInt(
                          parseNumberWithCommas(watch('capacitySat')) || '0',
                          10
                        )
                      : effectiveMinCapacity
                  }
                  value={watch('capacitySat')}
                />
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  Your Channel Liquidity (sats)
                  <span className="ml-2 text-gray-400 hover:text-gray-300 cursor-help relative group">
                    ⓘ
                    <span
                      className="invisible group-hover:visible absolute left-0 
                      bg-gray-900 text-white text-sm rounded py-1 px-2 w-80
                      shadow-lg z-50 top-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      Also known as outbound liquidity - the amount of satoshis
                      you'll have available to send. The remaining capacity will
                      be on the LSP side for receiving payments. Min:{' '}
                      {lspOptions?.min_initial_client_balance_sat.toLocaleString() ||
                        0}{' '}
                      sats, Max:{' '}
                      {Math.min(
                        lspOptions?.max_initial_client_balance_sat ||
                          Number.MAX_SAFE_INTEGER,
                        effectiveMaxCapacity
                      ).toLocaleString()}{' '}
                      sats (or your chosen channel capacity). You'll need to pay
                      for this liquidity - fees will be shown in the next step.
                    </span>
                  </span>
                </label>
                <NumberInput
                  className="group transition-all duration-300 hover:translate-x-1"
                  error={formState.errors.clientBalanceSat?.message}
                  label=""
                  max={Math.min(
                    parseInt(
                      parseNumberWithCommas(watch('capacitySat')) || '0',
                      10
                    ),
                    lspOptions?.max_initial_client_balance_sat ||
                      Number.MAX_SAFE_INTEGER
                  )}
                  min={lspOptions?.min_initial_client_balance_sat || 0}
                  onChange={(value) => setValue('clientBalanceSat', value)}
                  onSliderChange={(e) =>
                    setValue('clientBalanceSat', e.target.value)
                  }
                  placeholder="Enter amount"
                  showSlider
                  sliderStep={1000}
                  sliderValue={
                    watch('clientBalanceSat')
                      ? parseInt(
                          parseNumberWithCommas(watch('clientBalanceSat')) ||
                            '0',
                          10
                        )
                      : lspOptions?.min_initial_client_balance_sat || 0
                  }
                  value={watch('clientBalanceSat')}
                />
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  Channel Lock Duration
                  <span className="ml-2 text-gray-400 hover:text-gray-300 cursor-help relative group">
                    ⓘ
                    <span
                      className="invisible group-hover:visible absolute left-0 
                      bg-gray-900 text-white text-sm rounded py-1 px-2 w-80
                      shadow-lg z-50 top-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      The minimum time the LSP guarantees to keep your channel
                      open. Longer durations provide more stability but may
                      affect fees. 1 week = 1,008 blocks 1 month = 4,320 blocks
                      6 months = 25,920 blocks. Max:{' '}
                      {lspOptions?.max_channel_expiry_blocks.toLocaleString() ||
                        0}{' '}
                      blocks.
                    </span>
                  </span>
                </label>
                <Controller
                  control={control}
                  name="channelExpireBlocks"
                  render={({ field }) => (
                    <Select
                      active={field.value.toString()}
                      onSelect={(value) => field.onChange(parseInt(value))}
                      options={getChannelExpiryOptions()}
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
                  <span className="ml-2 text-gray-400 hover:text-gray-300 cursor-help relative group">
                    ⓘ
                    <span
                      className="invisible group-hover:visible absolute left-0 
                      bg-gray-900 text-white text-sm rounded py-1 px-2 w-96
                      shadow-lg z-50 top-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      Adding an RGB asset enables you to receive that asset
                      through this channel. The amount you specify will be held
                      by the LSP, determining how much you can receive.
                    </span>
                  </span>
                </label>

                {addAsset && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Select Asset
                        <span className="ml-2 text-gray-400 hover:text-gray-300 cursor-help relative group">
                          ⓘ
                          <span
                            className="invisible group-hover:visible absolute left-0 
                            bg-gray-900 text-white text-sm rounded py-1 px-2 w-80
                            shadow-lg z-50 top-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            Choose an RGB asset to add to your channel. The
                            selected amount will be on the LSP side, allowing
                            you to receive the asset. Additional fees will apply
                            based on the asset type and amount.
                          </span>
                        </span>
                      </label>
                      <AssetSelector
                        assetMap={assetMap}
                        control={control}
                        name="assetId"
                      />
                    </div>

                    {assetId && (
                      <div>
                        <NumberInput
                          className="group transition-all duration-300 hover:translate-x-1"
                          error={formState.errors.assetAmount?.message}
                          label={`Asset Amount (${assetMap[assetId]?.ticker || ''})`}
                          max={getAssetMaxAmount()}
                          min={getAssetMinAmount()}
                          onChange={(value) => setValue('assetAmount', value)}
                          onSliderChange={(e) =>
                            setValue('assetAmount', e.target.value)
                          }
                          placeholder="Enter amount"
                          precision={getAssetPrecision(assetId)}
                          showSlider
                          sliderStep={
                            1 / Math.pow(10, getAssetPrecision(assetId))
                          }
                          sliderValue={
                            watch('assetAmount')
                              ? parseFloat(
                                  parseNumberWithCommas(watch('assetAmount')) ||
                                    '0'
                                )
                              : getAssetMinAmount()
                          }
                          value={watch('assetAmount')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between space-x-4 mt-10">
            <button
              className="px-6 py-3 rounded-lg text-lg font-bold bg-gray-600 hover:bg-gray-700 transition-colors"
              onClick={onBack}
              type="button"
            >
              Back
            </button>
            <button
              className={`px-6 py-3 rounded-lg text-lg font-bold ${
                isLoading
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 transition-colors'
              }`}
              disabled={isLoading}
              type="submit"
            >
              Next Step
            </button>
          </div>

          {!formState.isSubmitSuccessful && formState.isSubmitted && (
            <FormError />
          )}
        </form>
      </div>
    </div>
  )
}
