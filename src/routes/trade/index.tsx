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

export const Component = () => {
  const dispatch = useAppDispatch()
  const [channels, setChannels] = useState<Channel[]>([])
  const [assets, setAssets] = useState<NiaAsset[]>([])
  const [tradablePairs, setTradablePairs] = useState<TradingPair[]>([])
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null)
  const [pubKey, setPubKey] = useState('')
  const [selectedSize, setSelectedSize] = useState(100)
  const makerConnectionUrl = useAppSelector(
    (state) => state.settings.defaultLspUrl
  )
  const wsConnected = useAppSelector((state) => state.pairs.wsConnected)

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

  useEffect(() => {
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
    if (selectedPair) {
      const pair = `${selectedPair.base_asset}/${selectedPair.quote_asset}`
      dispatch(subscribeToPair(pair))

      return () => {
        dispatch(unsubscribeFromPair(pair))
      }
    }
  }, [selectedPair, dispatch])

  useEffect(() => {
    if (selectedPairFeed) {
      const fromAmount = form.getValues().from
      const conversionResult = (
        parseFloat(fromAmount) * selectedPairFeed.buyPrice
      ).toFixed(8)
      form.setValue('to', conversionResult)
      form.setValue('rfqId', selectedPairFeed.id)
    }
  }, [form, selectedPairFeed])

  const getMaxAmount = (asset: string, isFrom: boolean): number => {
    if (asset === 'BTC') {
      const btcChannel = channels.find((c) => c.asset_id === null)
      if (!btcChannel) return 0
      return isFrom
        ? btcChannel.outbound_balance_msat / 1000
        : btcChannel.inbound_balance_msat / 1000
    } else {
      const assetChannel = channels.find((c) => c.asset_id === asset)
      if (!assetChannel) return 0
      return isFrom
        ? assetChannel.asset_local_amount
        : assetChannel.asset_remote_amount
    }
  }

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

  const onPairSelect = (pair: TradingPair) => {
    setSelectedPair(pair)
    form.setValue('fromAsset', pair.base_asset)
    form.setValue('toAsset', pair.quote_asset)
    form.setValue('from', '0')
    form.setValue('to', '0')
  }

  const onSwapAssets = () => {
    if (selectedPair) {
      const newPair = tradablePairs.find(
        (p) =>
          p.base_asset === selectedPair.quote_asset &&
          p.quote_asset === selectedPair.base_asset
      )
      if (newPair) {
        onPairSelect(newPair)
      }
    }
  }

  const onSizeClick = useCallback(
    (size: number) => {
      setSelectedSize(size)
      const maxAmount = getMaxAmount(form.getValues().fromAsset, true)
      const newAmount = ((maxAmount * size) / 100).toFixed(8)
      form.setValue('from', newAmount)
    },
    [form, getMaxAmount]
  )

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    let toastId = null

    try {
      toastId = toast.loading('Swap in progress...')

      const payload = {
        from_amount: parseFloat(data.from),
        from_asset: data.fromAsset,
        request_for_quotation_id: data.rfqId,
        to_amount: parseFloat(data.to),
        to_asset: data.toAsset,
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
            Max: {getMaxAmount(form.getValues().fromAsset, true)}
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
                  label: pair.base_asset,
                  value: pair.base_asset,
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
            Max: {getMaxAmount(form.getValues().toAsset, false)}
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
                  label: pair.quote_asset,
                  value: pair.quote_asset,
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
          disabled={!wsConnected}
          type="submit"
        >
          {wsConnected ? 'Swap' : 'Connecting...'}
        </button>
      </div>
    </form>
  )
}
