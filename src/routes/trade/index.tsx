import React, { useCallback, useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'

import { webSocketService } from '../../app/hubs/websocketService'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Select } from '../../components/Select'
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

interface Fields {
  from: string
  fromAsset: string
  to: string
  toAsset: string
  rfqId: string
}

const SATOSHIS_PER_BTC = 100000000
const MSATS_PER_SAT = 1000

export const Component = () => {
  const dispatch = useAppDispatch()
  const [channels, setChannels] = useState<Channel[]>([])
  const [assets, setAssets] = useState<NiaAsset[]>([])
  const [tradablePairs, setTradablePairs] = useState<TradingPair[]>([])
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null)
  const [pubKey, setPubKey] = useState('')
  const [selectedSize, setSelectedSize] = useState(100)
  const [isInverted, setIsInverted] = useState(false)
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

  const formatBitcoinAmount = useCallback(
    (amount: number, precision: number = 8) => {
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
    },
    [bitcoinUnit]
  )

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
        }).format(amount)
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
        return parseFloat(parseFloat(cleanAmount).toFixed(asset.precision))
      }
    },
    [assets, parseBitcoinAmount]
  )

  const calculateMaxTradableAmount = useCallback(
    (asset: string, isFrom: boolean): number => {
      const pair = tradablePairs.find(
        (p) =>
          (isFrom && p.base_asset === asset) ||
          (!isFrom && p.quote_asset === asset)
      )

      if (!pair) return 0

      if (asset === 'BTC') {
        const maxChannelBalance =
          Math.max(
            ...channels.map((c) =>
              isFrom ? c.outbound_balance_msat : c.inbound_balance_msat
            )
          ) / MSATS_PER_SAT
        return Math.min(
          maxChannelBalance,
          pair.max_order_size * SATOSHIS_PER_BTC
        )
      } else {
        const assetChannels = channels.filter((c) => c.asset_id === asset)
        if (assetChannels.length === 0) return 0

        const maxAssetAmount = Math.max(
          ...assetChannels.map((c) =>
            isFrom ? c.asset_local_amount : c.asset_remote_amount
          )
        )
        return Math.min(maxAssetAmount, pair.max_order_size)
      }
    },
    [channels, tradablePairs]
  )

  useEffect(() => {
    // Initialize WebSocket connection
    if (makerConnectionUrl) {
      const clientId = uuidv4()
      const baseUrl = makerConnectionUrl.endsWith('/')
        ? makerConnectionUrl
        : `${makerConnectionUrl}/`
      webSocketService.init(baseUrl, clientId, dispatch)
    } else {
      console.error('No maker connection URL provided')
    }
  }, [dispatch, makerConnectionUrl])

  useEffect(() => {
    // Fetch initial data
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
          }
        }
      } catch (error) {
        console.error('Error during setup:', error)
      }
    }

    setup()
  }, [nodeInfo, listChannels, listAssets, getPairs, dispatch, form, channels])

  useEffect(() => {
    // Subscribe to selected pair feed
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
    // Update page with the latest feed data
    if (selectedPairFeed) {
      const fromAmount = form.getValues().from
      const fromAsset = form.getValues().fromAsset
      const toAsset = form.getValues().toAsset

      let conversionRate = isInverted
        ? 1 / selectedPairFeed.buyPrice
        : selectedPairFeed.buyPrice
      if (!conversionRate) {
        throw new Error('Invalid conversion rate')
      }

      if (fromAsset === toAsset) {
        throw new Error('Cannot swap the same asset')
      }

      let fromAmountValue = parseAssetAmount(fromAmount, fromAsset)
      if (fromAsset === 'BTC' && bitcoinUnit === 'SAT') {
        fromAmountValue = fromAmountValue / SATOSHIS_PER_BTC
      }

      let conversionResult
      if (fromAsset === 'BTC') {
        conversionResult = fromAmountValue * conversionRate
      } else if (toAsset === 'BTC') {
        conversionResult = fromAmountValue / conversionRate
        if (bitcoinUnit === 'SAT') {
          conversionResult = conversionResult * SATOSHIS_PER_BTC
        }
      } else {
        conversionResult = fromAmountValue * conversionRate
      }

      const formattedResult = formatAmount(conversionResult, toAsset)

      form.setValue('to', formattedResult)
      form.setValue('rfqId', selectedPairFeed.id)
    }
  }, [form, selectedPairFeed, isInverted, formatAmount, parseAssetAmount])

  const onSwapAssets = () => {
    if (selectedPair) {
      setIsInverted(!isInverted)
      const fromAsset = form.getValues().fromAsset
      const toAsset = form.getValues().toAsset
      const fromAmount = form.getValues().from
      const toAmount = form.getValues().to

      form.setValue('fromAsset', toAsset)
      form.setValue('toAsset', fromAsset)
      form.setValue('from', toAmount)
      form.setValue('to', fromAmount)
    }
  }

  const onSizeClick = useCallback(
    (size: number) => {
      setSelectedSize(size)
      const fromAsset = form.getValues().fromAsset
      const maxAmount = calculateMaxTradableAmount(fromAsset, !isInverted)
      const newAmount = (maxAmount * size) / 100
      const formattedAmount = formatAmount(newAmount, fromAsset)
      form.setValue('from', formattedAmount)
    },
    [form, calculateMaxTradableAmount, isInverted, formatAmount]
  )

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    let toastId = null

    try {
      toastId = toast.loading('Swap in progress...')

      const pair = tradablePairs.find(
        (p) =>
          (p.base_asset === data.fromAsset && p.quote_asset === data.toAsset) ||
          (p.base_asset === data.toAsset && p.quote_asset === data.fromAsset)
      )

      if (!pair) throw new Error('Invalid trading pair')

      let minOrderSize = pair.min_order_size
      let maxOrderSize = pair.max_order_size

      if (data.fromAsset === 'BTC') {
        minOrderSize *= SATOSHIS_PER_BTC
        maxOrderSize *= SATOSHIS_PER_BTC
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

      const getAssetPrecision = (ticker: string) => {
        const asset = assets.find((a) => a.ticker === ticker)
        return asset ? Math.pow(10, asset.precision) : 1
      }

      const fromAmountInt = Math.round(
        fromAmount * getAssetPrecision(data.fromAsset)
      )
      const toAmountInt = Math.round(toAmount * getAssetPrecision(data.toAsset))

      if (fromAmountInt < minOrderSize || fromAmountInt > maxOrderSize) {
        throw new Error(
          `Order size must be between ${formatAmount(minOrderSize, data.fromAsset)} and ${formatAmount(maxOrderSize, data.fromAsset)}`
        )
      }

      const payload = {
        from_amount: fromAmountInt,
        from_asset: fromAssetId,
        request_for_quotation_id: data.rfqId,
        to_amount: toAmountInt,
        to_asset: toAssetId,
      }
      console.log('data', data)
      console.log('Swap payload:', payload)

      const initSwapResponse = await initSwap(payload)
      if ('error' in initSwapResponse) {
        throw new Error('Failed to initialize swap')
      }

      const { swapstring, payment_hash } = initSwapResponse.data

      const takerResponse = await taker({ swapstring })
      if ('error' in takerResponse) {
        throw new Error('Taker operation failed')
      }

      const confirmSwapPayload = {
        payment_hash,
        swapstring,
        taker_pubkey: pubKey,
      }
      const confirmSwapResponse = await execSwap(confirmSwapPayload)
      if ('error' in confirmSwapResponse) {
        throw new Error('Failed to confirm swap')
      }

      toast.update(toastId, {
        autoClose: 5000,
        closeOnClick: true,
        isLoading: false,
        render: 'Swap executed successfully!',
        type: 'success',
      })
    } catch (error) {
      console.error('Error executing swap', error)
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
    <form
      className="max-w-xl w-full bg-blue-dark py-8 px-6 rounded space-y-2"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
        <div className="flex justify-between items-center font-light">
          <div className="text-xs">From</div>
          <div className="text-xs">
            Max:{' '}
            {formatAmount(
              calculateMaxTradableAmount(
                form.getValues().fromAsset,
                !isInverted
              ),
              form.getValues().fromAsset
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <input
            className="flex-1 rounded bg-blue-dark px-4 py-2 text-lg"
            type="text"
            {...form.register('from')}
          />

          <Controller
            control={form.control}
            name="fromAsset"
            render={({ field }) => (
              <Select
                active={field.value}
                onSelect={(value) => field.onChange(value)}
                options={tradablePairs.map((pair) => ({
                  label: isInverted ? pair.quote_asset : pair.base_asset,
                  value: isInverted ? pair.quote_asset : pair.base_asset,
                }))}
              />
            )}
          />
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

      <div className="flex items-center justify-center py-2">
        <div
          className="bg-section-lighter rounded-full h-8 w-8 flex items-center justify-center cursor-pointer"
          onClick={onSwapAssets}
        >
          <SwapIcon />
        </div>
      </div>

      <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
        <div className="flex justify-between items-center font-light">
          <div className="text-xs">To</div>
          <div className="text-xs">
            Max:{' '}
            {calculateMaxTradableAmount(form.getValues().toAsset, isInverted)}
          </div>
        </div>

        <div className="flex space-x-2">
          <input
            className="flex-1 rounded bg-blue-dark px-4 py-2 text-lg"
            readOnly={true}
            type="text"
            {...form.register('to')}
          />

          <Controller
            control={form.control}
            name="toAsset"
            render={({ field }) => (
              <Select
                active={field.value}
                onSelect={(value) => field.onChange(value)}
                options={tradablePairs.map((pair) => ({
                  label: isInverted ? pair.base_asset : pair.quote_asset,
                  value: isInverted ? pair.base_asset : pair.quote_asset,
                }))}
              />
            )}
          />
        </div>
      </div>

      {selectedPair && (
        <>
          <div className="text-center py-2 text-xs">1 Route Found</div>

          <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
            <div className="flex space-x-2 items-center">
              <input
                className="flex-1 rounded bg-blue-dark px-4 py-3"
                readOnly={true}
                type="text"
                value={
                  selectedPairFeed
                    ? formatAmount(
                        isInverted
                          ? 1 / selectedPairFeed.buyPrice
                          : selectedPairFeed.buyPrice,
                        selectedPair.quote_asset
                      )
                    : ''
                }
              />

              <div className="w-8 flex justify-center">
                <SparkIcon color={'#8FD5EA'} />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="py-2">
        <button
          className="block w-full px-6 py-3 border border-cyan rounded text-lg font-bold hover:bg-cyan hover:text-blue-dark transition"
          disabled={!wsConnected}
          type="submit"
        >
          {wsConnected ? 'Swap' : 'Connecting...'}
        </button>
      </div>
    </form>
  )
}
