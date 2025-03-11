import { useState } from 'react'

// Error constants
const ERROR_NOT_ENOUGH_UNCOLORED =
  'No uncolored UTXOs are available (hint: call createutxos)'
const ERROR_INSUFFICIENT_ALLOCATION_SLOT =
  'Cannot open channel: InsufficientAllocationSlots'
const ERROR_INSUFFICIENT_UTXOs = [
  ERROR_NOT_ENOUGH_UNCOLORED,
  ERROR_INSUFFICIENT_ALLOCATION_SLOT,
]

/**
 * Custom hook to handle UTXO-related errors and show the CreateUTXOModal when needed
 */
export const useUtxoErrorHandler = () => {
  const [showUtxoModal, setShowUtxoModal] = useState(false)
  const [utxoModalProps, setUtxoModalProps] = useState({
    channelCapacity: 0,
    error: '',
    operationType: 'issuance' as 'issuance' | 'channel',
    retryFunction: undefined as (() => Promise<any>) | undefined,
  })

  /**
   * Check if the error is related to insufficient UTXOs
   */
  const isUtxoError = (error: any): boolean => {
    if (!error || !error.data || !error.data.error) {
      return false
    }

    return ERROR_INSUFFICIENT_UTXOs.some((errorMsg) =>
      error.data.error.includes(errorMsg)
    )
  }

  /**
   * Handle an API error by showing the UTXO modal if the error is UTXO-related
   * @returns true if the error was handled, false otherwise
   */
  const handleApiError = (
    error: any,
    operationType: 'issuance' | 'channel' = 'issuance',
    channelCapacity = 0,
    retryFunction?: () => Promise<any>
  ): boolean => {
    if (isUtxoError(error)) {
      setUtxoModalProps({
        channelCapacity,
        error: error.data.error,
        operationType,
        retryFunction,
      })
      setShowUtxoModal(true)
      return true
    }
    return false
  }

  return {
    handleApiError,
    isUtxoError,
    setShowUtxoModal,
    showUtxoModal,
    utxoModalProps,
  }
}
