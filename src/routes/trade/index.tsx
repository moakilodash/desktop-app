import Decimal from 'decimal.js'
import React, { useCallback, useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'

import { WebSocketService } from '../../app/hubs/websocketService'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { Select } from '../../components/Select'
import { SparkIcon } from '../../icons/Spark'
import { SwapIcon } from '../../icons/Swap'
import { makerApi, TradingPair } from '../../slices/makerApi/makerApi.slice'
import {
  pairsSliceActions,
  pairsSliceSelectors,
} from '../../slices/makerApi/pairs.slice'
import './index.css'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface Fields {
  from: string
  fromAsset: string
  to: string
  toAsset: string
  rfqId: string
}

interface SubscribeMessage {
  action: 'subscribe' | 'unsubscribe'
  pair: string
  size: number
  clientId: string
}

type WebSocketStatus = 'connected' | 'connecting' | 'disconnected'

export const Component = () => {
  const dispatch = useAppDispatch()
  const [availablePairs, setAvailablePairs] = useState<TradingPair[]>([])
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null)
  const [channelBalances, setChannelBalances] = useState<
    Record<string, number>
  >({})
  const [selectedSize, setSelectedSize] = useState(100)
  const [pubKey, setPubKey] = useState('')
  const nodeConnectionString = useAppSelector(
    (state) => state.settings.nodeConnectionString
  )
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected')

  const selectedPairFeed = useAppSelector((state) =>
    pairsSliceSelectors.getFeed(
      state,
      selectedPair?.base_asset + '/' + selectedPair?.quote_asset
    )
  )
  // node enpoints
  const [listChannels] = nodeApi.endpoints.listChannels.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [taker] = nodeApi.endpoints.taker.useLazyQuery()
  // maker endpoints
  const [initSwap] = makerApi.endpoints.initSwap.useLazyQuery()
  const [execSwap] = makerApi.endpoints.execSwap.useLazyQuery()
  const [getPairs] = makerApi.endpoints.getPairs.useLazyQuery()

  const [assets, setAssets] = useState({
    from: 'BTC',
    to: '',
  })

  const form = useForm<Fields>({
    defaultValues: {
      from: '1',
      fromAsset: '',
      rfqId: '',
      to: '0',
      toAsset: '',
    },
  })

  useEffect(() => {
    const wsService = WebSocketService.getInstance()
    wsService.initializeStore(dispatch)

    const handleOpen = () => setWsStatus('connected')
    const handleClose = () => setWsStatus('disconnected')
    const handleError = () => setWsStatus('disconnected')

    wsService.addListener('open', handleOpen)
    wsService.addListener('close', handleClose)
    wsService.addListener('error', handleError)

    return () => {
      wsService.removeListener('open', handleOpen)
      wsService.removeListener('close', handleClose)
      wsService.removeListener('error', handleError)
    }
  }, [dispatch])

  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const getPairsResponse = await getPairs()
        if ('error' in getPairsResponse) {
          console.error('Error fetching pairs:', getPairsResponse.error)
        } else if (getPairsResponse.data) {
          console.log('Pairs fetched successfully')
          console.log(getPairsResponse.data.pairs[0])
          setAvailablePairs(getPairsResponse?.data.pairs)
        } else {
          console.error('No data in response')
        }
      } catch (error) {
        console.error('Error fetching pairs:', error)
      }
    }

    fetchPairs()
  }, [])

  useEffect(() => {
    const setup = async () => {
      const nodeInfoResponse = await nodeInfo()
      if ('error' in nodeInfoResponse) {
        console.error(nodeInfoResponse.error)
        return
      }

      setPubKey(nodeInfoResponse.data!.pubkey)

      const listChannelsResponse = await listChannels()
      if ('error' in listChannelsResponse) {
        console.error(listChannelsResponse.error)
        return
      }

      const { channels } = listChannelsResponse.data ?? {}

      const balances: Record<string, number> = {}
      channels?.forEach((channel) => {
        const assetId = channel.asset_id || 'BTC'
        balances[assetId] =
          (balances[assetId] || 0) +
          Math.floor(channel.outbound_balance_msat / 1000)
      })

      setChannelBalances(balances)

      // Set initial assets based on available channels
      const availableAssets = Object.keys(balances)
      if (availableAssets.length > 0) {
        setAssets({
          from: availableAssets[0],
          to: availableAssets[1] || availableAssets[0],
        })
        form.setValue('fromAsset', availableAssets[0])
        form.setValue('toAsset', availableAssets[1] || availableAssets[0])
      }
    }

    setup()
  }, [nodeInfo, listChannels, setPubKey, form])

  useEffect(() => {
    const pair = `${assets.from}/${assets.to}`
    setSelectedPair(
      availablePairs.find((p) => `${p.base_asset}/${p.quote_asset}` === pair) ||
        null
    )

    const wsService = WebSocketService.getInstance()
    const subscribeMessage: SubscribeMessage = {
      action: 'subscribe',
      clientId: wsService.getClientId(),
      pair,
      size: selectedSize,
    }

    try {
      wsService.sendMessage('SubscribePairPriceChannel', subscribeMessage)
    } catch (error) {
      console.error('Error subscribing to pair:', error)
      toast.error('Failed to subscribe to pair updates')
    }

    return () => {
      const unsubscribeMessage: SubscribeMessage = {
        ...subscribeMessage,
        action: 'unsubscribe',
      }
      try {
        wsService.sendMessage('SubscribePairPriceChannel', unsubscribeMessage)
      } catch (error) {
        console.error('Error unsubscribing from pair:', error)
      }
    }
  }, [assets, availablePairs, selectedSize])

  useEffect(() => {
    if (selectedPairFeed) {
      const fromAmount = form.getValues().from
      const conversionResult = new Decimal(fromAmount)
        .mul(selectedPairFeed.buyPrice)
        .toFixed(8)
        .toString()
      form.setValue('to', conversionResult)
      form.setValue('rfqId', selectedPairFeed.id)
    }
  }, [form, selectedPairFeed])

  const doSwap = useCallback(async () => {
    let toastId = null

    try {
      toastId = toast.loading('Swap in progress...')

      const payload = {
        from_amount: parseFloat(form.getValues().from),
        from_asset: assets.from,
        request_for_quotation_id: form.getValues().rfqId,
        to_amount: parseFloat(form.getValues().to),
        to_asset: assets.to,
      }

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
  }, [assets, initSwap, taker, execSwap, pubKey, form])

  const onSubmit: SubmitHandler<Fields> = async () => {
    await doSwap()
  }

  const onSizeClick = useCallback((size: number) => {
    setSelectedSize(size)
  }, [])

  useEffect(() => {
    const fromAsset = assets.from
    const balance = channelBalances[fromAsset] || 0
    form.setValue(
      'from',
      new Decimal(selectedSize).div(100).mul(balance).trunc().toString()
    )
  }, [assets, selectedSize, form, channelBalances])

  const onSwapAssets = useCallback(() => {
    setAssets({
      from: assets.to,
      to: assets.from,
    })
    form.setValue('fromAsset', assets.to)
    form.setValue('toAsset', assets.from)
  }, [assets, setAssets, form])

  // ... Rest of the component remains the same
  return (
    <form
      className="max-w-xl w-full bg-blue-dark py-8 px-6 rounded space-y-2"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
        <div className="flex justify-between items-center font-light">
          <div className="text-xs">From</div>
          <div className="text-xs">
            Trading Balance {channelBalances[assets.from] || 0}
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
                onSelect={(value) => {
                  field.onChange(value)
                  setAssets((prev) => ({ ...prev, from: value }))
                }}
                options={Object.keys(channelBalances).map((asset) => ({
                  label: asset,
                  value: asset,
                }))}
              />
            )}
          />
        </div>

        <div className="flex space-x-2">
          {[25, 50, 75, 100].map((size) => (
            <div
              className={`flex-1 px-6 py-3 text-center border border-cyan rounded ${
                selectedSize === size ? 'bg-cyan' : ''
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
          className="bg-section-lighter rounded-full h-8 w-8 flex items-center justify-center"
          onClick={onSwapAssets}
        >
          <SwapIcon />
        </div>
      </div>

      <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
        <div className="flex justify-between items-center font-light">
          <div className="text-xs">To</div>
          <div className="text-xs">
            Trading Balance {channelBalances[assets.to] || 0}
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
                onSelect={(value) => {
                  field.onChange(value)
                  setAssets((prev) => ({ ...prev, to: value }))
                }}
                options={Object.keys(channelBalances).map((asset) => ({
                  label: asset,
                  value: asset,
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
                value={selectedPairFeed?.buyPrice || ''}
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
          type="submit"
        >
          Swap
        </button>
      </div>
    </form>
  )
}
