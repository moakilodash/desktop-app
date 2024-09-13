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
import { RefreshCw } from 'lucide-react'

interface Fields {
  rfqId: string
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

  // Selectors
  const makerConnectionUrl = useAppSelector(
    (state) => state.settings.defaultLspUrl
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
      rfqId: '',
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
      return assetInfo ? assetInfo.precision : 8 // Default to 8 if not found
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
    (amount: string, asset: string): number => {
      const precision = getAssetPrecision(asset)
      const multiplier = Math.pow(10, precision)
      if (amount === '') {
        return 0
      }
      const cleanAmount = amount.replace(/[^\d.-]/g, '')
      return Math.round(parseFloat(cleanAmount) * multiplier)
    },
    [getAssetPrecision]
  )

  const calculateRate = useCallback(() => {
    if (selectedPairFeed && selectedPair) {
      const price = selectedPairFeed.buyPrice / selectedPairFeed.size
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
        console.log(
          `fromAmountValue: ${fromAmountValue} rate: ${rate} toAmountValue: ${toAmountValue}, fromAsset: ${fromAsset}, toAsset: ${toAsset}`
        )
        const formattedToAmount = formatAmount(
          Math.round(toAmountValue),
          toAsset
        )
        form.setValue('to', formattedToAmount)
        logger.debug('Updated "to" amount:', formattedToAmount)
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
      console.log(`minOrderSize: ${minOrderSize}`)
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
    const value = e.target.value
    if (value === undefined || value === null) {
      console.error('Invalid input value:', value)
      return
    }
    const cleanedValue = value.replace(/[^0-9.]/g, '')
    const fromAsset = form.getValues().fromAsset
    const numValue = parseAssetAmount(cleanedValue, fromAsset)
    if (isNaN(numValue)) {
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
  }

  // Handle "to" amount change
  const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === undefined || value === null) {
      console.error('Invalid input value:', value)
      return
    }
    const cleanedValue = value.replace(/[^0-9.]/g, '')
    const toAsset = form.getValues().toAsset
    const numValue = parseAssetAmount(cleanedValue, toAsset)
    if (isNaN(numValue)) {
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
  // TODO: Connect only when trade is possible
  useEffect(() => {
    if (makerConnectionUrl) {
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
      logger.error('No maker connection URL provided')
      toast.error('No maker connection URL provided')
    }

    return () => {
      webSocketService.close()
      logger.info('WebSocket connection closed')
    }
  }, [dispatch, makerConnectionUrl])

  // Fetch initial data
  useEffect(() => {
    const setup = async () => {
      setIsLoading(true)
      try {
        const [
          nodeInfoResponse,
          listChannelsResponse,
          listAssetsResponse,
          getPairsResponse,
        ] = await Promise.all([
          nodeInfo(),
          listChannels(),
          listAssets(),
          getPairs(),
        ])

        if ('data' in nodeInfoResponse && nodeInfoResponse.data) {
          setPubKey(nodeInfoResponse.data.pubkey)
        }

        if ('data' in listChannelsResponse && listChannelsResponse.data) {
          setChannels(listChannelsResponse.data.channels)
        }

        if ('data' in listAssetsResponse && listAssetsResponse.data) {
          setAssets(listAssetsResponse.data.nia)
        }

        if ('data' in getPairsResponse && getPairsResponse.data) {
          dispatch(setTradingPairs(getPairsResponse.data.pairs))
          const tradableAssets = new Set([
            // 'BTC',
            ...channels.map((c) => c.asset_id).filter((id) => id !== null),
          ])
          const filteredPairs = getPairsResponse.data.pairs.filter(
            (pair) =>
              tradableAssets.has(pair.base_asset_id) ||
              tradableAssets.has(pair.quote_asset_id)
          )
          setTradablePairs(filteredPairs)
          setHasValidChannelsForTrading(filteredPairs.length > 0)

          if (filteredPairs.length > 0) {
            setSelectedPair(filteredPairs[0])
            form.setValue('fromAsset', filteredPairs[0].base_asset)
            form.setValue('toAsset', filteredPairs[0].quote_asset)
            // Set default minimum value for from amount
            const defaultMinAmount = filteredPairs[0].min_order_size
            form.setValue(
              'from',
              formatAmount(defaultMinAmount, filteredPairs[0].base_asset)
            )
          }
        }

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
  }, [
    nodeInfo,
    listChannels,
    listAssets,
    getPairs,
    dispatch,
    form,
    channels,
    formatAmount,
  ])

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
      form.setValue('rfqId', selectedPairFeed.rfqId)
      setIsToAmountLoading(false)
    } else {
      setIsPriceLoading(true)
    }
  }, [form, selectedPairFeed, updateToAmount])

  // Submit handler
  const onSubmit: SubmitHandler<Fields> = async (data) => {
    if (isSwapInProgress) {
      toast.error(
        'A swap is already in progress. Please wait for it to complete.'
      )
      return
    }

    let toastId = null

    try {
      setIsSwapInProgress(true)
      toastId = toast.loading('Initializing swap...')
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

      // TODO: Check min and max amounts

      // Multiply by 1000 if the asset is BTC
      if (data.fromAsset.toLowerCase() === 'btc') {
        fromAmount *= 1000
      }
      if (data.toAsset.toLowerCase() === 'btc') {
        toAmount *= 1000
      }
      const rfq_id = data.rfqId
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
        render: 'Processing taker whitelisting...',
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
        render: 'Waiting for maker to execute swap...',
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
        price: selectedPairFeed.buyPrice,
        selectedPair: selectedPair,
        timestamp: new Date().toISOString(),
        toAmount: data.to,
        toAsset: data.toAsset,
      }
      setSwapRecapDetails(recapDetails)
      setShowRecap(true)
    } catch (error) {
      logger.error('Error executing swap', error)
      if (toastId) {
        toast.update(toastId, {
          autoClose: 5000,
          closeOnClick: true,
          isLoading: false,
          render: `An error occurred: ${error}`,
          type: 'error',
        })
      }
    } finally {
      setIsSwapInProgress(false)
    }
  }

  // Check for available channels
  const hasChannels = useMemo(() => channels.length > 0, [channels])

  // Check for tradable pairs
  const hasTradablePairs = useMemo(
    () => tradablePairs.length > 0,
    [tradablePairs]
  )

  const renderNoChannelsMessage = () => (
    <div className="max-w-xl w-full bg-blue-dark py-8 px-6 rounded space-y-4">
      <h2 className="text-xl font-bold text-center">No Channels Available</h2>
      <p className="text-center">
        You need to open a channel with an asset to start trading.
      </p>
      <div className="flex justify-center space-x-4">
        <button
          className="px-4 py-2 bg-cyan text-blue-dark rounded hover:bg-cyan-dark transition"
          onClick={() => {
            navigate(CREATE_NEW_CHANNEL_PATH)
          }}
        >
          Open Channel
        </button>
        <button
          className="px-4 py-2 border border-cyan text-cyan rounded hover:bg-cyan hover:text-blue-dark transition"
          onClick={() => {
            navigate(ORDER_CHANNEL_PATH)
          }}
        >
          Order from LSP
        </button>
      </div>
    </div>
  )

  const renderSwapForm = () => (
    <form
      className="max-w-xl w-full bg-blue-dark py-8 px-6 rounded space-y-2"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {/* From amount section */}
      <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
        <div className="flex justify-between items-center font-light">
          <div className="text-xs">You Send</div>
          <div className="flex items-center space-x-2">
            <div className="text-xs">
              Available to send:{' '}
              {`${formatAmount(maxFromAmount, form.getValues().fromAsset)} ${getDisplayAsset(form.getValues().fromAsset)}`}
            </div>
            <button
              className="p-1 rounded-full hover:bg-blue-dark transition-colors"
              disabled={isLoading || isSwapInProgress}
              onClick={refreshAmounts}
              title="Refresh amounts"
              type="button"
            >
              <RefreshCw
                className={isLoading ? 'animate-spin' : ''}
                size={16}
              />
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
          <input
            className="flex-1 rounded bg-blue-dark px-4 py-2 text-lg"
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
                options={tradablePairs
                  .flatMap((pair) => [pair.base_asset, pair.quote_asset])
                  .filter(
                    (asset, index, self) =>
                      self.indexOf(asset) === index &&
                      asset !== form.getValues().toAsset
                  )
                  .map((asset) => ({
                    label: getDisplayAsset(asset),
                    value: asset,
                  }))}
                value={field.value}
              />
            )}
          />
        </div>
        <div className="text-xs text-gray-400">
          Min: {formatAmount(minFromAmount, form.getValues().fromAsset)}{' '}
          {getDisplayAsset(form.getValues().fromAsset)}
        </div>
        <div className="flex space-x-2">
          {[25, 50, 75, 100].map((size) => (
            <div
              className={`flex-1 px-6 py-3 text-center border border-cyan rounded cursor-pointer ${
                selectedSize === size ? 'bg-cyan text-blue-dark' : ''
              } ${!hasChannels || !hasTradablePairs ? 'opacity-50 cursor-not-allowed' : ''}`}
              key={size}
              onClick={() =>
                hasChannels && hasTradablePairs && onSizeClick(size)
              }
            >
              {size}%
            </div>
          ))}
        </div>
      </div>

      {/* Swap button */}
      <div className="flex items-center justify-center py-2">
        <div
          className={`bg-section-lighter rounded-full h-8 w-8 flex items-center justify-center ${
            hasChannels && hasTradablePairs && !isSwapInProgress
              ? 'cursor-pointer'
              : 'opacity-50 cursor-not-allowed'
          }`}
          onClick={() =>
            hasChannels &&
            hasTradablePairs &&
            !isSwapInProgress &&
            onSwapAssets()
          }
        >
          <SwapIcon />
        </div>
      </div>

      {/* To amount section */}
      <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
        <div className="flex justify-between items-center font-light">
          <div className="text-xs">You Receive (Estimated)</div>
          <div className="text-xs">
            Can receive up to:{' '}
            {`${formatAmount(maxToAmount, form.getValues().toAsset)} ${getDisplayAsset(form.getValues().toAsset)}`}
          </div>
        </div>

        <div className="flex space-x-2">
          {isToAmountLoading ? (
            <div className="flex-1 rounded bg-blue-dark px-4 py-2 text-lg">
              Estimating...
            </div>
          ) : (
            <input
              className="flex-1 rounded bg-blue-dark px-4 py-2 text-lg"
              type="text"
              {...form.register('to')}
              disabled={!hasChannels || !hasTradablePairs || isSwapInProgress}
              onChange={handleToAmountChange}
            />
          )}

          <Controller
            control={form.control}
            name="toAsset"
            render={({ field }) => (
              <AssetSelect
                disabled={!hasChannels || !hasTradablePairs || isSwapInProgress}
                onChange={(value) => handleAssetChange('toAsset', value)}
                options={tradablePairs
                  .flatMap((pair) => [pair.base_asset, pair.quote_asset])
                  .filter(
                    (asset, index, self) =>
                      self.indexOf(asset) === index &&
                      asset !== form.getValues().fromAsset
                  )
                  .map((asset) => ({
                    label: getDisplayAsset(asset),
                    value: asset,
                  }))}
                value={field.value}
              />
            )}
          />
        </div>
      </div>

      {/* Exchange rate section */}
      {selectedPair && (
        <>
          <div className="text-center py-2 text-xs">1 Route Found</div>

          <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
            <div className="flex space-x-2 items-center">
              {isPriceLoading ? (
                <div className="flex-1 rounded bg-blue-dark px-4 py-3">
                  Loading exchange rate...
                </div>
              ) : (
                <ExchangeRateDisplay
                  bitcoinUnit={bitcoinUnit}
                  formatAmount={formatAmount}
                  fromAsset={form.getValues().fromAsset}
                  getAssetPrecision={getAssetPrecision}
                  price={selectedPairFeed ? selectedPairFeed.buyPrice : null}
                  selectedPair={selectedPair}
                  toAsset={form.getValues().toAsset}
                />
              )}

              <div className="w-8 flex justify-center">
                <SparkIcon color={'#8FD5EA'} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Error message */}
      {errorMessage && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}

      {/* Submit button */}
      <div className="py-2">
        <button
          className="block w-full px-6 py-3 border border-cyan rounded text-lg font-bold hover:bg-cyan hover:text-blue-dark transition"
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
  )

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      ) : !hasValidChannelsForTrading ? (
        renderNoChannelsMessage()
      ) : (
        renderSwapForm()
      )}

      {swapRecapDetails && (
        <SwapRecap
          bitcoinUnit={bitcoinUnit}
          formatAmount={formatAmount}
          getAssetPrecision={getAssetPrecision}
          isOpen={showRecap}
          onClose={() => setShowRecap(false)}
          swapDetails={swapRecapDetails}
        />
      )}
    </>
  )
}
