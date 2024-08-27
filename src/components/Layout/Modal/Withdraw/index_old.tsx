import Decimal from 'decimal.js'
import { useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { twJoin } from 'tailwind-merge'

import { useAppDispatch } from '../../../../app/store/hooks'
import { ASSET_ID_TO_TICKER, BTC_ASSET_ID } from '../../../../constants'
import { nodeApi } from '../../../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../../../slices/ui/ui.slice'
import { Select } from '../../../Select'

interface Fields {
  address: string
  amount: number
  assetId: string
  network: 'on-chain' | 'lightning'
}

export const WithdrawModalContent = () => {
  const dispatch = useAppDispatch()
  const [assetBalance, setAssetBalance] = useState(0)

  const [sendBtc] = nodeApi.useLazySendBtcQuery()
  const [sendAsset] = nodeApi.useLazySendAssetQuery()

  const form = useForm<Fields>({
    defaultValues: {
      address: '',
      amount: 0,
      assetId: BTC_ASSET_ID,
      network: 'on-chain',
    },
  })

  const assets = nodeApi.endpoints.listAssets.useQuery()
  const assetId = form.watch('assetId')
  const network = form.watch('network')

  const availableAssets = [
    { label: ASSET_ID_TO_TICKER[BTC_ASSET_ID], value: BTC_ASSET_ID },
    ...(assets.data?.nia.map((asset) => ({
      label: asset.ticker,
      value: asset.asset_id,
    })) ?? []),
  ].filter((asset) =>
    network === 'lightning' ? asset.value !== BTC_ASSET_ID : true
  )

  useEffect(() => {
    if (network === 'lightning') {
      form.setValue('assetId', availableAssets[0].value)
    }
  }, [availableAssets, form, network])

  useEffect(() => {
    if (assetId === BTC_ASSET_ID) {
      dispatch(nodeApi.endpoints.btcBalance.initiate())
        .unwrap()
        .then((balance: any) => {
          setAssetBalance(balance.vanilla.spendable)
        })
    } else {
      dispatch(nodeApi.endpoints.assetBalance.initiate({ asset_id: assetId }))
        .unwrap()
        .then((balance: any) => {
          setAssetBalance(balance.spendable)
        })
    }
  }, [assetId, dispatch])

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    const res =
      network === 'on-chain'
        ? await sendBtc({
            address: data.address,
            amount: new Decimal(data.amount)
              .mul(100_000_000)
              .trunc()
              .toNumber(),
          })
        : await sendAsset({
            amount: Number(data.amount),
            asset_id: data.assetId,
            blinded_utxo: data.address,
          })

    if (res.isSuccess) {
      dispatch(uiSliceActions.setModal({ type: 'none' }))
    } else {
      form.setError('root', { message: 'Test' })
    }
  }

  return (
    <form
      className="min-h-full flex justify-between flex-col space-y-6"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div>
        <div className="text-center mb-10">
          <h3 className="text-2xl font-semibold mb-4">Withdraw Assets</h3>

          <p>Fill in the fields below to withdraw assets.</p>
        </div>

        <div className="max-w-screen-md mx-auto bg-section-lighter rounded p-8">
          <Controller
            control={form.control}
            name="network"
            render={({ field }) => (
              <div className="mb-6">
                <div className="text-xs mb-3">Withdrawal Method</div>

                <div className="flex items-center space-x-6">
                  {assetId === BTC_ASSET_ID ? (
                    <div
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => field.onChange('on-chain')}
                    >
                      <div
                        className={twJoin(
                          'flex-auto w-4 h-4 rounded border-2 border-grey-lighter',
                          field.value === 'on-chain' ? 'bg-grey-lighter' : null
                        )}
                      />

                      <div className="text-grey-lighter">On-chain</div>
                    </div>
                  ) : (
                    <></>
                  )}

                  {assetId !== BTC_ASSET_ID ? (
                    <div
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => field.onChange('lightning')}
                    >
                      <div
                        className={twJoin(
                          'flex-auto w-4 h-4 rounded border-2 border-grey-lighter',
                          field.value === 'lightning' ? 'bg-grey-lighter' : null
                        )}
                      />

                      <div className="text-grey-lighter">Lightning Network</div>
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
              </div>
            )}
          />

          {network === 'on-chain' ? (
            <div className="mb-6">
              <div className="flex justify-between items-center font-light mb-3 text-xs">
                <div>Amount</div>

                <div>
                  <span className="font-light">Available:</span> {assetBalance}
                </div>
              </div>

              <div className="flex space-x-2">
                <div className="flex-1 flex items-stretch">
                  <Controller
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <input
                        className="flex-1 rounded-l bg-blue-dark px-4 py-3 w-full outline-none"
                        type="text"
                        {...field}
                      />
                    )}
                    rules={{
                      max: assetBalance,
                      min: assetId === BTC_ASSET_ID ? 0.00000001 : 1,
                      pattern:
                        assetId === BTC_ASSET_ID
                          ? /([0-9]*[.])?[0-9]+/
                          : /[0-9]+/,
                    }}
                  />

                  <div
                    className="bg-blue-dark rounded-r flex items-center pr-4 text-cyan cursor-pointer"
                    onClick={() => form.setValue('amount', assetBalance)}
                  >
                    MAX
                  </div>
                </div>

                <Controller
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <Select
                      active={field.value}
                      onSelect={field.onChange}
                      options={availableAssets}
                    />
                  )}
                />
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex justify-between items-center font-light mb-3 text-xs">
              <div>Withdrawal Address</div>
            </div>

            <Controller
              control={form.control}
              name="address"
              render={({ field }) => (
                <input
                  className="rounded bg-blue-dark px-4 py-3 w-full outline-none"
                  placeholder="Paste Withdrawal Address Here"
                  type="text"
                  {...field}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan"
          type="submit"
        >
          Withdraw
        </button>
      </div>

      {!form.formState.isSubmitSuccessful && form.formState.isSubmitted ? (
        <>
          <div className="flex justify-end text-red mt-4" key={0}>
            There was an error submitting the form.
          </div>

          {[form.formState.errors.amount, form.formState.errors.root]
            .filter((e) => e?.message)
            .map((e, i) => (
              <div className="flex justify-end text-red mt-4" key={i + 1}>
                {e!.message}
              </div>
            ))}
        </>
      ) : null}
    </form>
  )
}
