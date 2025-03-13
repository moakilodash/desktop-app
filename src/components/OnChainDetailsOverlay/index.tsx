import { Link as ChainIcon } from 'lucide-react'

import { formatBitcoinAmount } from '../../helpers/number'
import { OverlayTooltip , LoadingPlaceholder } from '../ui'

export const OnChainDetailsOverlay = ({
  onChainBalance,
  onChainFutureBalance,
  onChainSpendableBalance,
  onChainColoredBalance,
  onChainColoredFutureBalance,
  onChainColoredSpendableBalance,
  bitcoinUnit,
  isLoading,
}: {
  onChainBalance: number
  onChainFutureBalance: number
  onChainSpendableBalance: number
  onChainColoredBalance: number
  onChainColoredFutureBalance: number
  onChainColoredSpendableBalance: number
  bitcoinUnit: string
  isLoading: boolean
}) => {
  return (
    <OverlayTooltip
      content={
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Normal Balance */}
          <div className="bg-[#151C2E] rounded-lg p-2 border border-slate-700/30">
            <h4 className="text-xs font-medium text-white mb-1.5 flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></div>
              Normal Balance
            </h4>
            <div className="space-y-1">
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Settled</div>
                <div className="text-xs font-medium text-white truncate">
                  {onChainBalance === 0 ? (
                    <span className="text-slate-500">No balance</span>
                  ) : (
                    `${formatBitcoinAmount(onChainBalance, bitcoinUnit)} ${bitcoinUnit}`
                  )}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Future</div>
                <div className="text-xs font-medium text-white truncate">
                  {onChainFutureBalance === 0 ? (
                    <span className="text-slate-500">No future balance</span>
                  ) : (
                    `${formatBitcoinAmount(onChainFutureBalance, bitcoinUnit)} ${bitcoinUnit}`
                  )}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Spendable</div>
                <div className="text-xs font-medium text-white truncate">
                  {onChainSpendableBalance === 0 ? (
                    <span className="text-slate-500">No spendable balance</span>
                  ) : (
                    `${formatBitcoinAmount(onChainSpendableBalance, bitcoinUnit)} ${bitcoinUnit}`
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Colored Balance */}
          <div className="bg-[#151C2E] rounded-lg p-2 border border-slate-700/30">
            <h4 className="text-xs font-medium text-white mb-1.5 flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></div>
              Colored Balance
            </h4>
            <div className="space-y-1">
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Settled</div>
                <div className="text-xs font-medium text-white truncate">
                  {onChainColoredBalance === 0 ? (
                    <span className="text-slate-500">No colored balance</span>
                  ) : (
                    `${formatBitcoinAmount(onChainColoredBalance, bitcoinUnit)} ${bitcoinUnit}`
                  )}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Future</div>
                <div className="text-xs font-medium text-white truncate">
                  {onChainColoredFutureBalance === 0 ? (
                    <span className="text-slate-500">
                      No future colored balance
                    </span>
                  ) : (
                    `${formatBitcoinAmount(onChainColoredFutureBalance, bitcoinUnit)} ${bitcoinUnit}`
                  )}
                </div>
              </div>
              <div className="bg-[#0B101B] rounded-md p-1">
                <div className="text-xs text-gray-400">Spendable</div>
                <div className="text-xs font-medium text-white truncate">
                  {onChainColoredSpendableBalance === 0 ? (
                    <span className="text-slate-500">
                      No spendable colored balance
                    </span>
                  ) : (
                    `${formatBitcoinAmount(onChainColoredSpendableBalance, bitcoinUnit)} ${bitcoinUnit}`
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
      title="On-chain Details"
    >
      <div>
        <span className="text-sm text-slate-400 flex items-center gap-2">
          <ChainIcon className="w-4 h-4 text-blue-500" />
          On-chain
        </span>
        <div className="text-lg font-medium text-white">
          {isLoading ? (
            <LoadingPlaceholder />
          ) : onChainBalance + onChainColoredBalance === 0 ? (
            <span className="text-slate-500">No balance</span>
          ) : (
            `${formatBitcoinAmount(onChainBalance + onChainColoredBalance, bitcoinUnit)} ${bitcoinUnit}`
          )}
        </div>
      </div>
    </OverlayTooltip>
  )
}
