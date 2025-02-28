import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { Loader } from '../../../components/Loader'
import { StatusToast } from '../../../components/StatusToast'
import { NoChannelsMessage, NostrP2P } from '../../../components/Trade'
import { nodeApi, NiaAsset } from '../../../slices/nodeApi/nodeApi.slice'
import { logger } from '../../../utils/logger'

export const Component = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [assets, setAssets] = useState<NiaAsset[]>([])
  const [hasValidChannelsForTrading, setHasValidChannelsForTrading] =
    useState(false)

  // API hooks
  const [listChannels] = nodeApi.endpoints.listChannels.useLazyQuery()

  const { data: assetsData } = nodeApi.endpoints.listAssets.useQuery(
    undefined,
    {
      pollingInterval: 30000,
      refetchOnFocus: false,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: false,
    }
  )

  // Fetch initial data
  useEffect(() => {
    const setup = async () => {
      setIsLoading(true)
      try {
        const listChannelsResponse = await listChannels()

        if ('data' in listChannelsResponse && listChannelsResponse.data) {
          const channelsList = listChannelsResponse.data.channels

          // Check if there's at least one channel with an asset that is ready and usable
          const hasValidChannels = channelsList.some(
            (channel) =>
              channel.asset_id !== null &&
              channel.ready &&
              (channel.outbound_balance_msat > 0 ||
                channel.inbound_balance_msat > 0)
          )
          setHasValidChannelsForTrading(hasValidChannels)
        }

        if (assetsData) {
          setAssets(assetsData.nia)
        }

        logger.info('Initial data fetched successfully')
      } catch (error) {
        logger.error('Error during setup:', error)
        toast.error(
          'Failed to initialize the Nostr P2P component. Please try again.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    setup()
  }, [listChannels, assetsData])

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const listChannelsResponse = await listChannels()

      if ('data' in listChannelsResponse && listChannelsResponse.data) {
        const channelsList = listChannelsResponse.data.channels

        // Check if there's at least one channel with an asset that is ready and usable
        const hasValidChannels = channelsList.some(
          (channel) =>
            channel.asset_id !== null &&
            channel.ready &&
            (channel.outbound_balance_msat > 0 ||
              channel.inbound_balance_msat > 0)
        )
        setHasValidChannelsForTrading(hasValidChannels)
      }

      if (assetsData) {
        setAssets(assetsData.nia)
      }

      logger.info('Data refreshed successfully')
    } catch (error) {
      logger.error('Error refreshing data:', error)
      toast.error('Failed to refresh data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Render functions
  const renderNoChannelsMessage = () => (
    <NoChannelsMessage onMakerChange={refreshData} onNavigate={navigate} />
  )

  const renderNostrP2P = () => (
    <div className="swap-form-container w-full max-w-2xl">
      <div className="bg-gradient-to-b from-slate-900/80 to-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-lg w-full">
        <NostrP2P />
      </div>
    </div>
  )

  return (
    <div className="container mx-auto w-full flex items-center justify-center">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      ) : !hasValidChannelsForTrading ? (
        renderNoChannelsMessage()
      ) : (
        <div>{renderNostrP2P()}</div>
      )}

      {!isLoading && assets.length > 0 && <StatusToast assets={assets} />}
    </div>
  )
}
