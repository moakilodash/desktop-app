import Decimal from 'decimal.js'
import {
  Link as Chain,
  Zap,
  RefreshCw,
  Loader as LoaderIcon,
} from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { twJoin } from 'tailwind-merge'

import { RootState } from '../../../app/store'
import { Button, Badge, Alert, IconButton } from '../../../components/ui'
import { nodeApi } from '../../../slices/nodeApi/nodeApi.slice'

const COL_CLASS_NAME = 'py-3 px-4'

const formatBitcoinAmount = (
  amount: string | number,
  bitcoinUnit: string
): string => {
  const amountDecimal = new Decimal(amount)
  if (bitcoinUnit === 'SAT') {
    return amountDecimal.toFixed(0)
  } else {
    return amountDecimal.div(100000000).toFixed(8)
  }
}

const formatAssetAmount = (
  amount: string | number,
  asset: string,
  bitcoinUnit: string,
  assetsList?: any[]
): string => {
  if (asset === 'BTC') {
    return formatBitcoinAmount(amount, bitcoinUnit)
  }

  // Find asset info to get precision
  const assetInfo = assetsList?.find((a) => a.ticker === asset)
  const precision = assetInfo?.precision ?? 8 // Default to 8 if not found

  // Convert to decimal and format with proper precision
  const amountDecimal = new Decimal(amount)
  return amountDecimal.div(Math.pow(10, precision)).toFixed(precision)
}

interface DepositProps {
  type: 'on-chain' | 'off-chain'
  asset: string
  amount: string | number
  txId: string
  bitcoinUnit: string
  assetsList?: any[]
}

const Deposit: React.FC<DepositProps> = ({
  type,
  asset,
  amount,
  txId,
  bitcoinUnit,
  assetsList,
}) => {
  const formattedAmount = formatAssetAmount(
    amount,
    asset,
    bitcoinUnit,
    assetsList
  )

  const displayAsset = asset === 'BTC' ? bitcoinUnit : asset

  return (
    <div className="grid grid-cols-1 sm:grid-cols-8 border-b border-slate-700 items-center text-base font-medium p-4 sm:p-0 hover:bg-slate-800/30 transition-colors">
      <div className={twJoin(COL_CLASS_NAME, 'flex items-center')}>
        {type === 'on-chain' ? (
          <Badge
            icon={<Chain className="w-4 h-4" />}
            size="sm"
            variant="primary"
          >
            On-chain
          </Badge>
        ) : (
          <Badge icon={<Zap className="w-4 h-4" />} size="sm" variant="info">
            Off-chain
          </Badge>
        )}
      </div>
      <div className={COL_CLASS_NAME}>{displayAsset}</div>
      <div className={COL_CLASS_NAME}>{formattedAmount}</div>
      <div
        className={twJoin(
          COL_CLASS_NAME,
          'col-span-1 sm:col-span-5 truncate text-slate-400'
        )}
      >
        {txId}
      </div>
    </div>
  )
}

export const Component: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'on-chain' | 'off-chain'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const bitcoinUnit = useSelector(
    (state: RootState) => state.settings.bitcoinUnit
  )

  const { data: listAsstetsData } = nodeApi.endpoints.listAssets.useQuery()
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    isError: transactionsError,
    refetch: refetchTransactions,
  } = nodeApi.endpoints.listTransactions.useQuery({ skip_sync: false })
  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = nodeApi.endpoints.listPayments.useQuery()

  const isLoading = transactionsLoading || paymentsLoading
  const isError = transactionsError || paymentsError

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchTransactions(), refetchPayments()])
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <LoaderIcon className="w-12 h-12 animate-spin text-cyan" />
        <p className="text-slate-400">Loading deposit history...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <Alert title="Error Loading Data" variant="error">
        <p>
          There was an error loading your deposit history. Please try again.
        </p>
        <div className="mt-4">
          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </Alert>
    )
  }

  const onChainDeposits =
    transactionsData?.transactions
      .filter(
        (tx) =>
          tx.transaction_type === 'User' &&
          new Decimal(tx.received).minus(tx.sent).gt(0)
      )
      .map((tx) => ({
        amount: new Decimal(tx.received).minus(tx.sent).toString(),
        asset: 'BTC',
        txId: tx.txid,
        type: 'on-chain' as const,
      })) || []

  const offChainDeposits =
    paymentsData?.payments
      .filter((payment) => payment.inbound)
      .map((payment) => ({
        amount: payment.asset_id
          ? payment.asset_amount.toString()
          : (payment.amt_msat / 1000).toString(),
        asset:
          listAsstetsData?.nia.find((a) => a.asset_id === payment.asset_id)
            ?.ticker || 'BTC',
        txId: payment.payment_hash,
        type: 'off-chain' as const,
      })) || []

  const allDeposits = [...onChainDeposits, ...offChainDeposits].sort((a, b) =>
    new Decimal(b.amount).comparedTo(new Decimal(a.amount))
  )

  const filteredDeposits = allDeposits.filter(
    (deposit) => filter === 'all' || deposit.type === filter
  )

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">Deposit History</h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => setFilter('all')}
            size="sm"
            variant={filter === 'all' ? 'primary' : 'outline'}
          >
            All
          </Button>
          <Button
            onClick={() => setFilter('on-chain')}
            size="sm"
            variant={filter === 'on-chain' ? 'primary' : 'outline'}
          >
            On-chain
          </Button>
          <Button
            onClick={() => setFilter('off-chain')}
            size="sm"
            variant={filter === 'off-chain' ? 'primary' : 'outline'}
          >
            Off-chain
          </Button>
          <IconButton
            aria-label="Refresh"
            disabled={isRefreshing}
            icon={
              isRefreshing ? (
                <LoaderIcon className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )
            }
            onClick={handleRefresh}
            variant="outline"
          />
        </div>
      </div>

      {filteredDeposits.length === 0 ? (
        <div className="text-center py-8 text-slate-400 bg-slate-800/30 rounded-lg border border-slate-700">
          No deposits found.
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-800/30 rounded-lg border border-slate-700">
          <div className="min-w-max">
            <div className="grid grid-cols-1 sm:grid-cols-8 font-medium text-slate-400 border-b border-slate-700 py-2">
              <div className={COL_CLASS_NAME}>Type</div>
              <div className={COL_CLASS_NAME}>Asset</div>
              <div className={COL_CLASS_NAME}>Amount</div>
              <div
                className={twJoin(COL_CLASS_NAME, 'col-span-1 sm:col-span-5')}
              >
                Transaction ID
              </div>
            </div>

            {filteredDeposits.map((deposit, index) => (
              <Deposit
                amount={deposit.amount}
                asset={deposit.asset}
                assetsList={listAsstetsData?.nia}
                bitcoinUnit={bitcoinUnit}
                key={`${deposit.txId}-${index}`}
                txId={deposit.txId}
                type={deposit.type}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
