import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import React, { useCallback, useState } from 'react'

import { Spinner } from '../../components/Spinner/index.tsx'
import { ASSET_ID_TO_TICKER } from '../../constants.ts'
import { numberFormatter } from '../../helpers/number'
import { Channel, nodeApi } from '../../slices/nodeApi/nodeApi.slice'

type Props = {
  channel: Channel
  onClose: VoidFunction
}

export const ChannelCard = ({ channel, onClose }: Props) => {
  const [closeChannel] = nodeApi.endpoints.closeChannel.useLazyQuery()
  const [isClosingChannel, setIsClosingChannel] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const onCloseChannel = useCallback(async () => {
    setIsClosingChannel(true)
    await closeChannel({
      channel_id: channel.channel_id,
      peer_pubkey: channel.peer_pubkey,
    })
    onClose()
    setIsClosingChannel(false)
  }, [closeChannel, channel, onClose])

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy: ', err)
      })
  }

  return (
    <div className="bg-blue-dark rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <div
          className="text-sm font-medium text-white cursor-pointer"
          onClick={() => copyToClipboard(channel.channel_id)}
          title={channel.channel_id}
        >
          Channel {channel.channel_id.slice(0, 8)}...
          {isCopied && <span className="ml-2 text-xs text-cyan">Copied</span>}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded ${channel.ready ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}
        >
          {channel.ready ? 'Open' : 'Pending'}
        </span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {numberFormatter.format(channel.capacity_sat)} sats
      </div>
      <p className="text-xs text-grey-light mb-4">Total Capacity</p>
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="flex items-center text-white">
          <ArrowUpRight className="mr-2 h-4 w-4 text-grey-light" />
          Outbound:{' '}
          {numberFormatter.format(channel.outbound_balance_msat / 1000)}
        </div>
        <div className="flex items-center text-white">
          <ArrowDownRight className="mr-2 h-4 w-4 text-grey-light" />
          Inbound: {numberFormatter.format(channel.inbound_balance_msat / 1000)}
        </div>
      </div>
      <div className="flex justify-between text-sm text-grey-light mb-4">
        <div>
          Local: {numberFormatter.format(channel.asset_local_amount)} sats
        </div>
        <div>
          Remote: {numberFormatter.format(channel.asset_remote_amount)} sats
        </div>
      </div>
      <div className="text-sm text-grey-light mb-4">
        Asset: {ASSET_ID_TO_TICKER[channel.asset_id] ?? 'BTC'}
      </div>
      <button
        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
        onClick={onCloseChannel}
      >
        {isClosingChannel ? <Spinner size={8} /> : 'Close Channel'}
      </button>
    </div>
  )
}
