import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Copy } from 'lucide-react'
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'

import { webSocketService } from '../../../app/hubs/websocketService'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { Loader } from '../../../components/Loader'
import { StatusToast } from '../../../components/StatusToast'
import { SwapConfirmation } from '../../../components/SwapConfirmation'
import { SwapDetails, SwapRecap } from '../../../components/SwapRecap'
import {
  SwapInputField,
  ExchangeRateSection,
  SwapButton,
  MakerSelector,
} from '../../../components/Trade'
import {
  formatNumberInput,
  getAssetPrecision,
  formatAssetAmountWithPrecision,
  parseAssetAmountWithPrecision,
  calculateExchangeRate,
  getDisplayAsset,
} from '../../../helpers/number'
import { SwapIcon } from '../../../icons/Swap'
import { makerApi, TradingPair } from '../../../slices/makerApi/makerApi.slice'
import {
  setTradingPairs,
  subscribeToPair,
  unsubscribeFromPair,
} from '../../../slices/makerApi/pairs.slice'
import {
  nodeApi,
  Channel,
  NiaAsset,
} from '../../../slices/nodeApi/nodeApi.slice'
import { logger } from '../../../utils/logger'
import './index.css'
import { NoTradingChannelsMessage } from '../../../components/Trade/NoChannelsMessage'
import { MIN_CHANNEL_CAPACITY } from '../../../constants'

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
  const [hasEnoughBalance, setHasEnoughBalance] = useState(true)

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
  const [initSwap] = makerApi.endpoints.initSwap.useLazyQuery()
  const [execSwap] = makerApi.endpoints.execSwap.useLazyQuery()
  const [getPairs] = makerApi.endpoints.getPairs.useLazyQuery()
  const [btcBalance] = nodeApi.endpoints.btcBalance.useLazyQuery()

  const { data: assetsData } = nodeApi.endpoints.listAssets.useQuery(
    undefined,
    {
      // Add caching configuration
      pollingInterval: 30000,
      refetchOnFocus: false,
      // Poll every 30 seconds
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: false,
    }
  )

  // Create a wrapper for getAssetPrecision that matches the expected signature in components
  const getAssetPrecisionWrapper = useCallback(
    (asset: string): number => {
      return getAssetPrecision(asset, bitcoinUnit, assets)
    },
    [assets, bitcoinUnit]
  )

  // Use the imported getDisplayAsset function instead of local implementation
  const displayAsset = useCallback(
    (asset: string) => {
      return getDisplayAsset(asset, bitcoinUnit)
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

  // Use the imported formatAssetAmountWithPrecision function instead of local formatAmount
  const formatAmount = useCallback(
    (amount: number, asset: string) => {
      return formatAssetAmountWithPrecision(amount, asset, bitcoinUnit, assets)
    },
    [assets, bitcoinUnit]
  )

  // Use the imported parseAssetAmountWithPrecision function instead of local parseAssetAmount
  const parseAssetAmount = useCallback(
    (amount: string | undefined | null, asset: string): number => {
      return parseAssetAmountWithPrecision(amount, asset, bitcoinUnit, assets)
    },
    [assets, bitcoinUnit]
  )

  const calculateRate = useCallback(() => {
    if (selectedPairFeed && selectedPair) {
      const isCurrentPairInverted = isPairInverted(
        form.getValues().fromAsset,
        form.getValues().toAsset
      )
      return calculateExchangeRate(
        selectedPairFeed.price,
        selectedPairFeed.size,
        isCurrentPairInverted
      )
    }
    return 1
  }, [selectedPairFeed, selectedPair, form, isPairInverted])

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
      if (!assetsData) {
        logger.error('Assets data not available')
        return 0
      }
      const assetsList = assetsData.nia

      if (asset === 'BTC') {
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
    [channels, assetsData]
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

  // Replace the handleFromAmountChange function
  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const fromAsset = form.getValues().fromAsset
    const precision = getAssetPrecisionWrapper(fromAsset)

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
    const precision = getAssetPrecisionWrapper(toAsset)

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
        `Minimum amount to send: ${formatAmount(minFromAmount, form.getValues().fromAsset)} ${displayAsset(form.getValues().fromAsset)}`
      )
    } else if (fromAmount > maxFromAmount) {
      setErrorMessage(
        `Maximum amount to send: ${formatAmount(maxFromAmount, form.getValues().fromAsset)} ${displayAsset(form.getValues().fromAsset)}`
      )
    } else if (toAmount > maxToAmount) {
      setErrorMessage(
        `Maximum amount to receive: ${formatAmount(maxToAmount, form.getValues().toAsset)} ${displayAsset(form.getValues().toAsset)}`
      )
    } else if (
      form.getValues().fromAsset === 'BTC' &&
      fromAmount > max_outbound_htlc_sat
    ) {
      setErrorMessage(
        `Maximum HTLC size: ${formatAmount(max_outbound_htlc_sat, 'BTC')} ${displayAsset('BTC')}`
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
    displayAsset,
  ])

  // Initialize WebSocket connection
  useEffect(() => {
    if (makerConnectionUrl && channels.length > 0) {
      const hasValidChannels = channels.some(
        (channel) =>
          // Check for BTC channels or channels with asset_id that are ready and usable
          channel.asset_id &&
          channel.ready &&
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
        const [
          nodeInfoResponse,
          listChannelsResponse,
          balanceResponse,
          getPairsResponse,
        ] = await Promise.all([
          nodeInfo(),
          listChannels(),
          btcBalance({ skip_sync: false }),
          getPairs(),
        ])

        if ('data' in nodeInfoResponse && nodeInfoResponse.data) {
          setPubKey(nodeInfoResponse.data.pubkey)
        }

        let supportedAssets: string[] = []
        if ('data' in getPairsResponse && getPairsResponse.data) {
          const pairs = getPairsResponse.data.pairs
          supportedAssets = Array.from(
            new Set(
              pairs.flatMap((pair) => [pair.base_asset_id, pair.quote_asset_id])
            )
          )
        }

        if ('data' in listChannelsResponse && listChannelsResponse.data) {
          const channelsList = listChannelsResponse.data.channels
          setChannels(channelsList)

          // Check if there's at least one channel with a market maker supported asset
          const hasValidChannels = channelsList.some(
            (channel: Channel) =>
              channel.asset_id !== null &&
              channel.ready &&
              (channel.outbound_balance_msat > 0 ||
                channel.inbound_balance_msat > 0) &&
              supportedAssets.includes(channel.asset_id)
          )
          setHasValidChannelsForTrading(hasValidChannels)
        }

        // Check if there's enough balance to open a channel
        if ('data' in balanceResponse && balanceResponse.data) {
          const { vanilla } = balanceResponse.data
          setHasEnoughBalance(vanilla.spendable >= MIN_CHANNEL_CAPACITY)
        }

        if (assetsData) {
          setAssets(assetsData.nia)
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
  }, [
    nodeInfo,
    listChannels,
    btcBalance,
    getPairs,
    assetsData,
    dispatch,
    form,
    formatAmount,
  ])

  // Add a new function to fetch and set pairs
  const getAvailableAssets = useCallback(() => {
    // Get unique assets from channels that are ready and usable
    const channelAssets = new Set(
      channels
        .filter(
          (c) =>
            c.ready &&
            (c.outbound_balance_msat > 0 || c.inbound_balance_msat > 0)
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
    if (
      !hasChannels ||
      !hasTradablePairs ||
      isSwapInProgress ||
      !wsConnected ||
      errorMessage
    ) {
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

    const handleApiError = (error: FetchBaseQueryError): string => {
      if (!error) return 'Unknown error occurred'

      if (typeof error === 'string') return error

      const errorData = error.data
      if (!errorData) return 'No error details available'

      if (typeof errorData === 'string') return errorData

      if (typeof errorData === 'object') {
        // Return the full error detail including status codes
        if ('detail' in errorData && typeof errorData.detail === 'string')
          return errorData.detail
        if ('error' in errorData && typeof errorData.error === 'string')
          return errorData.error
        return JSON.stringify(errorData)
      }

      return String(errorData)
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
        throw new Error(
          handleApiError(initSwapResponse.error as FetchBaseQueryError)
        )
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
        throw new Error(
          handleApiError(takerResponse.error as FetchBaseQueryError)
        )
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
        throw new Error(
          handleApiError(confirmSwapResponse.error as FetchBaseQueryError)
        )
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

      // Extract full error message
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred'

      // Only show error details if they add meaningful information
      const rawErrorDetails =
        typeof error === 'object' && error !== null
          ? JSON.stringify(
              error,
              (value) => {
                // Skip empty objects and null values
                if (value === null) return undefined
                if (
                  typeof value === 'object' &&
                  Object.keys(value).length === 0
                )
                  return undefined
                return value
              },
              2
            )
          : String(error)

      // Only keep error details if they're different from the message and not empty
      const errorDetails =
        rawErrorDetails &&
        rawErrorDetails !== '{}' &&
        rawErrorDetails !== errorMessage
          ? rawErrorDetails
          : null

      // Clear any existing toasts first
      toast.dismiss()
      setErrorMessage(errorMessage)

      // Create a new persistent error toast with improved UI
      toast.error(
        <div
          className="flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-red-500">Swap Failed</span>
            {errorDetails && (
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
            )}
          </div>
          <p className="text-sm text-slate-300">{errorMessage}</p>
          {errorDetails && (
            <pre className="text-xs text-slate-400 overflow-x-auto p-2 bg-slate-900/50 rounded mt-2 font-mono">
              {errorDetails}
            </pre>
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

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [listChannelsResponse, getPairsResponse] = await Promise.all([
        listChannels(),
        getPairs(),
      ])

      if ('data' in listChannelsResponse && listChannelsResponse.data) {
        setChannels(listChannelsResponse.data.channels)
      }

      if (assetsData) {
        setAssets(assetsData.nia)
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
    getPairs,
    dispatch,
    form,
    channels,
    assetsData,
    formatAmount,
    updateMinMaxAmounts,
    refreshAmounts,
  ])

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
          ticker: displayAsset(asset),
          value: asset,
        }))
    },
    [tradablePairs, getAvailableAssets, displayAsset]
  )

  const renderSwapForm = () => (
    <div className="swap-form-container w-full max-w-2xl">
      <div className="bg-gradient-to-b from-slate-900/80 to-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 shadow-lg w-full">
        <div className="mb-2">
          <MakerSelector hasNoPairs={false} onMakerChange={refreshData} />
        </div>

        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <SwapInputField
            asset={form.getValues().fromAsset}
            assetOptions={getAssetOptions(form.getValues().toAsset)}
            availableAmount={`${formatAmount(maxFromAmount, form.getValues().fromAsset)} ${displayAsset(form.getValues().fromAsset)}`}
            availableAmountLabel="Available:"
            disabled={!hasChannels || !hasTradablePairs || isSwapInProgress}
            formatAmount={formatAmount}
            getDisplayAsset={displayAsset}
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

          <div className="flex justify-center my-0">
            <button
              className={`p-1.5 rounded-lg bg-slate-800 border transition-all transform hover:scale-110
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
            availableAmount={`${formatAmount(maxToAmount, form.getValues().toAsset)} ${displayAsset(form.getValues().toAsset)}`}
            availableAmountLabel="Can receive up to:"
            disabled={!hasChannels || !hasTradablePairs || isSwapInProgress}
            formatAmount={formatAmount}
            getDisplayAsset={displayAsset}
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
              getAssetPrecision={getAssetPrecisionWrapper}
              isPriceLoading={isPriceLoading}
              selectedPair={selectedPair}
              selectedPairFeed={selectedPairFeed}
              toAsset={form.getValues().toAsset}
            />
          )}

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
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
        </form>
      </div>
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
    <div className="container mx-auto w-full flex items-center justify-center">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      ) : !hasValidChannelsForTrading ? (
        <NoTradingChannelsMessage
          hasEnoughBalance={hasEnoughBalance}
          onMakerChange={refreshData}
          onNavigate={navigate}
        />
      ) : !wsConnected || tradablePairs.length === 0 ? (
        <NoTradingChannelsMessage
          hasEnoughBalance={hasEnoughBalance}
          onMakerChange={refreshData}
          onNavigate={navigate}
        />
      ) : (
        <div className="w-full flex justify-center">{renderSwapForm()}</div>
      )}

      <SwapConfirmation
        bitcoinUnit={bitcoinUnit}
        exchangeRate={calculateRate()}
        formatAmount={formatAmount}
        fromAmount={form.getValues().from}
        fromAsset={form.getValues().fromAsset}
        getAssetPrecision={getAssetPrecisionWrapper}
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
          getAssetPrecision={getAssetPrecisionWrapper}
          isOpen={showRecap}
          onClose={() => {
            setShowRecap(false)
            refreshData()
          }}
          swapDetails={swapRecapDetails}
        />
      )}

      {!showRecap && assets.length > 0 && <StatusToast assets={assets} />}
    </div>
  )
}
