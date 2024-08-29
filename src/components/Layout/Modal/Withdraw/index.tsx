import { useEffect, useState } from 'react'
import { useForm, SubmitHandler, Controller } from 'react-hook-form'
import { toast } from 'react-toastify'
import { twJoin } from 'tailwind-merge'

import { useAppDispatch } from '../../../../app/store/hooks'
import { ASSET_ID_TO_TICKER, BTC_ASSET_ID } from '../../../../constants'
import { nodeApi } from '../../../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../../../slices/ui/ui.slice'
import { Select } from '../../../Select'

interface Fields {
  address: string
  amount: number
  fee_rate: string
  asset_id: string
  network: 'on-chain' | 'lightning'
}

export const WithdrawModalContent = () => {
  const [assetBalance, setAssetBalance] = useState(0)

  const dispatch = useAppDispatch()

  const [sendBtc] = nodeApi.useLazySendBtcQuery()
  const [sendAsset] = nodeApi.useLazySendAssetQuery()
  const [sendPayment] = nodeApi.useLazySendPaymentQuery()

  const assets = nodeApi.endpoints.listAssets.useQuery()

  const form = useForm<Fields>({
    defaultValues: {
      address: '',
      amount: 0,
      asset_id: BTC_ASSET_ID,
      fee_rate: '2.0',
      network: 'on-chain',
    },
  })

  const assetId = form.watch('asset_id')
  const network = form.watch('network')

  const availableAssets = [
    { label: ASSET_ID_TO_TICKER[BTC_ASSET_ID], value: BTC_ASSET_ID },
    ...(assets.data?.nia.map((asset) => ({
      label: asset.ticker,
      value: asset.asset_id,
    })) ?? []),
  ]

  const feeRates = [
    { label: 'Slow', value: '1.0' },
    { label: 'Normal', value: '2.0' },
    { label: 'Fast', value: '3.0' },
  ]

  const onSubmit: SubmitHandler<Fields> = async (data) => {
    if (data.network === 'on-chain' && data.asset_id === BTC_ASSET_ID) {
      sendBtc({
        address: data.address,
        amount: Number(data.amount),
        fee_rate: parseFloat(data.fee_rate),
      }).then((res: any) => {
        if (res.error) {
          toast.error(res.error.data.error)
        } else {
          toast.success('Withdrawal successful')
          dispatch(uiSliceActions.setModal({ type: 'none' }))
        }
      })
    } else if (data.network === 'on-chain' && data.asset_id !== BTC_ASSET_ID) {
      sendAsset({
        amount: Number(data.amount),
        asset_id: data.asset_id,
        recipient_id: data.address,
      }).then((res: any) => {
        if (res.error) {
          toast.error(res.error.data.error)
        } else {
          toast.success('Withdrawal successful')
          dispatch(uiSliceActions.setModal({ type: 'none' }))
        }
      })
    } else if (data.network === 'lightning') {
      sendPayment({
        invoice: data.address,
      }).then((res: any) => {
        if (res.error) {
          toast.error(res.error.data.error)
        } else {
          toast.success('Withdrawal successful')
          dispatch(uiSliceActions.setModal({ type: 'none' }))
        }
      })
    }
  }

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
                  <div
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => {
                      form.setValue('asset_id', BTC_ASSET_ID)
                      field.onChange('on-chain')
                    }}
                  >
                    <div
                      className={twJoin(
                        'flex-auto w-4 h-4 rounded border-2 border-grey-lighter',
                        field.value === 'on-chain' ? 'bg-grey-lighter' : null
                      )}
                    />

                    <div className="text-grey-lighter">On-chain</div>
                  </div>

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
                </div>
              </div>
            )}
          />

          {network === 'on-chain' && assetId === BTC_ASSET_ID && (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-center font-light mb-3 text-xs">
                  <div>Amount</div>

                  <div>
                    <span className="font-light">Available:</span>{' '}
                    {assetBalance}
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
                    name="asset_id"
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

              <div className="mb-6">
                <div className="flex justify-between items-center font-light mb-3 text-xs">
                  <div>Fee Rate</div>
                </div>

                <div className="flex space-x-2">
                  <Controller
                    control={form.control}
                    name="fee_rate"
                    render={({ field }) => (
                      <Select
                        active={field.value.toString()}
                        onSelect={field.onChange}
                        options={feeRates}
                      />
                    )}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <div className="flex justify-between items-center font-light mb-3 text-xs">
              {network === 'on-chain' && assetId === BTC_ASSET_ID ? (
                <div>Withdrawal Address</div>
              ) : (
                <div>Invoice</div>
              )}
            </div>

            <Controller
              control={form.control}
              name="address"
              render={({ field }) => (
                <input
                  className="rounded bg-blue-dark px-4 py-3 w-full outline-none"
                  placeholder={
                    network === 'on-chain'
                      ? 'Paste Withdrawal Address Here'
                      : 'Paste Invoice Here'
                  }
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

      {form.formState.isSubmitted && !form.formState.isSubmitSuccessful && (
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
      )}
    </form>
  )
}
