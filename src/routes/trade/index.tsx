import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Copy } from 'lucide-react'
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'

import { webSocketService } from '../../app/hubs/websocketService'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Loader } from '../../components/Loader'
import { StatusToast } from '../../components/StatusToast'
import { SwapConfirmation } from '../../components/SwapConfirmation'
import { SwapDetails, SwapRecap } from '../../components/SwapRecap'
import {
  NoChannelsMessage,
  NoTradingPairsMessage,
  Header,
  SwapInputField,
  ExchangeRateSection,
  SwapButton,
  MakerSelector,
} from '../../components/Trade'
import { SwapIcon } from '../../icons/Swap'
import { makerApi, TradingPair } from '../../slices/makerApi/makerApi.slice'
import {
  setTradingPairs,
  subscribeToPair,
  unsubscribeFromPair,
} from '../../slices/makerApi/pairs.slice'
import { nodeApi, Channel, NiaAsset } from '../../slices/nodeApi/nodeApi.slice'
import { logger } from '../../utils/logger'
import './index.css'

interface Fields {
  rfq_id: string
  from: string
  fromAsset: string
  to: string
  toAsset: string
}

const MSATS_PER_SAT = 1000

export const Component = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  // Add these utility functions at the top level of the component
  const usePrevious = (value: any) => {
    const ref = useRef()
    useEffect(() => {
      ref.current = value
    }, [value])
    return ref.current
  }

  const form = useForm<Fields>({
    defaultValues: {
      from: '',
      fromAsset: 'BTC',
      rfq_id: '',
      to: '',
      toAsset: '',
    },
  })

  const [channels, setChannels] = useState<Channel[]>([])
  const [assets, setAssets] = useState<NiaAsset[]>([])
  const [tradablePairs, setTradablePairs] = useState<TradingPair[]>([])
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null)
  const [pubKey, setPubKey] = useState('')
  const [selectedSize, setSelectedSize] = useState(100)

  const [minFromAmount, setMinFromAmount] = useState(0)
  const [maxFromAmount, setMaxFromAmount] = useState(0)
  const [maxToAmount, setMaxToAmount] = useState(0)
  const [max_outbound_htlc_sat, setMaxOutboundHtlcSat] = useState(0)

  const [isToAmountLoading, setIsToAmountLoading] = useState(true)
  const [isPriceLoading, setIsPriceLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [isSwapInProgress, setIsSwapInProgress] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasValidChannelsForTrading, setHasValidChannelsForTrading] =
    useState(false)
  const [debouncedFromAmount, setDebouncedFromAmount] = useState('')
  const [debouncedToAmount] = useState('')
  const previousFromAmount = usePrevious(form.getValues().from)
  const previousToAmount = usePrevious(form.getValues().to)

  const [showRecap, setShowRecap] = useState<boolean>(false)
  const [swapRecapDetails, setSwapRecapDetails] = useState<SwapDetails | null>(
    null
  )

  const [showConfirmation, setShowConfirmation] = useState(false)

  // Selectors
  const makerConnectionUrl = useAppSelector(
    (state) => state.nodeSettings.data.default_maker_url
  )
  const wsConnected = useAppSelector((state) => state.pairs.wsConnected)
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)
  const selectedPairFeed = useAppSelector(
    (state) =>
      state.pairs.feed[
        selectedPair
          ? `${selectedPair.base_asset}/${selectedPair.quote_asset}`
          : ''
      ]
  )

  // API hooks
  const [listChannels] = nodeApi.endpoints.listChannels.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [taker] = nodeApi.endpoints.taker.useLazyQuery()
  const [listAssets] = nodeApi.endpoints.listAssets.useLazyQuery()
  const [initSwap] = makerApi.endpoints.initSwap.useLazyQuery()
  const [execSwap] = makerApi.endpoints.execSwap.useLazyQuery()
  const [getPairs] = makerApi.endpoints.getPairs.useLazyQuery()

  const getDisplayAsset = useCallback(
    (asset: string) => {
      return asset === 'BTC' && bitcoinUnit === 'SAT' ? 'SAT' : asset
    },
    [bitcoinUnit]
  )

  const isPairInverted = useCallback(
    (fromAsset: string, toAsset: string) => {
      if (!selectedPair) return false
      return (
        selectedPair.quote_asset === fromAsset &&
        selectedPair.base_asset === toAsset
      )
    },
    [selectedPair]
  )

  const getAssetPrecision = useCallback(
    (asset: string) => {
      if (asset === 'BTC') {
        return bitcoinUnit === 'BTC' ? 8 : 0
      }
      const assetInfo = assets.find((a) => a.ticker === asset)
      return assetInfo ? assetInfo.precision : 8
    },
    [assets, bitcoinUnit]
  )

  const formatAmount = useCallback(
    (amount: number, asset: string) => {
      const precision = getAssetPrecision(asset)
      const divisor = Math.pow(10, precision)
      const formattedAmount = (amount / divisor).toFixed(precision)
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: precision,
        minimumFractionDigits: precision,
        useGrouping: true,
      }).format(parseFloat(formattedAmount))
    },
    [getAssetPrecision]
  )

  const parseAssetAmount = useCallback(
    (amount: string | undefined | null, asset: string): number => {
      const precision = getAssetPrecision(asset)
      const multiplier = Math.pow(10, precision)

      // Handle undefined, null or empty string
      if (!amount) {
        return 0
      }

      try {
        const cleanAmount = amount.replace(/[^\d.-]/g, '')
        const parsedAmount = parseFloat(cleanAmount)

        // Handle NaN or invalid numbers
        if (isNaN(parsedAmount)) {
          return 0
        }

        return Math.round(parsedAmount * multiplier)
      } catch (error) {
        logger.error('Error parsing amount:', error)
        return 0
      }
    },
    [getAssetPrecision]
  )

  const calculateRate = useCallback(() => {
    if (selectedPairFeed && selectedPair) {
      const price = selectedPairFeed.price / selectedPairFeed.size
      const isCurrentPairInverted = isPairInverted(
        form.getValues().fromAsset,
        form.getValues().toAsset
      )
      return isCurrentPairInverted ? 1 / price : price
    }
    return 1
  }, [selectedPairFeed, selectedPair, form])

  // Update "to" amount based on "from" amount and exchange rate
  const updateToAmount = useCallback(
    (fromAmount: string) => {
      if (selectedPairFeed) {
        const fromAsset = form.getValues().fromAsset
        const toAsset = form.getValues().toAsset
        const fromAmountValue = parseAssetAmount(fromAmount, fromAsset)
        const rate = calculateRate()

        let toAmountValue = fromAmountValue * rate
        const formattedToAmount = formatAmount(
          Math.round(toAmountValue),
          toAsset
        )
        form.setValue('to', formattedToAmount)
      }
    },
    [selectedPairFeed, form, parseAssetAmount, formatAmount, calculateRate]
  )

  // Calculate max tradable amount
  const calculateMaxTradableAmount = useCallback(
    async (asset: string, isFrom: boolean): Promise<number> => {
      const assetsResponse = await listAssets()
      if ('error' in assetsResponse || !assetsResponse.data) {
        logger.error('Failed to fetch assets list')
        return 0
      }
      const assetsList = assetsResponse.data.nia

      if (asset === 'BTC') {
        // next_outbound_htlc_limit_msat already considers both the HTLC limit (10% of capacity)
        // and the available balance
        const maxHtlcLimit = Math.max(
          ...channels.map(
            (c) => c.next_outbound_htlc_limit_msat / MSATS_PER_SAT
          )
        )
        setMaxOutboundHtlcSat(maxHtlcLimit)
        return maxHtlcLimit
      } else {
        const assetInfo = assetsList.find((a) => a.ticker === asset)
        if (!assetInfo) {
          logger.warn(`No asset info found for ticker: ${asset}`)
          return 0
        }

        const assetChannels = channels.filter(
          (c) => c.asset_id === assetInfo.asset_id
        )
        if (assetChannels.length === 0) {
          logger.warn(
            `No channels found for asset: ${asset} (asset_id: ${assetInfo.asset_id})`
          )
          return 0
        }
        let maxAssetAmount = 0
        if (isFrom) {
          maxAssetAmount = Math.max(
            ...assetChannels.map((c) => c.asset_local_amount)
          )
        } else {
          maxAssetAmount = Math.max(
            ...assetChannels.map((c) => c.asset_remote_amount)
          )
        }
        return maxAssetAmount
      }
    },
    [channels, tradablePairs, selectedPairFeed, listAssets]
  )

  // Update min and max amounts when selected pair changes
  const updateMinMaxAmounts = useCallback(async () => {
    if (selectedPair) {
      const fromAsset = form.getValues().fromAsset
      const toAsset = form.getValues().toAsset

      let minOrderSize
      if (!isPairInverted(fromAsset, toAsset)) {
        minOrderSize = selectedPair.min_order_size
      } else {
        const rate = calculateRate()
        minOrderSize = selectedPair.min_order_size / rate
      }
      setMinFromAmount(minOrderSize)

      // Calculate max amounts
      const newMaxFromAmount = await calculateMaxTradableAmount(fromAsset, true)
      const newMaxToAmount = await calculateMaxTradableAmount(toAsset, false)

      setMaxFromAmount(newMaxFromAmount)
      setMaxToAmount(newMaxToAmount)
    }
  }, [
    selectedPair,
    selectedPairFeed,
    form,
    calculateMaxTradableAmount,
    parseAssetAmount,
    formatAmount,
    updateToAmount,
    isPairInverted,
    calculateRate,
  ])

  // Add these new functions inside the Component
  const formatNumberInput = (value: string, precision: number): string => {
    // Remove all characters except digits and decimal point
    let cleanValue = value.replace(/[^\d.]/g, '')

    // Handle multiple decimal points
    const parts = cleanValue.split('.')
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('')
    }

    // If it's just a decimal point or empty, return as is
    if (cleanValue === '.' || !cleanValue) return cleanValue

    // If ends with decimal point, preserve it
    const endsWithDecimal = value.endsWith('.')

    try {
      const num = parseFloat(cleanValue)
      if (isNaN(num)) return ''

      // Don't format if still typing decimals
      if (
        endsWithDecimal ||
        (cleanValue.includes('.') &&
          cleanValue.split('.')[1].length <= precision)
      ) {
        return cleanValue
      }

      // Only format complete numbers
      return num.toLocaleString('en-US', {
        maximumFractionDigits: precision,
        minimumFractionDigits: 0,
      })
    } catch {
      return cleanValue
    }
  }

  // Replace the handleFromAmountChange function
  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const fromAsset = form.getValues().fromAsset
    const precision = getAssetPrecision(fromAsset)

    try {
      const formattedValue = formatNumberInput(value, precision)
      form.setValue('from', formattedValue)

      // Only update the other field if we have a complete number
      if (!formattedValue.endsWith('.') && formattedValue !== '') {
        const numValue = parseAssetAmount(formattedValue, fromAsset)

        if (numValue === 0) {
          form.setValue('to', '')
        } else if (numValue < minFromAmount) {
          const minFormatted = formatAmount(minFromAmount, fromAsset)
          setDebouncedFromAmount(minFormatted)
        } else if (numValue > maxFromAmount) {
          const maxFormatted = formatAmount(maxFromAmount, fromAsset)
          setDebouncedFromAmount(maxFormatted)
        } else {
          setDebouncedFromAmount(formattedValue)
        }
      }
    } catch (error) {
      logger.error('Error handling amount change:', error)
      form.setValue('from', '')
      form.setValue('to', '')
    }
  }

  // Replace the handleToAmountChange function
  const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const toAsset = form.getValues().toAsset
    const precision = getAssetPrecision(toAsset)

    try {
      const formattedValue = formatNumberInput(value, precision)
      form.setValue('to', formattedValue)

      // Only update the other field if we have a complete number
      if (!formattedValue.endsWith('.') && formattedValue !== '') {
        const numValue = parseAssetAmount(formattedValue, toAsset)
        const rate = calculateRate()

        if (numValue === 0) {
          form.setValue('from', '')
        } else if (numValue > maxToAmount) {
          const maxFormatted = formatAmount(maxToAmount, toAsset)
          form.setValue('to', maxFormatted)
          const fromAmount = maxToAmount / rate
          form.setValue(
            'from',
            formatAmount(fromAmount, form.getValues().fromAsset)
          )
        } else {
          const fromAmount = numValue / rate
          const fromFormatted = formatAmount(
            fromAmount,
            form.getValues().fromAsset
          )

          // Check if the calculated fromAmount exceeds maxFromAmount
          if (fromAmount > maxFromAmount) {
            const maxFromFormatted = formatAmount(
              maxFromAmount,
              form.getValues().fromAsset
            )
            form.setValue('from', maxFromFormatted)
            const adjustedToAmount = maxFromAmount * rate
            form.setValue('to', formatAmount(adjustedToAmount, toAsset))
          } else if (fromAmount < minFromAmount) {
            const minFromFormatted = formatAmount(
              minFromAmount,
              form.getValues().fromAsset
            )
            form.setValue('from', minFromFormatted)
            const adjustedToAmount = minFromAmount * rate
            form.setValue('to', formatAmount(adjustedToAmount, toAsset))
          } else {
            form.setValue('from', fromFormatted)
          }
        }
      }
    } catch (error) {
      logger.error('Error handling amount change:', error)
      form.setValue('to', '')
      form.setValue('from', '')
    }
  }

  // Add debounce effect for updating the opposite amount
  useEffect(() => {
    if (!debouncedFromAmount || debouncedFromAmount.endsWith('.')) return

    const timer = setTimeout(() => {
      if (debouncedFromAmount !== previousFromAmount) {
        updateToAmount(debouncedFromAmount)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [debouncedFromAmount])

  useEffect(() => {
    if (!debouncedToAmount || debouncedToAmount.endsWith('.')) return

    const timer = setTimeout(() => {
      if (debouncedToAmount !== previousToAmount) {
        const fromAmount =
          parseAssetAmount(debouncedToAmount, form.getValues().toAsset) /
          calculateRate()
        form.setValue(
          'from',
          formatAmount(fromAmount, form.getValues().fromAsset)
        )
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [debouncedToAmount])

  // Swap assets
  const onSwapAssets = useCallback(async () => {
    if (selectedPair) {
      const fromAsset = form.getValues().fromAsset
      const toAsset = form.getValues().toAsset

      form.setValue('fromAsset', toAsset)
      form.setValue('toAsset', fromAsset)

      await updateMinMaxAmounts()

      logger.info('Swapped assets')
    }
  }, [
    selectedPair,
    form,
    calculateMaxTradableAmount,
    parseAssetAmount,
    formatAmount,
    calculateRate,
    updateMinMaxAmounts,
  ])

  // Handle size button click
  const onSizeClick = useCallback(
    async (size: number) => {
      setSelectedSize(size)
      const fromAsset = form.getValues().fromAsset

      const maxAmount = await calculateMaxTradableAmount(fromAsset, true)

      const newAmount = (maxAmount * size) / 100
      const formattedAmount = formatAmount(newAmount, fromAsset)
      form.setValue('from', formattedAmount)
      updateToAmount(formattedAmount)
      logger.info(
        `Size clicked: ${size}% - Amount: ${formattedAmount} ${fromAsset}`
      )
    },
    [form, calculateMaxTradableAmount, formatAmount, updateToAmount]
  )

  const handleAssetChange = useCallback(
    (field: 'fromAsset' | 'toAsset', newValue: string) => {
      const currentFromAsset = form.getValues().fromAsset
      const currentToAsset = form.getValues().toAsset

      if (field === 'fromAsset') {
        form.setValue('fromAsset', newValue)

        // If new fromAsset is same as current toAsset, change toAsset
        if (newValue === currentToAsset) {
          const newToAsset =
            tradablePairs.find(
              (pair) =>
                (pair.base_asset === newValue &&
                  pair.quote_asset !== newValue) ||
                (pair.quote_asset === newValue && pair.base_asset !== newValue)
            )?.base_asset === newValue
              ? tradablePairs.find((pair) => pair.base_asset === newValue)
                  ?.quote_asset
              : tradablePairs.find((pair) => pair.quote_asset === newValue)
                  ?.base_asset

          if (!newToAsset) {
            logger.error(
              'Failed to find a valid toAsset for the selected fromAsset'
            )
            return
          }
          form.setValue('toAsset', newToAsset)
        }
      } else {
        form.setValue('toAsset', newValue)

        // If new toAsset is same as current fromAsset, change fromAsset
        if (newValue === currentFromAsset) {
          const newFromAsset =
            tradablePairs.find(
              (pair) =>
                (pair.base_asset === newValue &&
                  pair.quote_asset !== newValue) ||
                (pair.quote_asset === newValue && pair.base_asset !== newValue)
            )?.base_asset === newValue
              ? tradablePairs.find((pair) => pair.base_asset === newValue)
                  ?.quote_asset
              : tradablePairs.find((pair) => pair.quote_asset === newValue)
                  ?.base_asset

          if (!newFromAsset) {
            logger.error(
              'Failed to find a valid fromAsset for the selected toAsset'
            )
            return
          }
          form.setValue('fromAsset', newFromAsset)
        }
      }

      const selectedPair = tradablePairs.find(
        (pair) =>
          (pair.base_asset === form.getValues().fromAsset &&
            pair.quote_asset === form.getValues().toAsset) ||
          (pair.base_asset === form.getValues().toAsset &&
            pair.quote_asset === form.getValues().fromAsset)
      )

      if (selectedPair) {
        setSelectedPair(selectedPair)
      } else {
        logger.error('No matching tradable pair found')
      }

      updateMinMaxAmounts()
    },
    [form, tradablePairs, updateMinMaxAmounts]
  )
  const refreshAmounts = useCallback(async () => {
    if (selectedPair) {
      setIsLoading(true)
      try {
        // Recalculate max amounts
        const fromAsset = form.getValues().fromAsset
        const toAsset = form.getValues().toAsset
        const newMaxFromAmount = await calculateMaxTradableAmount(
          fromAsset,
          true
        )
        const newMaxToAmount = await calculateMaxTradableAmount(toAsset, false)
        setMaxFromAmount(newMaxFromAmount)
        setMaxToAmount(newMaxToAmount)

        // Update the 'from' amount based on the selected size
        const newFromAmount = (newMaxFromAmount * selectedSize) / 100
        const formattedFromAmount = formatAmount(newFromAmount, fromAsset)
        form.setValue('from', formattedFromAmount)

        // Update the 'to' amount
        updateToAmount(formattedFromAmount)

        await updateMinMaxAmounts()

        logger.info('Amounts refreshed')
      } catch (error) {
        logger.error('Error refreshing amounts:', error)
        toast.error('Failed to refresh amounts. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
  }, [
    selectedPair,
    form,
    calculateMaxTradableAmount,
    formatAmount,
    updateToAmount,
    updateMinMaxAmounts,
    selectedSize,
  ])

  // Update error message when amounts change
  useEffect(() => {
    const fromAmount = parseAssetAmount(
      form.getValues().from,
      form.getValues().fromAsset
    )
    const toAmount = parseAssetAmount(
      form.getValues().to,
      form.getValues().toAsset
    )

    if (fromAmount < minFromAmount) {
      setErrorMessage(
        `Minimum amount to send: ${formatAmount(minFromAmount, form.getValues().fromAsset)} ${getDisplayAsset(form.getValues().fromAsset)}`
      )
    } else if (fromAmount > maxFromAmount) {
      setErrorMessage(
        `Maximum amount to send: ${formatAmount(maxFromAmount, form.getValues().fromAsset)} ${getDisplayAsset(form.getValues().fromAsset)}`
      )
    } else if (toAmount > maxToAmount) {
      setErrorMessage(
        `Maximum amount to receive: ${formatAmount(maxToAmount, form.getValues().toAsset)} ${getDisplayAsset(form.getValues().toAsset)}`
      )
    } else if (
      form.getValues().fromAsset === 'BTC' &&
      fromAmount > max_outbound_htlc_sat
    ) {
      setErrorMessage(
        `Maximum HTLC size: ${formatAmount(max_outbound_htlc_sat, 'BTC')} ${getDisplayAsset('BTC')}`
      )
    } else {
      setErrorMessage(null)
    }
  }, [
    form.getValues(),
    minFromAmount,
    maxFromAmount,
    maxToAmount,
    max_outbound_htlc_sat,
    parseAssetAmount,
    formatAmount,
  ])

  // Initialize WebSocket connection
  useEffect(() => {
    if (makerConnectionUrl && channels.length > 0) {
      const hasValidChannels = channels.some(
        (channel) =>
          // Check for BTC channels or channels with asset_id
          channel.asset_id &&
          (channel.outbound_balance_msat > 0 ||
            channel.inbound_balance_msat > 0)
      )

      if (hasValidChannels) {
        const clientId = uuidv4()
        const baseUrl = makerConnectionUrl.endsWith('/')
          ? makerConnectionUrl
          : `${makerConnectionUrl}/`
        try {
          webSocketService.init(baseUrl, clientId, dispatch)
          logger.info('WebSocket connection initialized')
        } catch (error) {
          logger.error('WebSocket initialization failed', error)
          toast.error('WebSocket initialization failed')
        }
      } else {
        logger.info(
          'No valid channels with assets found, not connecting to maker'
        )
      }
    } else if (channels.length === 0) {
      logger.info('No channels available, not connecting to maker')
    } else {
      logger.error('No maker connection URL provided')
      toast.error('No maker connection URL provided')
    }

    return () => {
      webSocketService.close()
      logger.info('WebSocket connection closed')
    }
  }, [dispatch, makerConnectionUrl, channels])

  // Fetch initial data
  useEffect(() => {
    const setup = async () => {
      setIsLoading(true)
      try {
        const [nodeInfoResponse, listChannelsResponse, listAssetsResponse] =
          await Promise.all([nodeInfo(), listChannels(), listAssets()])

        if ('data' in nodeInfoResponse && nodeInfoResponse.data) {
          setPubKey(nodeInfoResponse.data.pubkey)
        }

        if ('data' in listChannelsResponse && listChannelsResponse.data) {
          const channelsList = listChannelsResponse.data.channels
          setChannels(channelsList)

          // Check if there's at least one channel with an asset
          const hasValidChannels = channelsList.some(
            (channel) =>
              channel.asset_id !== null &&
              (channel.outbound_balance_msat > 0 ||
                channel.inbound_balance_msat > 0)
          )
          setHasValidChannelsForTrading(hasValidChannels)
        }

        if ('data' in listAssetsResponse && listAssetsResponse.data) {
          setAssets(listAssetsResponse.data.nia)
        }

        // Move pairs fetching to a separate function
        await fetchAndSetPairs()

        logger.info('Initial data fetched successfully')
      } catch (error) {
        logger.error('Error during setup:', error)
        toast.error(
          'Failed to initialize the swap component. Please try again.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    setup()
  }, [nodeInfo, listChannels, listAssets, dispatch, form, formatAmount])

  // Add a new function to fetch and set pairs
  const getAvailableAssets = useCallback(() => {
    // Get unique assets from channels
    const channelAssets = new Set(
      channels
        .filter(
          (c) => c.outbound_balance_msat > 0 || c.inbound_balance_msat > 0
        )
        .map((c) => assets.find((a) => a.asset_id === c.asset_id)?.ticker)
        .filter(Boolean)
    )

    // Always include BTC
    channelAssets.add('BTC')

    return Array.from(channelAssets)
  }, [channels, assets])

  const fetchAndSetPairs = async () => {
    try {
      const getPairsResponse = await getPairs()
      if ('data' in getPairsResponse && getPairsResponse.data) {
        dispatch(setTradingPairs(getPairsResponse.data.pairs))

        const availableAssets = getAvailableAssets()

        // Filter pairs where at least one asset is in user's channels or is BTC
        const filteredPairs = getPairsResponse.data.pairs.filter(
          (pair) =>
            availableAssets.includes(pair.base_asset) ||
            availableAssets.includes(pair.quote_asset)
        )

        setTradablePairs(filteredPairs)

        if (filteredPairs.length > 0) {
          // Try to find a pair with BTC first
          const btcPair = filteredPairs.find(
            (pair) => pair.base_asset === 'BTC' || pair.quote_asset === 'BTC'
          )

          const selectedPair = btcPair || filteredPairs[0]
          setSelectedPair(selectedPair)

          // Set initial assets based on the selected pair
          const fromAsset = selectedPair.base_asset
          const toAsset = selectedPair.quote_asset

          form.setValue('fromAsset', fromAsset)
          form.setValue('toAsset', toAsset)

          const defaultMinAmount = selectedPair.min_order_size
          form.setValue('from', formatAmount(defaultMinAmount, fromAsset))
        }
      }
    } catch (error) {
      logger.error('Error fetching pairs:', error)
      toast.error('Failed to fetch trading pairs')
    }
  }

  // Subscribe to selected pair feed
  useEffect(() => {
    if (selectedPair) {
      const pair = `${selectedPair.base_asset}/${selectedPair.quote_asset}`
      dispatch(subscribeToPair(pair))
      webSocketService.subscribeToPair(pair)

      return () => {
        dispatch(unsubscribeFromPair(pair))
        webSocketService.unsubscribeFromPair(pair)
      }
    }
  }, [selectedPair, dispatch])

  useEffect(() => {
    updateMinMaxAmounts()
  }, [selectedPair, updateMinMaxAmounts])

  // Update amounts when selected pair feed changes
  useEffect(() => {
    if (selectedPairFeed) {
      setIsToAmountLoading(true)
      setIsPriceLoading(false)
      const fromAmount = form.getValues().from
      updateToAmount(fromAmount)
      form.setValue('rfq_id', selectedPairFeed.rfq_id)
      setIsToAmountLoading(false)
    } else {
      console.warn('No selected pair feed')
      setIsPriceLoading(true)
    }
  }, [form, selectedPairFeed, updateToAmount])

  // Submit handler
  const onSubmit: SubmitHandler<Fields> = async () => {
    if (isSwapInProgress) {
      toast.error(
        'A swap is already in progress. Please wait for it to complete.'
      )
      return
    }
    setShowConfirmation(true)
  }

  // Update the executeSwap function's error handling
  const executeSwap = async (data: Fields) => {
    let toastId: string | number | null = null
    let timeoutId: any | null = null

    const clearToastAndTimeout = () => {
      if (toastId !== null) {
        toast.dismiss(toastId)
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
      setIsSwapInProgress(false)
    }

    try {
      setIsSwapInProgress(true)
      toastId = toast.loading('(1/3) Initializing swap...', {
        autoClose: false,
      })

      // Set a timeout for the entire swap process (e.g., 60 seconds)
      timeoutId = setTimeout(() => {
        throw new Error('Swap operation timed out')
      }, 60000)

      logger.info('Initiating swap', data)

      const pair = tradablePairs.find(
        (p) =>
          (p.base_asset === data.fromAsset && p.quote_asset === data.toAsset) ||
          (p.base_asset === data.toAsset && p.quote_asset === data.fromAsset)
      )

      if (!pair) {
        throw new Error('Invalid trading pair')
      }

      const fromAssetId =
        assets.find((asset) => asset.ticker === data.fromAsset)?.asset_id ||
        'btc'
      const toAssetId =
        assets.find((asset) => asset.ticker === data.toAsset)?.asset_id || 'btc'

      if (!fromAssetId || !toAssetId) {
        throw new Error('Invalid asset ID')
      }
      if (fromAssetId === toAssetId) {
        throw new Error('Cannot swap the same asset')
      }

      let toAmount = parseAssetAmount(data.to, data.toAsset)
      let fromAmount = parseAssetAmount(data.from, data.fromAsset)

      // Multiply by 1000 if the asset is BTC
      if (data.fromAsset.toLowerCase() === 'btc') {
        fromAmount *= 1000
      }
      if (data.toAsset.toLowerCase() === 'btc') {
        toAmount *= 1000
      }
      const rfq_id = data.rfq_id
      if (!rfq_id) {
        throw new Error('Invalid RFQ ID')
      }
      const payload = {
        from_amount: fromAmount,
        from_asset: fromAssetId,
        rfq_id: rfq_id,
        to_amount: toAmount,
        to_asset: toAssetId,
      }
      logger.debug('Swap payload:', payload)

      const initSwapResponse = await initSwap(payload)
      if ('error' in initSwapResponse) {
        // Extract the error detail from the response
        const errorData = initSwapResponse.error as FetchBaseQueryError
        if (errorData) {
          throw new Error(
            typeof errorData === 'string'
              ? errorData
              : errorData.data &&
                  typeof errorData.data === 'object' &&
                  'error' in errorData.data
                ? String(errorData.data.error)
                : 'Failed to initialize swap'
          )
        }
        throw new Error('Failed to initialize swap')
      }

      if (!initSwapResponse.data) {
        throw new Error('No data received from swap initialization')
      }

      const { swapstring, payment_hash } = initSwapResponse.data

      toast.update(toastId, {
        isLoading: true,
        render: '(2/3) Processing taker whitelisting...',
      })

      // Check if the swapstring is valid
      if (!swapstring) {
        throw new Error('Invalid swapstring')
      }

      // Validate swapstring format
      const swap_parts = swapstring.split('/')
      if (swap_parts.length !== 6) {
        logger.error(`Invalid swap string format: ${swapstring}`)
        throw new Error('Invalid swap string format.')
      }

      const [
        swapFromAmount,
        swapFromAsset,
        swapToAmount,
        swapToAsset,
        _,
        swapPaymentHash,
      ] = swap_parts

      // Validate swap string contents
      if (
        parseInt(swapFromAmount) !== fromAmount ||
        swapFromAsset !== fromAssetId ||
        parseInt(swapToAmount) !== toAmount ||
        swapToAsset !== toAssetId ||
        swapPaymentHash !== payment_hash
      ) {
        logger.error('Swap string contents do not match the payload')
        logger.error(
          `Expected: ${fromAmount}/${fromAssetId}/${toAmount}/${toAssetId}/${payment_hash}`
        )
        logger.error(
          `Received: ${swapFromAmount}/${swapFromAsset}/${swapToAmount}/${swapToAsset}/${swapPaymentHash}`
        )
        throw new Error('Swap string contents do not match the payload')
      }

      const takerResponse = await taker({ swapstring })
      if ('error' in takerResponse) {
        const errorData = takerResponse.error as FetchBaseQueryError
        if (errorData) {
          throw new Error(
            typeof errorData === 'string'
              ? errorData
              : errorData.data &&
                  typeof errorData.data === 'object' &&
                  'error' in errorData.data
                ? String(errorData.data.error)
                : 'Failed to confirm swap'
          )
        }
        throw new Error('Taker operation failed')
      }

      const confirmSwapPayload = {
        payment_hash,
        swapstring,
        taker_pubkey: pubKey,
      }
      toast.update(toastId, {
        isLoading: true,
        render: '(3/3) Waiting for maker to execute swap...',
      })

      const confirmSwapResponse = await execSwap(confirmSwapPayload)
      if ('error' in confirmSwapResponse) {
        const errorData = confirmSwapResponse.error as FetchBaseQueryError
        if (errorData) {
          throw new Error(
            typeof errorData === 'string'
              ? errorData
              : errorData.data &&
                  typeof errorData.data === 'object' &&
                  'error' in errorData.data
                ? String(errorData.data.error)
                : 'Failed to confirm swap'
          )
        }
        throw new Error('Failed to confirm swap')
      }

      logger.info('Swap executed successfully!')
      toast.update(toastId, {
        autoClose: 5000,
        closeOnClick: true,
        isLoading: false,
        render: 'Swap executed successfully!',
        type: 'success',
      })

      // Prepare and show the swap recap
      const recapDetails: SwapDetails = {
        fromAmount: formatAmount(
          parseAssetAmount(data.from, data.fromAsset),
          data.fromAsset
        ),
        fromAsset: data.fromAsset,
        payment_hash: payment_hash,
        price: selectedPairFeed.price / selectedPairFeed.size,
        selectedPair: selectedPair,
        timestamp: new Date().toISOString(),
        toAmount: formatAmount(
          parseAssetAmount(data.to, data.toAsset),
          data.toAsset
        ),
        toAsset: data.toAsset,
      }
      setSwapRecapDetails(recapDetails)
      setShowRecap(true)
    } catch (error) {
      logger.error('Error executing swap', error)

      // Extract error detail from various error formats
      let errorDetail = ''
      if (typeof error === 'object' && error !== null) {
        if ('data' in error) {
          // Handle RTK Query error format
          const errorData = error.data as any
          errorDetail =
            errorData?.detail || errorData?.error || JSON.stringify(errorData)
        } else if ('message' in error) {
          // Handle standard Error object
          errorDetail = (error as Error).message
        }
      }

      // If no specific error detail was found, use the error as a string
      const readableError = errorDetail || String(error)
      const errorDetails =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error)

      // Clear any existing toasts first
      toast.dismiss()

      // Create a new persistent error toast with improved UI
      toast.error(
        <div
          className="flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-red-500">Swap Failed</span>
            <div className="flex items-center gap-2">
              <button
                className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(errorDetails)
                }}
                title="Copy error details"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-300">{readableError}</p>
          {errorDetails !== readableError && (
            <p className="text-xs text-slate-400 break-all">{errorDetails}</p>
          )}
        </div>,
        {
          autoClose: false,
          closeButton: true,
          closeOnClick: false,
          draggable: false,
          isLoading: false,
          onClick: (e) => e.stopPropagation(),
          pauseOnFocusLoss: false,
          pauseOnHover: true,
        }
      )

      setErrorMessage(readableError)
      setIsSwapInProgress(false)

      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      return
    } finally {
      setShowConfirmation(false)
      if (!errorMessage) {
        clearToastAndTimeout()
      }
    }
  }

  // Check for available channels
  const hasChannels = useMemo(() => channels.length > 0, [channels])

  // Check for tradable pairs
  const hasTradablePairs = useMemo(
    () => tradablePairs.length > 0,
    [tradablePairs]
  )

  const getAssetOptions = useCallback(
    (excludeAsset: string) => {
      const availableAssets = getAvailableAssets()

      return tradablePairs
        .flatMap((pair) => [pair.base_asset, pair.quote_asset])
        .filter(
          (asset, index, self) =>
            // Remove duplicates
            self.indexOf(asset) === index &&
            // Exclude the currently selected asset
            asset !== excludeAsset &&
            // Only include available assets
            availableAssets.includes(asset)
        )
        .map((asset) => ({
          label: getDisplayAsset(asset),
          value: asset,
        }))
    },
    [tradablePairs, getAvailableAssets, getDisplayAsset]
  )

  const renderNoChannelsMessage = () => (
    <NoChannelsMessage onNavigate={navigate} />
  )

  const renderSwapForm = () => (
    <div className="space-y-4 max-w-2xl w-full">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Trade</h2>
          {wsConnected ? (
            <div className="flex items-center gap-1.5 text-emerald-500/90 bg-emerald-500/5 px-2 py-0.5 rounded-full text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-500/90 bg-red-500/5 px-2 py-0.5 rounded-full text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Disconnected
            </div>
          )}
        </div>
        <MakerSelector hasNoPairs={false} onMakerChange={refreshData} />
      </div>

      <form
        className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/50 p-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-4">
          <SwapInputField
            asset={form.getValues().fromAsset}
            assetOptions={getAssetOptions(form.getValues().toAsset)}
            availableAmount={`${formatAmount(maxFromAmount, form.getValues().fromAsset)} ${getDisplayAsset(form.getValues().fromAsset)}`}
            disabled={!hasChannels || !hasTradablePairs || isSwapInProgress}
            formatAmount={formatAmount}
            getDisplayAsset={getDisplayAsset}
            label="You Send"
            maxAmount={maxFromAmount}
            maxHtlcAmount={max_outbound_htlc_sat}
            minAmount={minFromAmount}
            onAmountChange={handleFromAmountChange}
            onAssetChange={(value) => handleAssetChange('fromAsset', value)}
            onRefresh={refreshAmounts}
            onSizeClick={onSizeClick}
            selectedSize={selectedSize}
            showMaxHtlc
            showMinAmount
            showSizeButtons
            value={form.getValues().from}
          />

          <div className="flex justify-center -my-1">
            <button
              className={`p-2 rounded-lg bg-slate-800/50 border-2 
                ${
                  hasChannels && hasTradablePairs && !isSwapInProgress
                    ? 'border-blue-500/50 hover:border-blue-500 cursor-pointer'
                    : 'border-slate-700 opacity-50 cursor-not-allowed'
                }`}
              onClick={() =>
                hasChannels &&
                hasTradablePairs &&
                !isSwapInProgress &&
                onSwapAssets()
              }
              type="button"
            >
              <SwapIcon />
            </button>
          </div>

          <SwapInputField
            asset={form.getValues().toAsset}
            assetOptions={getAssetOptions(form.getValues().fromAsset)}
            disabled={!hasChannels || !hasTradablePairs || isSwapInProgress}
            formatAmount={formatAmount}
            getDisplayAsset={getDisplayAsset}
            isLoading={isToAmountLoading}
            label="You Receive (Estimated)"
            maxAmount={maxToAmount}
            onAmountChange={handleToAmountChange}
            onAssetChange={(value) => handleAssetChange('toAsset', value)}
            value={form.getValues().to}
          />

          {selectedPair && (
            <ExchangeRateSection
              bitcoinUnit={bitcoinUnit}
              formatAmount={formatAmount}
              fromAsset={form.getValues().fromAsset}
              getAssetPrecision={getAssetPrecision}
              isPriceLoading={isPriceLoading}
              selectedPair={selectedPair}
              selectedPairFeed={selectedPairFeed}
              toAsset={form.getValues().toAsset}
            />
          )}

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-red-500 text-sm">{errorMessage}</span>
                <button
                  className="p-1 hover:bg-red-500/10 rounded transition-colors"
                  onClick={() => copyToClipboard(errorMessage)}
                  title="Copy error message"
                >
                  <Copy className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          )}

          <SwapButton
            errorMessage={errorMessage}
            hasChannels={hasChannels}
            hasTradablePairs={hasTradablePairs}
            isPriceLoading={isPriceLoading}
            isSwapInProgress={isSwapInProgress}
            isToAmountLoading={isToAmountLoading}
            wsConnected={wsConnected}
          />
        </div>
      </form>
    </div>
  )

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [listChannelsResponse, listAssetsResponse, getPairsResponse] =
        await Promise.all([listChannels(), listAssets(), getPairs()])

      if ('data' in listChannelsResponse && listChannelsResponse.data) {
        setChannels(listChannelsResponse.data.channels)
      }

      if ('data' in listAssetsResponse && listAssetsResponse.data) {
        setAssets(listAssetsResponse.data.nia)
      }

      if ('data' in getPairsResponse && getPairsResponse.data) {
        dispatch(setTradingPairs(getPairsResponse.data.pairs))
        const tradableAssets = new Set([
          ...channels.map((c) => c.asset_id).filter((id) => id !== null),
        ])
        const filteredPairs = getPairsResponse.data.pairs.filter(
          (pair) =>
            tradableAssets.has(pair.base_asset_id) ||
            tradableAssets.has(pair.quote_asset_id)
        )
        setTradablePairs(filteredPairs)

        if (filteredPairs.length > 0) {
          setSelectedPair(filteredPairs[0])
          form.setValue('fromAsset', filteredPairs[0].base_asset)
          form.setValue('toAsset', filteredPairs[0].quote_asset)
          const defaultMinAmount = filteredPairs[0].min_order_size
          form.setValue(
            'from',
            formatAmount(defaultMinAmount, filteredPairs[0].base_asset)
          )
        }
      }

      await updateMinMaxAmounts()
      await refreshAmounts()

      logger.info('Data refreshed successfully')
    } catch (error) {
      logger.error('Error refreshing data:', error)
      toast.error('Failed to refresh data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [
    listChannels,
    listAssets,
    getPairs,
    dispatch,
    form,
    channels,
    formatAmount,
    updateMinMaxAmounts,
    refreshAmounts,
  ])

  // Common header with MakerSelector
  const renderHeader = (showWarning = false) => (
    <Header
      hasValidChannelsForTrading={hasValidChannelsForTrading}
      onMakerChange={refreshData}
      showWarning={showWarning}
    />
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
    toast.success('Error details copied to clipboard')
  }

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      ) : !hasValidChannelsForTrading ? (
        renderNoChannelsMessage()
      ) : !wsConnected || tradablePairs.length === 0 ? (
        <div className="max-w-xl w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
          {renderHeader(true)}
          <NoTradingPairsMessage
            isLoading={isLoading}
            onRefresh={refreshData}
            wsConnected={wsConnected}
          />
        </div>
      ) : (
        renderSwapForm()
      )}

      <SwapConfirmation
        bitcoinUnit={bitcoinUnit}
        exchangeRate={calculateRate()}
        formatAmount={formatAmount}
        fromAmount={form.getValues().from}
        fromAsset={form.getValues().fromAsset}
        getAssetPrecision={getAssetPrecision}
        isLoading={isSwapInProgress}
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => executeSwap(form.getValues())}
        selectedPair={selectedPair}
        toAmount={form.getValues().to}
        toAsset={form.getValues().toAsset}
      />

      {swapRecapDetails && (
        <SwapRecap
          bitcoinUnit={bitcoinUnit}
          getAssetPrecision={getAssetPrecision}
          isOpen={showRecap}
          onClose={() => {
            setShowRecap(false)
            refreshData()
          }}
          swapDetails={swapRecapDetails}
        />
      )}

      {!showRecap && assets.length > 0 && <StatusToast assets={assets} />}
    </>
  )
}
