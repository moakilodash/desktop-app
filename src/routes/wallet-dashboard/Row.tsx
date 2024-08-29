import Decimal from 'decimal.js'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { WALLET_HISTORY_PATH } from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { BTC_ASSET_ID } from '../../constants'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../slices/ui/ui.slice'

interface Props {
  assetId: string
  assetTicker: string
  assetName: string
}

export const Row = (props: Props) => {
  const [offChainBalance, setOffChainBalance] = useState('0')
  const [onChainBalance, setOnChainBalance] = useState('0')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [btcBalance] = nodeApi.endpoints.btcBalance.useLazyQuery()
  const [listChannels] = nodeApi.endpoints.listChannels.useLazyQuery()
  const [assetBalance] = nodeApi.endpoints.assetBalance.useLazyQuery()

  const refreshBalance = useCallback(async () => {
    if (props.assetId === BTC_ASSET_ID) {
      const balance = await btcBalance()
      setOnChainBalance((balance.data?.vanilla.settled ?? '0').toString())

      const channels = await listChannels()
      setOffChainBalance(
        new Decimal(
          channels.data?.channels
            .map((c) => c.outbound_balance_msat)
            .reduce((acc, curr) => acc + curr, 0) ?? 0
        )
          .mul(0.00000000001)
          .toFixed(8)
      )
    } else {
      const balance = await assetBalance({ asset_id: props.assetId })
      setOnChainBalance(balance.data?.spendable.toString() ?? '0')
      setOffChainBalance(balance.data?.offchain_outbound.toString() ?? '0')
    }

    setTimeout(refreshBalance, 3000)
  }, [
    btcBalance,
    listChannels,
    assetBalance,
    setOnChainBalance,
    setOffChainBalance,
    props.assetId,
  ])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Failed to copy: ', err)
    })
  }

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  return (
    <div className="grid grid-cols-4 gap-2 even:bg-blue-dark rounded items-center">
      <div
        className="py-3 px-4 text-sm truncate cursor-pointer"
        onClick={() => copyToClipboard(props.assetTicker)}
      >
        <div className="font-bold">{props.assetTicker}</div>
        <div>{props.assetName}</div>
      </div>

      <div className="text-sm py-3 px-4">
        <div className="font-bold">{offChainBalance}</div>
      </div>

      <div className="text-sm py-3 px-4">
        <div className="font-bold">{onChainBalance}</div>
      </div>

      <div className="text-sm py-3 pl-4 pr-6 flex justify-between">
        <button
          className="text-cyan underline font-bold"
          onClick={() =>
            dispatch(
              uiSliceActions.setModal({
                assetId: props.assetId,
                type: 'deposit',
              })
            )
          }
        >
          Deposit
        </button>

        <button
          className="text-red underline font-bold"
          onClick={() =>
            dispatch(
              uiSliceActions.setModal({
                assetId: props.assetId,
                type: 'withdraw',
              })
            )
          }
        >
          Withdraw
        </button>

        <button
          className="text-purple underline font-bold"
          onClick={() => navigate(WALLET_HISTORY_PATH)}
        >
          History
        </button>
      </div>
    </div>
  )
}
