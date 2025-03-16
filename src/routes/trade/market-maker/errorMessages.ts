/**
 * Generates validation error messages for the swap form
 */
export const getValidationError = (
  fromAmount: number,
  toAmount: number,
  minFromAmount: number,
  maxFromAmount: number,
  maxToAmount: number,
  maxOutboundHtlcSat: number,
  fromAsset: string,
  toAsset: string,
  formatAmount: (amount: number, asset: string) => string,
  displayAsset: (asset: string) => string
): string | null => {
  // Check for zero amounts when a swap is attempted
  if (fromAmount === 0 || toAmount === 0) {
    return 'Cannot swap zero amounts. Please enter a valid amount.'
  }

  // Validate from amount against minimum requirement
  if (fromAmount > 0 && fromAmount < minFromAmount) {
    return `The amount you're trying to send (${formatAmount(
      fromAmount,
      fromAsset
    )} ${displayAsset(fromAsset)}) is too small. Minimum required: ${formatAmount(
      minFromAmount,
      fromAsset
    )} ${displayAsset(fromAsset)}`
  }

  // Validate from amount against maximum limit
  if (fromAmount > maxFromAmount) {
    return `Insufficient balance. You're trying to send ${formatAmount(
      fromAmount,
      fromAsset
    )} ${displayAsset(fromAsset)}, but you only have ${formatAmount(
      maxFromAmount,
      fromAsset
    )} ${displayAsset(fromAsset)} available.`
  }

  // Validate to amount against maximum limit
  if (toAmount > maxToAmount) {
    return `The amount you're trying to receive (${formatAmount(
      toAmount,
      toAsset
    )} ${displayAsset(toAsset)}) exceeds the maximum receivable amount. Maximum: ${formatAmount(
      maxToAmount,
      toAsset
    )} ${displayAsset(toAsset)}`
  }

  // Validate against HTLC limit for BTC
  if (fromAsset === 'BTC' && fromAmount > maxOutboundHtlcSat) {
    return `The amount exceeds the maximum HTLC limit. Maximum: ${formatAmount(
      maxOutboundHtlcSat,
      fromAsset
    )} ${displayAsset(fromAsset)}`
  }

  return null
}
