import Decimal from 'decimal.js'
import { useCallback, useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks.ts'
import { Select } from '../../components/Select'
import { LiquidityBar } from '../../components/LiquidityBar'
import {
  ASSET_ID_TO_TICKER,
  BTC_ASSET_ID,
  USDT_ASSET_ID,
} from '../../constants.ts'
import { SparkIcon } from '../../icons/Spark'
import { SwapIcon } from '../../icons/Swap'
import './index.css'
import { makerApi } from '../../slices/makerApi/makerApi.slice.ts'
import { v4 as uuidv4 } from 'uuid';
import {
  pairsSliceActions,
  pairsSliceSelectors,
  PairFeed
} from '../../slices/makerApi/pairs.slice.ts'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice.ts'
import { WebSocketService } from '../../app/hubs/websocketService';

// import { useLazyQuery } from '@reduxjs/toolkit/query/react';
import axios from 'axios'; // Assuming axios is installed for HTTP requests
// import { set } from 'zod'


interface Fields {
  from: string
  fromAsset: string
  to: string
  toAsset: string
  rfqId: string
}

enum SubscriptionState {
  Connected,
  Disconnected,
  Pending,
}

export const Component = () => {
  const dispatch = useAppDispatch()
  
  // State hooks for the BTC channel
  const [satLocalAmount, setSatLocalAmount] = useState(0);
  const [satRemoteAmount, setSatRemoteAmount] = useState(0);

  // State hooks for the USDT channel
  const [satUsdtLocalAmount, setSatUsdtLocalAmount] = useState(0);
  const [satUsdtRemoteAmount, setSatUsdtRemoteAmount] = useState(0);
  const [usdtLocalAmount, setUsdtLocalAmount] = useState(0);
  const [usdtRemoteAmount, setUsdtRemoteAmount] = useState(0);

  const [satChannelAmount, setSatChannelAmount] = useState(0)
  const [usdtChannelAmount, setUsdtChannelAmount] = useState(0)

  const [selectedSize, setSelectedSize] = useState(100)
  const [pubKey, setPubKey] = useState('')
  // const [isSwapHovered, setIsSwapHovered] = useState(false);
  // const [customAmount, setCustomAmount] = useState('');
  // const [validationMessage, setValidationMessage] = useState('');
  const nodeConnectionString = useAppSelector((state) => state.settings.nodeConnectionString);

  const [wsService, setWsService] = useState<WebSocketService | null>(null);

  const btcUsdtFeed = useAppSelector((state) =>
    pairsSliceSelectors.getFeed(state, 'BTC/USDT')
  )
  // const isHubConnected = useAppSelector(hubSliceSelectors.isConnected)
  const isHubConnected = true
  const [subscriptionState, setSubscriptionState] = useState(
    btcUsdtFeed?.buyPrice
      ? SubscriptionState.Connected
      : SubscriptionState.Disconnected
  )

  const [listChannels, listChannelsResponse] =
    nodeApi.endpoints.listChannels.useLazyQuery()
  const [nodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const [taker] = nodeApi.endpoints.taker.useLazyQuery()
  const [createChannel] = makerApi.endpoints.createChannel.useLazyQuery()
  const [initSwap] = makerApi.endpoints.initSwap.useLazyQuery()
  const [execSwap] = makerApi.endpoints.execSwap.useLazyQuery()

  const [assets, setAssets] = useState({
    from: BTC_ASSET_ID,
    to: USDT_ASSET_ID,
  })

  const form = useForm<Fields>({
    defaultValues: {
      from: '1',
      fromAsset: BTC_ASSET_ID,
      to: '0',
      toAsset: USDT_ASSET_ID,
      rfqId: '',
    },
  })

  useEffect(() => {
    if (nodeConnectionString) {
      const wsUrl = nodeConnectionString.replace('http://', 'ws://') + `/api/v1/market/ws/${uuidv4()}`;
      const service = new WebSocketService(wsUrl);
      setWsService(service);
      service.connect();
      console.log('Connected to WebSocket service');
      return () => {
        service.disconnect();
      };
    }
  }, [nodeConnectionString]);


  useEffect(() => {
    const setup = async () => {
      const nodeInfoResponse = await nodeInfo()
      if (nodeInfoResponse.isError) {
        console.error(nodeInfoResponse.data)
        return
      }

      setPubKey(nodeInfoResponse.data!.pubkey)

      const listChannelsResponse = await listChannels()
      if (listChannelsResponse.isError) {
        console.error(listChannelsResponse.data)
        return
      }

      const { channels } = listChannelsResponse.data ?? {};

      const btcChannel = channels?.find((c) => c.asset_id === null);
      const usdtChannel = channels?.find((c) => c.asset_id === USDT_ASSET_ID);

      // BTC channel balances
      const localBalanceMsat = btcChannel?.outbound_balance_msat ?? 0;
      const remoteBalanceMsat = btcChannel?.inbound_balance_msat ?? 0;

      setSatLocalAmount(Math.floor(localBalanceMsat / 1000));
      setSatRemoteAmount(Math.floor(remoteBalanceMsat / 1000));
      setSatChannelAmount(Math.floor(localBalanceMsat / 1000)); 

      // USDT channel balances (in SAT)
      const localUsdtBalanceMsat = usdtChannel?.outbound_balance_msat ?? 0;
      const remoteUsdtBalanceMsat = usdtChannel?.inbound_balance_msat ?? 0;
      setSatUsdtLocalAmount(Math.floor(localUsdtBalanceMsat / 1000));
      setSatUsdtRemoteAmount(Math.floor(remoteUsdtBalanceMsat / 1000));

      // USDT channel balances (actual USDT)
      setUsdtLocalAmount(usdtChannel?.asset_local_amount ?? 0);
      setUsdtRemoteAmount(usdtChannel?.asset_remote_amount ?? 0);
      setUsdtChannelAmount(usdtChannel?.asset_local_amount ?? 0);
      
      console.log('Local BTC Balance: ', localBalanceMsat)
      console.log('Remote BTC Balance: ', remoteBalanceMsat)
      console.log('Local USDT Balance: ', localUsdtBalanceMsat)
      console.log('Remote USDT Balance: ', remoteUsdtBalanceMsat)
    }

    setup()
  }, [
    nodeInfo,
    listChannels,
    setPubKey,
    setSatChannelAmount,
    setSatLocalAmount,
    setSatRemoteAmount,
    setSatUsdtLocalAmount,
    setSatUsdtRemoteAmount,
    setUsdtLocalAmount,
    setUsdtRemoteAmount,
    setUsdtChannelAmount,
  ])


  useEffect(() => {
    const handlePriceUpdate = (data: PairFeed) => {
      // Dispatch an action to update the Redux store with the new price data
      dispatch(pairsSliceActions.updatePrice(data));
    };
    if (wsService) {
      wsService.addListener<PairFeed>('priceUpdate', handlePriceUpdate);  
      return () => {
        wsService.removeListener<PairFeed>('priceUpdate', handlePriceUpdate);
      };
    }
  }, [dispatch]);

  useEffect(() => {
    dispatch(pairsSliceActions.subscribePair({ pair: 'BTC/USDT', size: selectedSize }));
    
    // Don't forget to unsubscribe when the component unmounts or when you no longer need updates
    return () => {
      dispatch(pairsSliceActions.unsubscribePair({ pair: 'BTC/USDT', size: selectedSize }));
    };
  }, [dispatch, selectedSize]);

  useEffect(() => {
    // Update the 'to' field value when the 'from' field value changes
    const fieldValue =
      form.getValues().from === '' ? '0' : form.getValues().from

    let conversionResult = '';
    
    if (assets.from === BTC_ASSET_ID) {
      
      conversionResult = new Decimal(fieldValue)
          .mul(new Decimal(btcUsdtFeed?.buyPrice ?? 0).mul('0.00000001'))
          .toFixed(2)
          .toString();
  
    } else if (assets.from === USDT_ASSET_ID) {
      // Assuming USDT to BTC conversion
      conversionResult = new Decimal(1.0)
          .div(btcUsdtFeed?.buyPrice ?? 1)
          .mul(new Decimal(fieldValue))
          .mul(100_000_000)
          .toFixed(0)
          .toString();
    } else {
      conversionResult = '0';
    }

    form.setValue('to', conversionResult);
    // Set rfqId to the last rfqId from the BTC/USDT feed
    form.setValue('rfqId', btcUsdtFeed?.id ?? '');

  }, [form, btcUsdtFeed, assets.from])

  const doSwap = useCallback(async () => {
    
    let toastId = null;
    
    try {

      // const toastId = toast.pending('Swap in progress...');
      toastId = toast.loading('Swap in progress...');
      // await new Promise((resolve) => setTimeout(resolve, 2000)); 
      const from_asset_id = assets.from === BTC_ASSET_ID ? 'btc' : assets.from;
      const to_asset_id = assets.to === BTC_ASSET_ID ? 'btc' : assets.to;
      
      const payload = {
        request_for_quotation_id: form.getValues().rfqId,
        from_asset: from_asset_id,
        from_amount: parseFloat(form.getValues().from),
        to_asset: to_asset_id,
        to_amount: parseFloat(form.getValues().to),
      }
      console.log('Init Swap Payload: ', payload)
      const initSwapResponse = await axios.post('http://localhost:8000/api/v1/swap/init', payload);
      if (initSwapResponse.status !== 200) {
        console.error(initSwapResponse.data)
        throw initSwapResponse.data
      }
      console.log('Init Swap Response: ', initSwapResponse)

      // Check if swapstring is present in the response
      if (!initSwapResponse.data.swapstring) {
        console.error('Swapstring not found in response')
        throw 'Swapstring not found in response'
      }
      const swapstring = initSwapResponse?.data?.swapstring ?? '';
      const payment_hash = initSwapResponse?.data?.payment_hash ?? '';

      const takerResponse = await taker({
        swapstring: swapstring,
      })
      if (takerResponse.isError) {
        console.error(takerResponse.data)
        throw takerResponse.data
      }

      // Tell the maker to execute the swap
      const node_info = await nodeInfo();
      const taker_pubkey = node_info?.data?.pubkey ?? '';

      const confirmSwapPayload = {
        swapstring: swapstring,
        taker_pubkey: taker_pubkey,
        payment_hash: payment_hash,
      }
      const confirmSwapResponse = await axios.post('http://localhost:8000/api/v1/swap/execute', confirmSwapPayload);

      // Check status was 200 
      if (confirmSwapResponse.status !== 200) {
        console.error('Error confirming swap')
        throw 'Error confirming swap'
      }
      console.log('Swap confirmed')
      toast.update(toastId, {
        render: 'Swap executed successfully!',
        type: "success",
        isLoading: false,
        autoClose: 5000,
        closeOnClick: true,
      });

    } catch (error) {
      console.error('Error executing swap', error)
      // toast.error('An error occurred during the swap. Error:' + error);
      if (toastId) {
        toast.update(toastId, {
          render: `An error occurred: ${error}`,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeOnClick: true,
        });
      }
      throw error
    }

  }, [assets, initSwap, taker, execSwap, pubKey, form])

  const onSubmit: SubmitHandler<Fields> = async () => {
    // TODO: Check if server is connected
    await doSwap();
  }

  const onSparkClick = useCallback(async () => {
    if (!isHubConnected) {
      return
    }
    if (
      subscriptionState === SubscriptionState.Disconnected &&
      listChannelsResponse.isSuccess
    ) {
      setSubscriptionState(SubscriptionState.Connected)
      dispatch(pairsSliceActions.subscribePair({ pair: 'BTC/USDT', size: 1 }))
    } else if (subscriptionState === SubscriptionState.Connected) {
      setSubscriptionState(SubscriptionState.Disconnected)
      dispatch(pairsSliceActions.unsubscribePair({ pair: 'BTC/USDT', size: 1 }))
    }
  }, [
    isHubConnected,
    dispatch,
    subscriptionState,
    setSubscriptionState,
    listChannelsResponse,
    createChannel,
    pubKey,
  ])

  const onSizeClick = useCallback(
    (size: number) => {
      setSelectedSize(size)
    },
    [setSelectedSize]
  )

  useEffect(() => {
    form.setValue(
      'from',
      new Decimal(selectedSize)
        .div(100)
        .mul(
          new Decimal(
            assets.from === BTC_ASSET_ID ? satChannelAmount : usdtChannelAmount
          )
        )
        .trunc()
        .toString()
    )
  }, [assets, selectedSize, form, satChannelAmount, usdtChannelAmount])

  const onSwapAssets = useCallback(() => {
    setAssets({
      from: assets.to,
      to: assets.from,
    })
    form.setValue('fromAsset', assets.to)
    form.setValue('toAsset', assets.from)
  }, [assets, setAssets, form])

  return (
    <form
      className="max-w-xl w-full bg-blue-dark py-8 px-6 rounded space-y-2"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
      <div className="flex justify-between items-center font-light">  
        <h2 className="text-lg font-semibold mb-2">SAT Liquidity </h2>
        {satLocalAmount && <LiquidityBar
          localAmount={satLocalAmount} 
          remoteAmount={satRemoteAmount} 
        />}
      </div>
        
        <div className="flex justify-between items-center font-light">
          <div className="text-xs">From</div>

          <div className="text-xs">
            Trading Balance{' '}
            {assets.from === BTC_ASSET_ID
              ? satChannelAmount
              : usdtChannelAmount}
          </div>
        </div>

        <div className="flex space-x-2">
          <input
            className="flex-1 rounded bg-blue-dark px-4 py-2 text-lg"
            readOnly={true}
            type="text"
            {...form.register('from')}
          />

          <Controller
            control={form.control}
            name="fromAsset"
            render={({ field }) => (
              <Select
                active={field.value}
                onSelect={field.onChange}
                options={[
                  {
                    label: ASSET_ID_TO_TICKER[assets.from],
                    value: assets.from,
                  },
                ]}
              />
            )}
          />
        </div>

        <div className="flex space-x-2">
          <div
            className={
              'flex-1 px-6 py-3 text-center border border-cyan rounded ' +
              (selectedSize === 25 ? 'bg-cyan' : '')
            }
            onClick={() => onSizeClick(25)}
          >
            25%
          </div>

          <div
            className={
              'flex-1 px-6 py-3 text-center border border-cyan rounded ' +
              (selectedSize === 50 ? 'bg-cyan' : '')
            }
            onClick={() => onSizeClick(50)}
          >
            50%
          </div>

          <div
            className={
              'flex-1 px-6 py-3 text-center border border-cyan rounded ' +
              (selectedSize === 75 ? 'bg-cyan' : '')
            }
            onClick={() => onSizeClick(75)}
          >
            75%
          </div>

          <div
            className={
              'flex-1 px-6 py-3 text-center border border-cyan rounded ' +
              (selectedSize === 100 ? 'bg-cyan' : '')
            }
            onClick={() => onSizeClick(100)}
          >
            100%
          </div>
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
        <h2 className="text-lg font-semibold mb-2">SAT Liquidity RGB Channel</h2>
        {satUsdtLocalAmount && <LiquidityBar
          localAmount={satUsdtLocalAmount} 
          remoteAmount={satUsdtRemoteAmount}
        />}
      </div>
      
      <div className="flex justify-between items-center font-light">
        <h2 className="text-lg font-semibold mb-2">USDT Liquidity RGB Channel</h2>
        {usdtLocalAmount && <LiquidityBar
          localAmount={usdtLocalAmount} 
          remoteAmount={usdtRemoteAmount}
        />}
      </div>
      

        <div className="flex justify-between items-center font-light">
          <div className="text-xs">To</div>

          <div className="text-xs">
            Trading Balance{' '}
            {assets.to === USDT_ASSET_ID ? usdtChannelAmount : satChannelAmount}
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
                onSelect={field.onChange}
                options={[
                  { label: ASSET_ID_TO_TICKER[assets.to], value: assets.to },
                ]}
              />
            )}
          />
        </div>
      </div>

      <div className="text-center py-2 text-xs">1 Route Found</div>

      <div className="space-y-2 bg-section-lighter py-3 px-4 rounded">
        <div className="flex space-x-2 items-center">

          <input
            className="flex-1 rounded bg-blue-dark px-4 py-3"
            readOnly={true}
            type="text"
            value={btcUsdtFeed?.buyPrice}
          />

          <div className="w-8 flex justify-center" onClick={onSparkClick}>
            <SparkIcon
              color={
                subscriptionState === SubscriptionState.Connected
                  ? '#8FD5EA'
                  : '#FFFFFF'
              }
            />
          </div>
        </div>
      </div>

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
