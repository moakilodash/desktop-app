import { useCallback, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { Spinner } from '../../components/Spinner/index.tsx'
import { ASSET_ID_TO_TICKER } from '../../constants.ts'
import { numberFormatter } from '../../helpers/number'
import { Channel, nodeApi } from '../../slices/nodeApi/nodeApi.slice'

type Props = Channel & {
  onClose: VoidFunction
}

const COL_CLASS_NAME = 'py-3 px-4 font-medium text-lg'

export const Row = (props: Props) => {
  const [closeChannel] = nodeApi.endpoints.closeChannel.useLazyQuery()
  const [isClosingChannel, setIsClosingChannel] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const onCloseChannel = useCallback(async () => {
    setIsClosingChannel(true)
    await closeChannel({
      channel_id: props.channel_id,
      peer_pubkey: props.peer_pubkey,
    })
    props.onClose()
    setIsClosingChannel(false)
  }, [closeChannel, props, setIsClosingChannel])

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000) // Reset the copy status after 2 seconds
      })
      .catch((err) => {
        console.error('Failed to copy: ', err)
      })
  }

  return (
    <div
      className="grid grid-cols-12 even:bg-blue-dark rounded items-center text-lg font-medium hover:bg-blue-900 transition cursor-pointer"
      key={props.channel_id}
    >
      <div
        className={twJoin(
          COL_CLASS_NAME,
          'col-span-2 overflow-hidden text-ellipsis whitespace-nowrap'
        )}
        onClick={() => copyToClipboard(props.channel_id)}
        title={props.channel_id}
      >
        {props.channel_id}
        {isCopied && <span className="ml-2 text-xs text-cyan">Copied</span>}
      </div>

      <div
        className={twJoin(
          COL_CLASS_NAME,
          'col-span-2 overflow-hidden text-ellipsis whitespace-nowrap'
        )}
        onClick={() => copyToClipboard(props.peer_pubkey)}
        title={props.peer_pubkey}
      >
        {props.peer_pubkey}
      </div>

      <div className={COL_CLASS_NAME}>
        {numberFormatter.format(props.capacity_sat)}
      </div>

      <div className={COL_CLASS_NAME}>
        {numberFormatter.format(props.asset_local_amount)}
      </div>

      <div className={COL_CLASS_NAME}>
        {numberFormatter.format(props.asset_remote_amount)}
      </div>

      <div className={COL_CLASS_NAME}>
        {numberFormatter.format(props.outbound_balance_msat)}
      </div>

      <div className={COL_CLASS_NAME}>
        {numberFormatter.format(props.inbound_balance_msat)}
      </div>

      <div className={COL_CLASS_NAME}>
        {ASSET_ID_TO_TICKER[props.asset_id] ?? 'BTC'}
      </div>

      <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>
        {props.ready ? 'Open' : 'Pending'}
      </div>

      <div
        className={twJoin(
          COL_CLASS_NAME,
          'col-span-2 text-red underline cursor-pointer'
        )}
        onClick={onCloseChannel}
      >
        {isClosingChannel ? <Spinner size={8} /> : 'Close Channel'}
      </div>
    </div>
  )
}
