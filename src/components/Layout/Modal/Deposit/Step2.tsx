import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { twJoin } from 'tailwind-merge'

import { BTC_ASSET_ID } from '../../../../constants'
import { CopyIcon } from '../../../../icons/Copy'
import { nodeApi } from '../../../../slices/nodeApi/nodeApi.slice'

interface Props {
  assetId: string
  onBack: VoidFunction
  onNext: VoidFunction
}

interface Fields {
  amount?: number
  network: 'on-chain' | 'lightning'
}

export const Step2 = ({ assetId, onBack, onNext }: Props) => {
  const [address, setAddress] = useState<string>()

  const [assets, assetsResponse] = nodeApi.endpoints.listAssets.useLazyQuery()
  const [addressQuery] = nodeApi.endpoints.address.useLazyQuery()
  const [lnInvoice] = nodeApi.endpoints.lnInvoice.useLazyQuery()
  const [rgbInvoice] = nodeApi.endpoints.rgbInvoice.useLazyQuery()

  const form = useForm<Fields>({
    defaultValues: {
      amount: 0,
      network: 'on-chain',
    },
  })
  const amount = form.watch('amount')
  const network = form.watch('network')

  const onSubmit: SubmitHandler<Fields> = (data) => {
    console.log('data', data)
  }

  useEffect(() => {
    assets()
  }, [assets])

  useEffect(() => {
    if (network === 'on-chain' && assetId === BTC_ASSET_ID) {
      form.setValue('amount', 0)
      addressQuery().then((res) => {
        setAddress(res.data?.address)
      })
    } else if (network === 'on-chain' && assetId !== BTC_ASSET_ID) {
      rgbInvoice({ asset_id: assetId }).then((res: any) => {
        if (res.error) {
          toast.error(res.error.data?.error)
        } else {
          setAddress(res.data?.invoice)
        }
      })
    } else if (network === 'lightning' && assetId && amount && amount > 0) {
      lnInvoice({
        asset_amount: Number(amount),
        asset_id: assetId,
      }).then((res: any) => {
        if (res.error) {
          toast.error(res.error.data?.error)
        } else {
          setAddress(res.data?.invoice)
        }
      })
    } else {
      setAddress('')
    }
  }, [amount, form, network, assetId, addressQuery, rgbInvoice, lnInvoice])

  return (
    <form
      className="min-h-full flex justify-between flex-col space-y-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div>
        <div className="text-center mb-10">
          <h3 className="text-2xl font-semibold mb-4">Fund your wallet</h3>

          <p>
            Fill in the fields below, then scan the QR code or copy the address
            to fund your wallet.
          </p>
        </div>

        <div className="mx-auto bg-section-lighter rounded p-8">
          <Controller
            control={form.control}
            name="network"
            render={({ field }) => (
              <div className="mb-6">
                <div className="text-xs mb-3">Deposit Method</div>

                <div className="flex items-center space-x-6">
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

          {network === 'lightning' ? (
            <div className="mb-12">
              <div className="flex justify-between items-center font-light mb-3">
                <div className="text-xs">Amount</div>
              </div>

              <div className="flex items-stretch">
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
                />

                <div className="bg-blue-dark rounded-r flex items-center pr-4 text-cyan">
                  {assetId === BTC_ASSET_ID
                    ? 'BTC'
                    : assetsResponse.data?.nia.find(
                        (a) => a.asset_id === assetId
                      )?.ticker}
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}

          {address && address.length > 0 && (
            <div className="flex items-center space-x-6 max-w-fit">
              <QRCodeSVG fgColor="#3A3C4A" value={address ?? ''} />

              <div>
                <div className="text-xs font-light">Wallet Address:</div>

                <div className="flex items-center space-x-4">
                  <div className="break-words overflow-hidden whitespace-normal">
                    {address.length > 67
                      ? address.slice(0, 64) + '...'
                      : address}
                  </div>{' '}
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(address ?? '').then(() => {
                        toast.success('Invoice copied to clipboard')
                      })
                    }}
                  >
                    <CopyIcon />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="px-6 py-3 rounded text-lg font-medium text-grey-light"
          onClick={onBack}
          type="button"
        >
          Go Back
        </button>

        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan"
          onClick={onNext}
          type="button"
        >
          Finish
        </button>
      </div>
    </form>
  )
}
