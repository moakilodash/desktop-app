import Decimal from 'decimal.js'
import { twJoin } from 'tailwind-merge'

import { nodeApi } from '../../../slices/nodeApi/nodeApi.slice'

const COL_CLASS_NAME = 'py-3 px-4'

export const Component = () => {
  const transactions = nodeApi.endpoints.listTransactions.useQuery()

  if (transactions.isLoading) {
    return <div>Loading...</div>
  }

  const withdrawals = transactions.data?.transactions.filter(
    (tx) => tx.transaction_type === 'User' && new Decimal(tx.sent).gt(0)
  )

  if (withdrawals?.length === 0) {
    return <div className="text-grey-light">No withdrawals yet.</div>
  }

  return (
    <>
      <div className="grid grid-cols-8 font-medium text-grey-light">
        <div className={COL_CLASS_NAME}>Action</div>
        <div className={COL_CLASS_NAME}>Asset</div>
        <div className={COL_CLASS_NAME}>Asset Quantity</div>
        <div className={twJoin(COL_CLASS_NAME, 'col-span-5')}>
          Transaction ID
        </div>
      </div>

      {withdrawals?.map((tx) => (
        <div
          className="grid grid-cols-8 even:bg-blue-dark rounded items-center text-lg font-medium"
          key={tx.txid}
        >
          <div className={COL_CLASS_NAME}>Withdrawn</div>
          <div className={COL_CLASS_NAME}>BTC</div>
          <div className={COL_CLASS_NAME}>{tx.sent} BTC</div>
          <div className={twJoin(COL_CLASS_NAME, 'col-span-5')}>{tx.txid}</div>
        </div>
      ))}
    </>
  )
}
