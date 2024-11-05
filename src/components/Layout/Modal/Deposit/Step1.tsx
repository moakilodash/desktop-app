import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { useAppSelector } from '../../../../app/store/hooks.ts'
import { BTC_ASSET_ID } from '../../../../constants'
import { nodeApi } from '../../../../slices/nodeApi/nodeApi.slice'
import {
  DepositModal,
  uiSliceSeletors,
} from '../../../../slices/ui/ui.slice.ts'
import { Select } from '../../../Select'

interface Props {
  onNext: (assetId: string) => void
}

export const Step1 = (props: Props) => {
  const modal = useAppSelector(uiSliceSeletors.modal) as DepositModal
  const [assetId, setAssetId] = useState<string>(modal.assetId ?? BTC_ASSET_ID)
  const [isNewAsset, setIsNewAsset] = useState<boolean>(false)
  const [error] = useState<string>()

  const assets = nodeApi.useListAssetsQuery()

  const handleSelect = (assetId: string) => {
    if (assetId === '') {
      setIsNewAsset(true)
      setAssetId(assetId)
    } else {
      setIsNewAsset(false)
      setAssetId(assetId)
    }
  }

  const handleSubmit = useCallback(() => {
    if (assetId === '') {
      toast.error('Please select an asset.')
    } else {
      props.onNext(assetId)
    }
  }, [props, assetId])

  useEffect(() => {
    if (modal.assetId) {
      handleSubmit()
    }
  }, [modal, handleSubmit])

  return (
    <div className="min-h-full flex justify-between flex-col space-y-4">
      <div>
        <div className="text-center mb-10">
          <h3 className="text-2xl font-semibold mb-4">Fund your wallet</h3>
          <p>Choose the asset.</p>
        </div>

        <div className="flex flex-col justify-center items-center">
          <Select
            active={assetId}
            onSelect={handleSelect}
            options={[
              { label: 'BTC', value: BTC_ASSET_ID },
              ...(assets.data?.nia.map((asset) => ({
                label: asset.ticker,
                value: asset.asset_id,
              })) ?? []),
              { label: 'new asset', value: '' },
            ]}
            theme="light"
          />
          {isNewAsset && (
            <input
              className="flex-1 rounded-l bg-section-lighter px-4 py-3 mt-4 w-full outline-none"
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="asset id"
              type="text"
            />
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-end">
          <button
            className="px-6 py-3 rounded border text-lg font-bold border-cyan"
            onClick={handleSubmit}
          >
            Next
          </button>
        </div>
        <div className="flex justify-end text-red mt-4">{error}</div>
      </div>
    </div>
  )
}
