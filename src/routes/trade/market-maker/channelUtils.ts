import { Channel } from '../../../slices/nodeApi/nodeApi.slice'
import { logger } from '../../../utils/logger'

/**
 * Checks if a single channel is considered tradable
 * @param channel The channel to check
 * @returns boolean indicating if the channel is tradable
 */
export const isTradableChannel = (channel: Channel): boolean => {
  return (
    // Channel must be ready
    channel.ready &&
    // Channel must have either outbound or inbound balance
    (channel.outbound_balance_msat > 0 || channel.inbound_balance_msat > 0) &&
    // Channel must have a valid asset_id
    channel.asset_id !== null &&
    channel.asset_id !== undefined
  )
}

/**
 * Checks if there are any tradable channels in the provided array
 * @param channels Array of channels to check
 * @returns boolean indicating if there's at least one tradable channel
 */
export const hasTradableChannels = (channels: Channel[]): boolean => {
  return channels.some((channel) => isTradableChannel(channel))
}

/**
 * Filters the provided array to only include tradable channels
 * @param channels Array of channels to filter
 * @returns Array containing only tradable channels
 */
export const getTradableChannels = (channels: Channel[]): Channel[] => {
  return channels.filter((channel) => isTradableChannel(channel))
}

/**
 * Counts the number of tradable channels in the provided array
 * @param channels Array of channels to count from
 * @returns Number of tradable channels
 */
export const countTradableChannels = (channels: Channel[]): number => {
  return getTradableChannels(channels).length
}

/**
 * Channel diagnostics interface for reporting channel status
 */
export interface ChannelDiagnostics {
  totalChannels: number
  tradableChannels: number
  readyChannels: number
  channelsWithBalance: number
  channelsWithAssetId: number
}

/**
 * Gets diagnostic information about the tradable channels
 * @param channels Array of channels to analyze
 * @returns Object with diagnostic counts
 */
export const getTradableChannelDiagnostics = (
  channels: Channel[]
): ChannelDiagnostics => {
  return {
    channelsWithAssetId: channels.filter(
      (c) => c.asset_id !== null && c.asset_id !== undefined
    ).length,
    channelsWithBalance: channels.filter(
      (c) => c.outbound_balance_msat > 0 || c.inbound_balance_msat > 0
    ).length,
    readyChannels: channels.filter((c) => c.ready).length,
    totalChannels: channels.length,
    tradableChannels: countTradableChannels(channels),
  }
}

/**
 * Logs diagnostic information about the tradable channels
 * @param channels Array of channels to analyze and log
 */
export const logChannelDiagnostics = (channels: Channel[]): void => {
  const diagnostics = getTradableChannelDiagnostics(channels)

  logger.info(`Channel diagnostics:`)
  logger.info(`- Total channels: ${diagnostics.totalChannels}`)
  logger.info(`- Tradable channels: ${diagnostics.tradableChannels}`)
  logger.info(`- Ready channels: ${diagnostics.readyChannels}`)
  logger.info(`- Channels with balance: ${diagnostics.channelsWithBalance}`)
  logger.info(`- Channels with asset ID: ${diagnostics.channelsWithAssetId}`)
}

/**
 * Formats a channel diagnostics message for error reporting
 * @param channels Array of channels to analyze
 * @returns String message explaining the state of channels
 */
export const getChannelDiagnosticsMessage = (channels: Channel[]): string => {
  const diagnostics = getTradableChannelDiagnostics(channels)

  if (diagnostics.totalChannels === 0) {
    return 'No channels found. Please open channels to trade.'
  }

  if (diagnostics.tradableChannels === 0) {
    if (diagnostics.readyChannels === 0) {
      return 'Channels are not ready yet. Please wait for channels to become active.'
    }

    if (diagnostics.channelsWithBalance === 0) {
      return 'Channels have no balance. Please add funds to your channels.'
    }

    if (diagnostics.channelsWithAssetId === 0) {
      return 'No asset channels found. Please open channels with supported assets.'
    }

    return 'No tradable channels found. Channels may be missing balance or proper setup.'
  }

  return `${diagnostics.tradableChannels} tradable channels available.`
}
