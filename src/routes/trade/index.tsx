import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'

import { webSocketService } from '../../app/hubs/websocketService'
import {
  CREATE_NEW_CHANNEL_PATH,
  ORDER_CHANNEL_PATH,
} from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Loader } from '../../components/Loader'
import { StatusToast } from '../../components/StatusToast'
import { SwapDetails, SwapRecap } from '../../components/SwapRecap'
import { AssetSelect, ExchangeRateDisplay } from '../../components/Trade'
import { SparkIcon } from '../../icons/Spark'
import { SwapIcon } from '../../icons/Swap'
import { makerApi, TradingPair } from '../../slices/makerApi/makerApi.slice'
import {
  setTradingPairs,
  subscribeToPair,
  unsubscribeFromPair,
} from '../../slices/makerApi/pairs.slice'
import './index.css'
import { nodeApi, Channel, NiaAsset } from '../../slices/nodeApi/nodeApi.slice'
import { logger } from '../../utils/logger'
import { RefreshCw, Link, Plus, ShoppingCart, Copy } from 'lucide-react'

import { MakerSelector } from '../../components/Trade/MakerSelector'
import { SwapConfirmation } from '../../components/SwapConfirmation'

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
  const [channels, setChannels] = useState<Channel[]>([])
  const [assets, setAssets] = useState<NiaAsset[]>([])
  const [tradablePairs, setTradablePairs] = useState<TradingPair[]>([])
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null)
  const [pubKey, setPubKey] = useState('')
  const [selectedSize, setSelectedSize] = useState(100)

  const [minFromAmount, setMinFromAmount] = useState(0)
  const [maxFromAmount, setMaxFromAmount] = useState(0)
  const [maxToAmount, setMaxToAmount] = useState(0)

  const [isToAmountLoading, setIsToAmountLoading] = useState(true)
  const [isPriceLoading, setIsPriceLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [isSwapInProgress, setIsSwapInProgress] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasValidChannelsForTrading, setHasValidChannelsForTrading] =
    useState(false)

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

  const form = useForm<Fields>({
    defaultValues: {
      from: '',
      fromAsset: 'BTC',
      rfq_id: '',
      to: '',
      toAsset: '',
    },
  })

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

      let maxChannelBalance = 0
      if (asset === 'BTC') {
        if (isFrom) {
          maxChannelBalance = Math.max(
            ...channels.map((c) => c.outbound_balance_msat / MSATS_PER_SAT)
          )
          return maxChannelBalance
        } else {
          maxChannelBalance = Math.max(
            ...channels.map((c) => c.inbound_balance_msat / MSATS_PER_SAT)
          )
        }
        return maxChannelBalance
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

  // Handle "from" amount change
  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (value === undefined || value === null) {
      logger.warn('Invalid input value:', value)
      return
    }

    try {
      const cleanedValue = value.replace(/[^0-9.]/g, '')
      const fromAsset = form.getValues().fromAsset
      const numValue = parseAssetAmount(cleanedValue, fromAsset)

      if (numValue === 0) {
        form.setValue('from', '')
        form.setValue('to', '')
      } else if (numValue < minFromAmount) {
        form.setValue('from', formatAmount(minFromAmount, fromAsset))
        updateToAmount(formatAmount(minFromAmount, fromAsset))
      } else if (numValue > maxFromAmount) {
        form.setValue('from', formatAmount(maxFromAmount, fromAsset))
        updateToAmount(formatAmount(maxFromAmount, fromAsset))
      } else {
        form.setValue('from', formatAmount(numValue, fromAsset))
        updateToAmount(formatAmount(numValue, fromAsset))
      }
      logger.debug('Updated "from" amount:', form.getValues().from)
    } catch (error) {
      logger.error('Error handling amount change:', error)
      form.setValue('from', '')
      form.setValue('to', '')
    }
  }

  // Handle "to" amount change
  const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (value === undefined || value === null) {
      logger.warn('Invalid input value:', value)
      return
    }

    try {
      const cleanedValue = value.replace(/[^0-9.]/g, '')
      const toAsset = form.getValues().toAsset
      const numValue = parseAssetAmount(cleanedValue, toAsset)

      if (numValue === 0) {
        form.setValue('to', '')
        form.setValue('from', '')
      } else if (numValue > maxToAmount) {
        form.setValue('to', formatAmount(maxToAmount, toAsset))
        const fromAmount = maxToAmount / calculateRate()
        form.setValue(
          'from',
          formatAmount(fromAmount, form.getValues().fromAsset)
        )
      } else {
        form.setValue('to', formatAmount(numValue, toAsset))
        const fromAmount = numValue / calculateRate()
        form.setValue(
          'from',
          formatAmount(fromAmount, form.getValues().fromAsset)
        )
      }
      logger.debug('To amount changed:', value)
    } catch (error) {
      logger.error('Error handling amount change:', error)
      form.setValue('to', '')
      form.setValue('from', '')
    }
  }
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
    } else {
      setErrorMessage(null)
    }
  }, [
    form.getValues(),
    minFromAmount,
    maxFromAmount,
    maxToAmount,
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

  // Add the executeSwap function
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
      if ('error' in initSwapResponse || !initSwapResponse.data) {
        throw new Error('Failed to initialize swap')
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
        fromAmount: data.from,
        fromAsset: data.fromAsset,
        payment_hash: payment_hash,
        price: selectedPairFeed.price,
        selectedPair: selectedPair,
        timestamp: new Date().toISOString(),
        toAmount: data.to,
        toAsset: data.toAsset,
      }
      setSwapRecapDetails(recapDetails)
      setShowRecap(true)
    } catch (error) {
      logger.error('Error executing swap', error)
      const errorDetails =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'An unknown error occurred during the swap'

      // Clear any existing toasts first
      toast.dismiss()

      // Create a new persistent error toast
      toast.error(
        <div
          className="flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-red-500">Swap Failed</span>
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
          <p className="text-sm text-slate-300 break-all">{errorDetails}</p>
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

      setErrorMessage(errorDetails)
      setIsSwapInProgress(false) // Reset swap progress state

      // Don't call clearToastAndTimeout() for errors
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      return // Exit early to prevent clearToastAndTimeout from running
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
    <div className="max-w-xl w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
          <Link className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">No Channels Available</h2>
        <p className="text-slate-400 text-center">
          You need to open a channel with an asset to start trading.
        </p>
        <div className="flex gap-4 pt-4">
          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                     font-medium transition-colors flex items-center gap-2"
            onClick={() => navigate(CREATE_NEW_CHANNEL_PATH)}
          >
            <Plus className="w-5 h-5" />
            Open Channel
          </button>
          <button
            className="px-6 py-3 border border-blue-500/50 text-blue-500 rounded-xl 
                     hover:bg-blue-500/10 transition-colors flex items-center gap-2"
            onClick={() => navigate(ORDER_CHANNEL_PATH)}
          >
            <ShoppingCart className="w-5 h-5" />
            Buy from LSP
          </button>
        </div>
      </div>
    </div>
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
          <div className="space-y-3 bg-slate-800/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium text-slate-400">You Send</div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>
                  Available:{' '}
                  {formatAmount(maxFromAmount, form.getValues().fromAsset)}{' '}
                  {getDisplayAsset(form.getValues().fromAsset)}
                </span>
                <button
                  className="p-1 rounded hover:bg-slate-700/50 transition-colors"
                  disabled={isLoading || isSwapInProgress}
                  onClick={refreshAmounts}
                  title="Refresh amounts"
                  type="button"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                className="flex-1 px-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-700 
                         text-white text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                         placeholder:text-slate-600 min-h-[42px]"
                type="text"
                {...form.register('from')}
                disabled={!hasChannels || !hasTradablePairs || isSwapInProgress}
                onChange={handleFromAmountChange}
              />
              <Controller
                control={form.control}
                name="fromAsset"
                render={({ field }) => (
                  <AssetSelect
                    disabled={!hasChannels || !hasTradablePairs}
                    onChange={(value) => handleAssetChange('fromAsset', value)}
                    options={getAssetOptions(form.getValues().toAsset)}
                    value={field.value}
                  />
                )}
              />
            </div>

            <div className="text-xs text-slate-500">
              Min: {formatAmount(minFromAmount, form.getValues().fromAsset)}{' '}
              {getDisplayAsset(form.getValues().fromAsset)}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((size) => (
                <button
                  className={`py-1.5 px-3 rounded-lg border text-sm transition-all duration-200
                    ${
                      selectedSize === size
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : 'border-slate-700 text-slate-400 hover:border-blue-500/50'
                    } ${!hasChannels || !hasTradablePairs ? 'opacity-50 cursor-not-allowed' : ''}`}
                  key={size}
                  onClick={() =>
                    hasChannels && hasTradablePairs && onSizeClick(size)
                  }
                  type="button"
                >
                  {size}%
                </button>
              ))}
            </div>
          </div>

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

          <div className="space-y-3 bg-slate-800/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium text-slate-400">
                You Receive (Estimated)
              </div>
              <div className="text-sm text-slate-400">
                Can receive up to:{' '}
                {`${formatAmount(maxToAmount, form.getValues().toAsset)} ${getDisplayAsset(form.getValues().toAsset)}`}
              </div>
            </div>

            <div className="flex gap-3">
              {isToAmountLoading ? (
                <div
                  className="flex-1 px-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-700 
                             text-slate-400 min-h-[42px] flex items-center"
                >
                  Estimating...
                </div>
              ) : (
                <input
                  className="flex-1 px-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-700 
                           text-white text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                           placeholder:text-slate-600 min-h-[42px]"
                  type="text"
                  {...form.register('to')}
                  disabled={
                    !hasChannels || !hasTradablePairs || isSwapInProgress
                  }
                  onChange={handleToAmountChange}
                />
              )}

              <Controller
                control={form.control}
                name="toAsset"
                render={({ field }) => (
                  <AssetSelect
                    disabled={
                      !hasChannels || !hasTradablePairs || isSwapInProgress
                    }
                    onChange={(value) => handleAssetChange('toAsset', value)}
                    options={getAssetOptions(form.getValues().fromAsset)}
                    value={field.value}
                  />
                )}
              />
            </div>
          </div>

          {selectedPair && (
            <>
              <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Best Exchange Rate Available
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Exchange Rate</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse" />
                    Live Price
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {isPriceLoading ? (
                    <div
                      className="flex-1 px-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-700 
                                 text-slate-400 min-h-[42px] flex items-center"
                    >
                      Loading exchange rate...
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <ExchangeRateDisplay
                        bitcoinUnit={bitcoinUnit}
                        formatAmount={formatAmount}
                        fromAsset={form.getValues().fromAsset}
                        getAssetPrecision={getAssetPrecision}
                        price={selectedPairFeed ? selectedPairFeed.price : null}
                        selectedPair={selectedPair}
                        toAsset={form.getValues().toAsset}
                      />
                      <div className="flex items-center gap-2">
                        <SparkIcon color="#fff" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
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

          <button
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900
                     text-white rounded-lg font-medium transition-colors flex items-center 
                     justify-center gap-2 disabled:cursor-not-allowed text-base min-h-[48px]"
            disabled={
              !wsConnected ||
              isToAmountLoading ||
              isPriceLoading ||
              !!errorMessage ||
              !hasChannels ||
              !hasTradablePairs ||
              isSwapInProgress
            }
            type="submit"
          >
            {!wsConnected
              ? 'Connecting...'
              : isToAmountLoading || isPriceLoading
                ? 'Preparing Swap...'
                : !hasChannels
                  ? 'No Channels Available'
                  : !hasTradablePairs
                    ? 'No Tradable Pairs'
                    : errorMessage
                      ? 'Invalid Amount'
                      : isSwapInProgress
                        ? 'Swap in Progress...'
                        : 'Swap Now'}
          </button>
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
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold text-white">Trade</h2>
      <MakerSelector
        hasNoPairs={showWarning}
        onMakerChange={refreshData}
        show={hasValidChannelsForTrading}
      />
    </div>
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
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-white">
              {!wsConnected
                ? 'Maker Not Connected'
                : 'No Trading Pairs Available'}
            </h3>
            <p className="text-slate-400">
              {!wsConnected
                ? 'Unable to connect to the selected maker. Please select a different maker from the dropdown above.'
                : "The current maker doesn't offer any trading pairs for your assets. Please select a different maker from the dropdown above."}
            </p>
          </div>
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
          formatAmount={formatAmount}
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
