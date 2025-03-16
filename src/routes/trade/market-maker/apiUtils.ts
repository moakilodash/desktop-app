import { FetchBaseQueryError } from '@reduxjs/toolkit/query'

import { logger } from '../../../utils/logger'

/**
 * Handles API errors and extracts readable error messages
 */
export const handleApiError = (error: FetchBaseQueryError): string => {
  if (!error) return 'Unknown error occurred'

  if (typeof error === 'string') return error

  const errorData = error.data
  if (!errorData) return 'No error details available'

  // Handle string error responses
  if (typeof errorData === 'string') return errorData

  // Handle object error responses
  if (typeof errorData === 'object') {
    // First check for detail field which is common in API errors
    if ('detail' in errorData && typeof errorData.detail === 'string') {
      // Extract just the error message without the status code if possible
      const match = errorData.detail.match(/\d{3}:\s*(.+)/)
      return match ? match[1].trim() : errorData.detail
    }
    // Fallback to error field
    if ('error' in errorData && typeof errorData.error === 'string') {
      return errorData.error
    }
    // If no recognized error format, stringify the object
    return JSON.stringify(errorData)
  }

  return String(errorData)
}

/**
 * Creates a handler for refreshing data (channels, pairs, etc.)
 */
export const createRefreshDataHandler = (
  listChannels: any,
  getPairs: any,
  dispatch: any,
  form: any,
  channels: any[],
  assetsData: any,
  formatAmount: (amount: number, asset: string) => string,
  updateMinMaxAmounts: () => Promise<void>,
  refreshAmounts: () => Promise<void>,
  setTradingPairs: (pairs: any[]) => void,
  setTradablePairs: (pairs: any[]) => void,
  setSelectedPair: (pair: any) => void,
  setChannels: (channels: any[]) => void,
  setAssets: (assets: any[]) => void,
  setIsLoading: (isLoading: boolean) => void
) => {
  return async () => {
    setIsLoading(true)
    try {
      const [listChannelsResponse, getPairsResponse] = await Promise.all([
        listChannels(),
        getPairs(),
      ])

      if ('data' in listChannelsResponse && listChannelsResponse.data) {
        setChannels(listChannelsResponse.data.channels)
      }

      if (assetsData) {
        setAssets(assetsData.nia)
      }

      if ('data' in getPairsResponse && getPairsResponse.data) {
        dispatch(setTradingPairs(getPairsResponse.data.pairs))
        const tradableAssets = new Set([
          ...channels.map((c) => c.asset_id).filter((id) => id !== null),
        ])
        const filteredPairs = getPairsResponse.data.pairs.filter(
          (pair: any) =>
            tradableAssets.has(pair.base_asset_id) ||
            tradableAssets.has(pair.quote_asset_id)
        )
        setTradablePairs(filteredPairs)

        if (filteredPairs.length > 0) {
          setSelectedPair(filteredPairs[0])
          form.setValue('fromAsset', filteredPairs[0].base_asset)
          form.setValue('toAsset', filteredPairs[0].quote_asset)
          const defaultMinAmount = filteredPairs[0].min_order_size
          form.setValue(
            'from',
            formatAmount(defaultMinAmount, filteredPairs[0].base_asset)
          )
        }
      }

      await updateMinMaxAmounts()
      await refreshAmounts()

      logger.info('Data refreshed successfully')
    } catch (error) {
      logger.error('Error refreshing data:', error)
      throw new Error('Failed to refresh data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
}
