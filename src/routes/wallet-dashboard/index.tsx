import './index.css'

import { useCallback, useEffect } from 'react'

import { useAppDispatch } from '../../app/store/hooks'
import { ASSET_ID_TO_TICKER, BTC_ASSET_ID } from '../../constants'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../slices/ui/ui.slice'

import { Row } from './Row'

export const Component = () => {
  const dispatch = useAppDispatch()

  const [address, addressResponse] = nodeApi.endpoints.address.useLazyQuery()
  const [assets, assetsResponse] = nodeApi.endpoints.listAssets.useLazyQuery()
  const [btcBalance, btcBalanceResponse] =
    nodeApi.endpoints.btcBalance.useLazyQuery()

  const refreshBalance = useCallback(() => {
    btcBalance()
    setTimeout(() => {
      refreshBalance()
    }, 3000)
  }, [btcBalance])

  useEffect(() => {
    address()
    assets()
    refreshBalance()
  }, [address, assets, refreshBalance])

  return (
    <div className="w-full bg-blue-dark py-8 px-6 rounded space-y-4">
      <div className="bg-section-lighter rounded p-8">
        <div className="mb-4 text-right">
          BTC Address: {addressResponse?.data?.address}
        </div>

        <div className="flex items-center mb-8">
          <div className="text-2xl flex-1">Wallet Dashboard</div>

          <div className="flex items-center space-x-2">
            <button
              className="px-6 py-3 rounded border text-lg font-bold border-cyan"
              onClick={() =>
                dispatch(
                  uiSliceActions.setModal({
                    assetId: BTC_ASSET_ID,
                    type: 'deposit',
                  })
                )
              }
            >
              Deposit
            </button>

            <button
              className="px-6 py-3 rounded border text-lg font-bold border-red"
              onClick={() =>
                dispatch(
                  uiSliceActions.setModal({
                    assetId: BTC_ASSET_ID,
                    type: 'withdraw',
                  })
                )
              }
            >
              Withdraw
            </button>

            <button className="px-6 py-3 rounded border text-lg font-bold border-cyan">
              Open New Channel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 space-x-4">
          <div className="bg-blue-dark p-6 rounded font-semibold space-y-3">
            <div className="text-grey-light">BTC</div>
            <div className="text-2xl">
              {btcBalanceResponse.data?.vanilla.spendable ?? 0}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-section-lighter rounded p-8">
        <div className="flex items-center">
          <div className="text-2xl flex-1">List of Assets</div>

          {/* <div */}
          {/*   className="flex items-center space-x-2 cursor-pointer" */}
          {/*   onClick={() => setAreZeroBalancesHidden((state) => !state)} */}
          {/* > */}
          {/*   <div */}
          {/*     className={twJoin( */}
          {/*       'flex-auto w-4 h-4 rounded border-2 border-grey-lighter', */}
          {/*       areZeroBalancesHidden ? 'bg-grey-lighter' : null */}
          {/*     )} */}
          {/*   /> */}
          {/**/}
          {/*   <div className="text-grey-lighter">Hide 0 balances</div> */}
          {/* </div> */}
        </div>

        {/* <div className="py-6 flex items-stretch"> */}
        {/*   <input */}
        {/*     className="px-6 py-4 w-full border border-divider border-r-0 bg-blue-dark rounded-l outline-none" */}
        {/*     placeholder="Search Asset" */}
        {/*     type="text" */}
        {/*   /> */}
        {/**/}
        {/*   <div className="flex items-center pr-6 bg-blue-dark border border-divider border-l-0 rounded-r"> */}
        {/*     <SearchIcon /> */}
        {/*   </div> */}
        {/* </div> */}

        <div>
          <div className="grid grid-cols-4 text-grey-light">
            <div className="py-3 px-4">Asset</div>
            <div className="py-3 px-4">Off Chain</div>
            <div className="py-3 px-4">On Chain</div>
            <div className="py-3 px-4">Actions</div>
          </div>

          <Row
            assetId={BTC_ASSET_ID}
            assetName="Bitcoin"
            assetTicker={ASSET_ID_TO_TICKER[BTC_ASSET_ID]}
          />

          {assetsResponse.data?.assets.map((a) => (
            <Row
              assetId={a.asset_id}
              assetName={a.name}
              assetTicker={a.ticker}
              key={a.asset_id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
