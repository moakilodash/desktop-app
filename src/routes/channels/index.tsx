import { useCallback, useEffect } from 'react'
import { twJoin } from 'tailwind-merge'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { Row } from './Row'

const COL_CLASS_NAME = 'py-3 px-4 font-medium'

export const Component = () => {
  const [listChannels, listChannelsResponse] =
    nodeApi.endpoints.listChannels.useLazyQuery()

  const refreshChannels = useCallback(() => {
    listChannels()
  }, [listChannels])

  useEffect(() => {
    refreshChannels()
  }, [refreshChannels])

  return (
    <div className="bg-blue-dark py-8 px-6 rounded w-full">
      <div className="flex justify-between items-center mb-8">
        <div className="text-2xl font-semibold text-white">Wallet Dashboard</div>
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan text-white hover:bg-cyan hover:text-blue-dark transition"
          onClick={refreshChannels}
        >
          Refresh
        </button>
      </div>

      <div className="bg-section-lighter rounded-b py-8 px-6">
        {(listChannelsResponse?.data?.channels ?? []).length > 0 ? (
          <>
            <div className="grid grid-cols-12 font-medium text-grey-light mb-4">
              <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>Channel ID</div>
              <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>PubKey</div>
              <div className={twJoin(COL_CLASS_NAME)}>Capacity (SAT)</div>
              <div className={twJoin(COL_CLASS_NAME)}>Local Balance</div>
              <div className={twJoin(COL_CLASS_NAME)}>Remote Balance</div>
              <div className={twJoin(COL_CLASS_NAME)}>Outbound (mSAT)</div>
              <div className={twJoin(COL_CLASS_NAME)}>Inbound (mSAT)</div>
              <div className={twJoin(COL_CLASS_NAME)}>Asset</div>
              <div className={twJoin(COL_CLASS_NAME, 'col-span-2')}>Channel Status</div>
              <div className={COL_CLASS_NAME}>Actions</div>
            </div>

            {listChannelsResponse?.data?.channels.map((channel) => (
              <Row
                {...channel}
                key={channel.channel_id}
                onClose={refreshChannels}
              />
            ))}
          </>
        ) : (
          <div className="text-lg text-grey-light">
            You don't have any open channels yet.
          </div>
        )}
      </div>
    </div>
  )
}
