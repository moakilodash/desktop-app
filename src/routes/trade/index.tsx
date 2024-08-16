import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'

import { webSocketService } from '../../app/hubs/websocketService'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Select } from '../../components/Select'
import { SwapDetails, SwapRecap } from '../../components/SwapRecap'
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
import { useAssetIcon } from '../../utils/assetIcons'
import { logger } from '../../utils/logger'
import PropTypes from 'prop-types'

interface Fields {
  from: string
  fromAsset: string
  to: string
  toAsset: string
  rfqId: string
}

const SATOSHIS_PER_BTC = 100000000
const MSATS_PER_SAT = 1000

interface AssetOptionProps {
  value: string
  label: string
}

const AssetOption: React.FC<AssetOptionProps> = React.memo(
  ({ value, label }) => {
    const iconUrl = useAssetIcon(value)
    const [imgSrc, setImgSrc] = useState(iconUrl)

    useEffect(() => {
      setImgSrc(iconUrl)
    }, [iconUrl])

    const handleError = () => {
      console.warn(`Failed to load image for ${value}, using default.`)
      setImgSrc(defaultIcon)
    }

    return (
      <div className="flex items-center">
        <img
          alt={label}
          className="w-5 h-5 mr-2"
          onError={handleError}
          src={imgSrc}
        />
        {label}
      </div>
    )
  }
)

AssetOption.displayName = 'AssetOption'

AssetOption.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
}

interface AssetSelectProps {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}

const AssetSelect: React.FC<AssetSelectProps> = ({
  options,
  value,
  onChange,
}) => (
  <Select
    active={value}
    onSelect={onChange}
    options={options}
    renderOption={(option) => (
      <AssetOption label={option.label} value={option.value} />
    )}
  />
)

export const Component = () => {
  const dispatch = useAppDispatch()
  const [channels, setChannels] = useState<Channel[]>([])
  const [assets, setAssets] = useState<NiaAsset[]>([])
  const [tradablePairs, setTradablePairs] = useState<TradingPair[]>([])
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null)
  const [pubKey, setPubKey] = useState('')
  const [selectedSize, setSelectedSize] = useState(100)
  const [isInverted, setIsInverted] = useState(false)

  const [minFromAmount, setMinFromAmount] = useState(0)
  const [maxFromAmount, setMaxFromAmount] = useState(0)
  const [maxToAmount, setMaxToAmount] = useState(0)

  const [isToAmountLoading, setIsToAmountLoading] = useState(true)
  const [isPriceLoading, setIsPriceLoading] = useState(true)

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
      from: '0',
      fromAsset: 'BTC',
      rfqId: '',
      to: '0',
      toAsset: '',
    },
  })

  // Memoized formatting functions
  const formatBitcoinAmount = useMemo(() => {
    return (amount: number, precision: number = 8) => {
      if (bitcoinUnit === 'SAT') {
        return new Intl.NumberFormat('en-US', {
          maximumFractionDigits: 0,
          useGrouping: true,
        }).format(Math.round(amount))
      } else {
        return new Intl.NumberFormat('en-US', {
          maximumFractionDigits: precision,
          minimumFractionDigits: precision,
          useGrouping: true,
        }).format(amount / SATOSHIS_PER_BTC)
      }
    }
  }, [bitcoinUnit])

  const formatAmount = useCallback(
    (amount: number, asset_ticker: string) => {
      const asset = assets.find((a) => a.ticker === asset_ticker) || {
        precision: 8,
      }
      if (asset_ticker === 'BTC') {
        return formatBitcoinAmount(amount, asset.precision)
      } else {
        return new Intl.NumberFormat('en-US', {
          maximumFractionDigits: asset.precision,
          minimumFractionDigits: asset.precision,
          useGrouping: true,
        }).format(amount / Math.pow(10, asset.precision))
      }
    },
    [assets, formatBitcoinAmount]
  )

  const parseBitcoinAmount = useCallback(
    (amount: string): number => {
      const cleanAmount = amount.replace(/[^\d.-]/g, '')
      if (bitcoinUnit === 'SAT') {
        return parseInt(cleanAmount, 10)
      } else {
        return Math.round(parseFloat(cleanAmount) * SATOSHIS_PER_BTC)
      }
    },
    [bitcoinUnit]
  )

  const parseAssetAmount = useCallback(
    (amount: string, asset_ticker: string): number => {
      if (asset_ticker === 'BTC') {
        return parseBitcoinAmount(amount)
      } else {
        const asset = assets.find((a) => a.ticker === asset_ticker) || {
          precision: 8,
        }
        const cleanAmount = amount.replace(/[^\d.-]/g, '')
        return Math.round(
          parseFloat(cleanAmount) * Math.pow(10, asset.precision)
        )
      }
    },
    [assets, parseBitcoinAmount]
  )
  // Update "to" amount based on "from" amount and exchange rate
  const updateToAmount = useCallback(
    (fromAmount: string) => {
      if (selectedPairFeed) {
        const fromAsset = form.getValues().fromAsset
        const toAsset = form.getValues().toAsset
        const fromAmountValue = parseAssetAmount(fromAmount, fromAsset)
        const conversionRate = isInverted
          ? 1 / selectedPairFeed.buyPrice
          : selectedPairFeed.buyPrice

        let toAmountValue
        if (fromAsset === 'BTC' && toAsset !== 'BTC') {
          // Converting from BTC to another asset
          toAmountValue = (fromAmountValue / SATOSHIS_PER_BTC) * conversionRate
        } else if (fromAsset !== 'BTC' && toAsset === 'BTC') {
          // Converting from another asset to BTC
          toAmountValue = fromAmountValue * conversionRate * SATOSHIS_PER_BTC
        } else {
          // Converting between non-BTC assets
          toAmountValue = fromAmountValue * conversionRate
        }

        const formattedToAmount = formatAmount(
          Math.round(toAmountValue),
          toAsset
        )
        form.setValue('to', formattedToAmount)
        logger.debug('Updated "to" amount:', formattedToAmount)
      }
    },
    [selectedPairFeed, form, isInverted, parseAssetAmount, formatAmount]
  )

  // Calculate max tradable amount
  const calculateMaxTradableAmount = useCallback(
    async (asset: string, isFrom: boolean): Promise<number> => {
      logger.info(
        `Calculating max tradable amount for ${asset} (${isFrom ? 'from' : 'to'})`
      )

      const assetsResponse = await listAssets()
      if ('error' in assetsResponse) {
        logger.error('Failed to fetch assets list')
        return 0
      }
      const assetsList = assetsResponse.data.nia

      // Find the pair that includes the asset, considering the inverted state
      const pair = tradablePairs.find(
        (p) =>
          (isInverted ? p.quote_asset : p.base_asset) === asset ||
          (!isInverted ? p.quote_asset : p.base_asset) === asset
      )

      if (!pair) {
        logger.warn(`No trading pair found for asset: ${asset}`)
        return 0
      }

      logger.debug(
        `Pair: ${pair.base_asset}/${pair.quote_asset}, Max order size: ${pair.max_order_size}`
      )

      if (asset === 'BTC') {
        if ((isFrom && !isInverted) || (!isFrom && isInverted)) {
          const maxChannelBalance = Math.max(
            ...channels.map((c) => c.outbound_balance_msat / MSATS_PER_SAT)
          )
          logger.debug(
            `BTC (from) - Max channel balance: ${maxChannelBalance}, Max order size: ${pair.max_order_size}`
          )
          const result = Math.min(maxChannelBalance, pair.max_order_size)
          logger.info(`BTC (from) - Max tradable amount: ${result}`)
          return result
        } else {
          const maxChannelBalance = Math.max(
            ...channels.map((c) => c.inbound_balance_msat / MSATS_PER_SAT)
          )
          logger.debug(
            `BTC (to) - Max channel balance: ${maxChannelBalance}, Max order size: ${pair.max_order_size}`
          )
          const result = Math.min(maxChannelBalance, pair.max_order_size)
          logger.info(`BTC (to) - Max tradable amount: ${result}`)
          return result
        }
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

        const assetPrice = selectedPairFeed
          ? isInverted
            ? 1 / selectedPairFeed.buyPrice
            : selectedPairFeed.buyPrice
          : 1
        logger.debug(`Asset price for ${asset}: ${assetPrice}`)

        if ((isFrom && !isInverted) || (!isFrom && isInverted)) {
          const maxAssetAmount = Math.max(
            ...assetChannels.map((c) => c.asset_local_amount)
          )
          const maxOrderSizeInAsset = pair.max_order_size / assetPrice
          const result = Math.min(maxAssetAmount, maxOrderSizeInAsset)
          logger.info(`${asset} (from) - Max tradable amount: ${result}`)
          return result
        } else {
          const maxAssetAmount = Math.max(
            ...assetChannels.map((c) => c.asset_remote_amount)
          )
          const maxOrderSizeInAsset = pair.max_order_size * assetPrice
          const result = Math.min(maxAssetAmount, maxOrderSizeInAsset)
          logger.info(`${asset} (to) - Max tradable amount: ${result}`)
          return result
        }
      }
    },
    [channels, tradablePairs, selectedPairFeed, listAssets, isInverted]
  )

  const calculateAndFormatRate = useCallback(
    (fromAsset, toAsset, price, isInverted) => {
      if (!price) return ''

      let rate = isInverted ? 1 / price : price

      // Adjust for BTC/SAT conversion if necessary
      if (fromAsset === 'BTC' && bitcoinUnit === 'SAT') {
        rate = rate / SATOSHIS_PER_BTC
      } else if (toAsset === 'BTC' && bitcoinUnit === 'SAT') {
        rate = rate * SATOSHIS_PER_BTC
      }

      let formattedRate
      if (fromAsset === 'BTC') {
        formattedRate = formatAmount(rate * SATOSHIS_PER_BTC, toAsset)
      } else if (toAsset === 'BTC') {
        formattedRate = formatAmount(SATOSHIS_PER_BTC / rate, fromAsset)
      } else {
        formattedRate = formatAmount(rate, toAsset)
      }

      const fromUnit =
        fromAsset === 'BTC' && bitcoinUnit === 'SAT' ? 'SAT' : fromAsset
      const toUnit =
        toAsset === 'BTC' && bitcoinUnit === 'SAT' ? 'SAT' : toAsset

      return `1 ${fromUnit} = ${formattedRate} ${toUnit}`
    },
    [bitcoinUnit, formatAmount]
  )

  // Initialize WebSocket connection
  useEffect(() => {
    if (makerConnectionUrl) {
      const clientId = uuidv4()
      const baseUrl = makerConnectionUrl.endsWith('/')
        ? makerConnectionUrl
        : `${makerConnectionUrl}/`
      webSocketService.init(baseUrl, clientId, dispatch)
      logger.info('WebSocket connection initialized')
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

        if ('data' in nodeInfoResponse) {
          setPubKey(nodeInfoResponse.data.pubkey)
        }

        if ('data' in listChannelsResponse) {
          setChannels(listChannelsResponse.data.channels)
        }

        if ('data' in listAssetsResponse) {
          setAssets(listAssetsResponse.data.nia)
        }

        if ('data' in getPairsResponse) {
          dispatch(setTradingPairs(getPairsResponse.data.pairs))
          const tradableAssets = new Set([
            'BTC',
            ...channels.map((c) => c.asset_id).filter((id) => id !== null),
          ])
          const filteredPairs = getPairsResponse.data.pairs.filter(
            (pair) =>
              tradableAssets.has(pair.base_asset) ||
              tradableAssets.has(pair.quote_asset)
          )
          setTradablePairs(filteredPairs)

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
      logger.info(`Subscribed to pair: ${pair}`)

      return () => {
        dispatch(unsubscribeFromPair(pair))
        webSocketService.unsubscribeFromPair(pair)
        logger.info(`Unsubscribed from pair: ${pair}`)
      }
    }
  }, [selectedPair, dispatch])

  // Update min and max amounts when selected pair changes
  const updateMinMaxAmounts = useCallback(async () => {
    if (selectedPair) {
      const fromAsset = form.getValues().fromAsset
      const toAsset = form.getValues().toAsset

      // Always use the base asset for min order size
      const baseAsset = isInverted ? toAsset : fromAsset
      const minOrderSize = selectedPair.min_order_size
      setMinFromAmount(minOrderSize)

      // Calculate max amounts
      const newMaxFromAmount = await calculateMaxTradableAmount(
        fromAsset,
        !isInverted
      )
      const newMaxToAmount = await calculateMaxTradableAmount(
        toAsset,
        isInverted
      )

      setMaxFromAmount(newMaxFromAmount)
      setMaxToAmount(newMaxToAmount)

      // Adjust the "from" amount if necessary
      const currentFromAmount = parseAssetAmount(
        form.getValues().from,
        fromAsset
      )
      if (
        currentFromAmount < minOrderSize ||
        currentFromAmount > newMaxFromAmount
      ) {
        const adjustedAmount = Math.min(
          Math.max(minOrderSize, currentFromAmount),
          newMaxFromAmount
        )
        form.setValue('from', formatAmount(adjustedAmount, fromAsset))
        updateToAmount(formatAmount(adjustedAmount, fromAsset))
      }
    }
  }, [
    selectedPair,
    form,
    calculateMaxTradableAmount,
    isInverted,
    parseAssetAmount,
    formatAmount,
    updateToAmount,
  ])

  useEffect(() => {
    updateMinMaxAmounts()
  }, [selectedPair, updateMinMaxAmounts])

  // Handle "from" amount change
  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    const fromAsset = form.getValues().fromAsset
    const numValue = parseAssetAmount(value, fromAsset)
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
    logger.debug('From amount changed:', value)
  }

  // Handle "to" amount change
  const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    const toAsset = form.getValues().toAsset
    const numValue = parseAssetAmount(value, toAsset)
    if (isNaN(numValue)) {
      form.setValue('to', '')
    } else if (numValue > maxToAmount) {
      form.setValue('to', formatAmount(maxToAmount, toAsset))
    } else {
      form.setValue('to', formatAmount(numValue, toAsset))
    }
    logger.debug('To amount changed:', value)
  }

  // Update amounts when selected pair feed changes
  useEffect(() => {
    if (selectedPairFeed) {
      setIsToAmountLoading(true)
      setIsPriceLoading(false)
      const fromAmount = form.getValues().from
      updateToAmount(fromAmount)
      form.setValue('rfqId', selectedPairFeed.id)
      setIsToAmountLoading(false)
      logger.info('Updated amounts based on new pair feed')
    } else {
      setIsPriceLoading(true)
    }
  }, [form, selectedPairFeed, updateToAmount])

  // Swap assets
  const onSwapAssets = useCallback(async () => {
    if (selectedPair) {
      setIsInverted(!isInverted)
      const fromAsset = form.getValues().fromAsset
      const toAsset = form.getValues().toAsset
      const fromAmount = parseAssetAmount(form.getValues().from, fromAsset)
      const toAmount = parseAssetAmount(form.getValues().to, toAsset)

      form.setValue('fromAsset', toAsset)
      form.setValue('toAsset', fromAsset)

      // Recalculate max amounts
      const newMaxFromAmount = await calculateMaxTradableAmount(toAsset, true)
      setMaxFromAmount(newMaxFromAmount)
      const newMaxToAmount = await calculateMaxTradableAmount(fromAsset, false)
      setMaxToAmount(newMaxToAmount)

      // Update the amounts based on the new direction
      if (selectedPairFeed) {
        const rate = isInverted
          ? 1 / selectedPairFeed.buyPrice
          : selectedPairFeed.buyPrice
        const newFromAmount = toAmount
        const newToAmount = Math.round(fromAmount / rate)

        form.setValue('from', formatAmount(newFromAmount, toAsset))
        form.setValue('to', formatAmount(newToAmount, fromAsset))
      }
      await updateMinMaxAmounts()

      logger.info('Swapped assets')
    }
  }, [
    selectedPair,
    form,
    isInverted,
    calculateMaxTradableAmount,
    parseAssetAmount,
    formatAmount,
    selectedPairFeed,
  ])

  // Handle size button click
  const onSizeClick = useCallback(
    async (size: number) => {
      setSelectedSize(size)
      const fromAsset = form.getValues().fromAsset
      const toAsset = form.getValues().toAsset

      let maxAmount
      if (!isInverted) {
        maxAmount = await calculateMaxTradableAmount(fromAsset, true)
      } else {
        maxAmount = await calculateMaxTradableAmount(fromAsset, false)
      }

      const newAmount = (maxAmount * size) / 100
      const formattedAmount = formatAmount(newAmount, fromAsset)
      form.setValue('from', formattedAmount)
      updateToAmount(formattedAmount)
      logger.info(
        `Size clicked: ${size}% - Amount: ${formattedAmount} ${fromAsset}`
      )
    },
    [form, calculateMaxTradableAmount, formatAmount, updateToAmount, isInverted]
  )

  // Submit handler
  const onSubmit: SubmitHandler<Fields> = async (data) => {
    let toastId = null

    try {
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
        'BTC'
      const toAssetId =
        assets.find((asset) => asset.ticker === data.toAsset)?.asset_id || 'BTC'

      if (!fromAssetId || !toAssetId) {
        throw new Error('Invalid asset ID')
      }
      if (fromAssetId === toAssetId) {
        throw new Error('Cannot swap the same asset')
      }

      const toAmount = parseAssetAmount(data.to, data.toAsset)
      const fromAmount = parseAssetAmount(data.from, data.fromAsset)

      if (
        fromAmount < pair.min_order_size ||
        fromAmount > pair.max_order_size
      ) {
        throw new Error(
          `Order size must be between ${formatAmount(pair.min_order_size, data.fromAsset)} and ${formatAmount(pair.max_order_size, data.fromAsset)}`
        )
      }

      const payload = {
        from_amount: fromAmount,
        from_asset: fromAssetId,
        request_for_quotation_id: data.rfqId,
        to_amount: toAmount,
        to_asset: toAssetId,
      }
      logger.debug('Swap payload:', payload)

      const initSwapResponse = await initSwap(payload)
      if ('error' in initSwapResponse) {
        throw new Error('Failed to initialize swap')
      }

      const { swapstring, payment_hash } = initSwapResponse.data
      toast.update(toastId, {
        render: 'Processing taker whitelisting...',
      })

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
        render: 'Waiting maker to execute swap...',
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
        exchangeRate: calculateAndFormatRate(
          data.fromAsset,
          data.toAsset,
          selectedPairFeed.buyPrice,
          isInverted
        ),
        fromAmount: data.from,
        fromAsset: data.fromAsset,
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
    }
  }

  return (
    <>
      <form
        className="max-w-xl w-full bg-blue-dark py-8 px-6 rounded space-y-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {/* From amount section */}
        <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
          <div className="flex justify-between items-center font-light">
            <div className="text-xs">You Send</div>
            <div className="text-xs">
              Available to send:{' '}
              {`${formatAmount(maxFromAmount, form.getValues().fromAsset)} ${form.getValues().fromAsset}`}
            </div>
          </div>

          <div className="flex space-x-2">
            <input
              className="flex-1 rounded bg-blue-dark px-4 py-2 text-lg"
              type="text"
              {...form.register('from')}
              onChange={handleFromAmountChange}
            />

            <Controller
              control={form.control}
              name="fromAsset"
              render={({ field }) => (
                <AssetSelect
                  onChange={field.onChange}
                  options={tradablePairs.map((pair) => ({
                    label: isInverted ? pair.quote_asset : pair.base_asset,
                    value: isInverted ? pair.quote_asset : pair.base_asset,
                  }))}
                  value={field.value}
                />
              )}
            />
          </div>
          <div className="text-xs text-gray-400">
            Min: {formatAmount(minFromAmount, form.getValues().fromAsset)}
          </div>
          <div className="flex space-x-2">
            {[25, 50, 75, 100].map((size) => (
              <div
                className={`flex-1 px-6 py-3 text-center border border-cyan rounded cursor-pointer ${
                  selectedSize === size ? 'bg-cyan text-blue-dark' : ''
                }`}
                key={size}
                onClick={() => onSizeClick(size)}
              >
                {size}%
              </div>
            ))}
          </div>
        </div>

        {/* Swap button */}
        <div className="flex items-center justify-center py-2">
          <div
            className="bg-section-lighter rounded-full h-8 w-8 flex items-center justify-center cursor-pointer"
            onClick={onSwapAssets}
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
              {`${formatAmount(maxToAmount, form.getValues().toAsset)} ${form.getValues().toAsset}`}
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
                onChange={handleToAmountChange}
              />
            )}

            <Controller
              control={form.control}
              name="toAsset"
              render={({ field }) => (
                <AssetSelect
                  onChange={field.onChange}
                  options={tradablePairs.map((pair) => ({
                    label: isInverted ? pair.base_asset : pair.quote_asset,
                    value: isInverted ? pair.base_asset : pair.quote_asset,
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
                  <input
                    className="flex-1 rounded bg-blue-dark px-4 py-3"
                    readOnly={true}
                    type="text"
                    value={
                      selectedPairFeed
                        ? calculateAndFormatRate(
                            form.getValues().fromAsset,
                            form.getValues().toAsset,
                            selectedPairFeed.buyPrice,
                            isInverted
                          )
                        : ''
                    }
                  />
                )}

                <div className="w-8 flex justify-center">
                  <SparkIcon color={'#8FD5EA'} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Submit button */}
        <div className="py-2">
          <button
            className="block w-full px-6 py-3 border border-cyan rounded text-lg font-bold hover:bg-cyan hover:text-blue-dark transition"
            disabled={!wsConnected || isToAmountLoading || isPriceLoading}
            type="submit"
          >
            {!wsConnected
              ? 'Connecting...'
              : isToAmountLoading || isPriceLoading
                ? 'Preparing Swap...'
                : 'Swap Now'}
          </button>
        </div>
      </form>

      {swapRecapDetails && (
        <SwapRecap
          isOpen={showRecap}
          onClose={() => setShowRecap(false)}
          swapDetails={swapRecapDetails}
        />
      )}
    </>
  )
}
