import { Search, ChevronDown, Plus, Bitcoin } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'react-toastify'

import { useAppSelector } from '../../../../app/store/hooks'
import { BTC_ASSET_ID } from '../../../../constants'
import { nodeApi } from '../../../../slices/nodeApi/nodeApi.slice'
import { DepositModal, uiSliceSeletors } from '../../../../slices/ui/ui.slice'

interface Props {
  onNext: (assetId: string) => void
}

interface Asset {
  asset_id: string
  ticker: string
  name?: string
  icon?: string
}

export const Step1 = ({ onNext }: Props) => {
  const modal = useAppSelector(uiSliceSeletors.modal) as DepositModal
  const [assetId, setAssetId] = useState<string>(modal.assetId ?? BTC_ASSET_ID)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewAsset, setIsNewAsset] = useState(false)

  const assets = nodeApi.useListAssetsQuery()

  // Combine BTC with other assets
  const allAssets: Asset[] = [
    { asset_id: BTC_ASSET_ID, name: 'Bitcoin', ticker: 'BTC' },
    ...(assets.data?.nia || []),
  ]

  const filteredAssets = allAssets.filter(
    (asset) =>
      asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.asset_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedAsset = allAssets.find((a) => a.asset_id === assetId)

  const handleAssetSelect = (asset: Asset | null) => {
    if (asset) {
      setAssetId(asset.asset_id)
      setIsNewAsset(false)
    }
    setIsDropdownOpen(false)
  }

  const handleSubmit = useCallback(() => {
    if (!assetId) {
      toast.error('Please select an asset')
      return
    }
    onNext(assetId)
  }, [assetId, onNext])

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
      <div className="flex flex-col items-center mb-8">
        <Bitcoin className="w-12 h-12 text-blue-500 mb-4" />
        <h3 className="text-3xl font-bold text-white mb-2">Select Asset</h3>
        <p className="text-slate-400 text-center max-w-md">
          Choose the asset you want to deposit into your wallet
        </p>
      </div>

      <div className="space-y-6 max-w-xl mx-auto">
        {/* Asset Selector */}
        <div className="relative">
          <button
            className="w-full p-4 bg-slate-800/50 rounded-xl border border-slate-700 
                     hover:border-blue-500/50 transition-all duration-200
                     flex items-center justify-between text-left"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex items-center gap-3">
              {selectedAsset ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-500 font-bold">
                      {selectedAsset.ticker[0]}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {selectedAsset.ticker}
                    </div>
                    <div className="text-sm text-slate-400">
                      {selectedAsset.name || 'Asset'}
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-slate-400">Select an asset</span>
              )}
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 
              ${isDropdownOpen ? 'transform rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div
              className="absolute mt-2 w-full bg-slate-800 rounded-xl border border-slate-700 
                          shadow-xl z-50 max-h-[400px] overflow-y-auto"
            >
              <div className="p-3 border-b border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 rounded-lg border border-slate-600 
                             text-white placeholder:text-slate-500 focus:border-blue-500 
                             focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search assets..."
                    type="text"
                    value={searchQuery}
                  />
                </div>
              </div>

              <div className="py-2">
                {filteredAssets.map((asset) => (
                  <button
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-500/10 
                             transition-colors duration-200"
                    key={asset.asset_id}
                    onClick={() => handleAssetSelect(asset)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-500 font-bold">
                        {asset.ticker[0]}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">
                        {asset.ticker}
                      </div>
                      <div className="text-sm text-slate-400">
                        {asset.name || 'Asset'}
                      </div>
                    </div>
                  </button>
                ))}

                <button
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-500/10 
                           text-blue-500 transition-colors duration-200"
                  onClick={() => {
                    setIsNewAsset(true)
                    setIsDropdownOpen(false)
                  }}
                >
                  <Plus className="w-5 h-5" />
                  <span>Add New Asset</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* New Asset Input */}
        {isNewAsset && (
          <div className="space-y-2 animate-fadeIn">
            <label className="text-sm font-medium text-slate-400">
              Asset ID
            </label>
            <input
              className="w-full px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 
                       focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white
                       placeholder:text-slate-600"
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Enter asset ID"
              type="text"
            />
          </div>
        )}

        {/* Continue Button */}
        <button
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white 
                   rounded-xl font-medium transition-colors flex items-center 
                   justify-center gap-2"
          onClick={handleSubmit}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
