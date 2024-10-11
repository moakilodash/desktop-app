import Decimal from 'decimal.js'

import { NiaAsset } from '../slices/nodeApi/nodeApi.slice'

const SATOSHIS_PER_BTC = 100000000
const MSATS_PER_SAT = 1000

export const msatToSat = (msats: number): number => msats / MSATS_PER_SAT
export const satToMsat = (sats: number): number => sats * MSATS_PER_SAT

export const numberFormatter = {
  format: (value: number, precision: number = 2) =>
    (Math.floor(value / 0.01) * 0.01).toFixed(precision),
}

export const satoshiToBTC = (value: number): string =>
  new Decimal(value).mul(0.00000001).toFixed(8)

export const BTCtoSatoshi = (value: number): number =>
  new Decimal(value).mul(100000000).toNumber()

export const formatBitcoinAmount = (
  amount: number,
  bitcoinUnit: string,
  precision: number = 8
): string => {
  if (bitcoinUnit === 'SAT') {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(Math.round(amount))
  } else {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
      useGrouping: true,
    }).format(amount / SATOSHIS_PER_BTC)
  }
}

export const parseBitcoinAmount = (
  amount: string,
  bitcoinUnit: 'BTC' | 'SAT'
): number => {
  const cleanAmount = amount.replace(/[^\d.-]/g, '')
  if (bitcoinUnit === 'SAT') {
    return parseInt(cleanAmount, 10)
  } else {
    return Math.round(parseFloat(cleanAmount) * SATOSHIS_PER_BTC)
  }
}

export const formatAmount = (
  amount: number,
  asset_ticker: string,
  assets: NiaAsset[],
  bitcoinUnit: 'BTC' | 'SAT'
): string => {
  const asset = assets.find((a) => a.ticker === asset_ticker) || {
    precision: 8,
  }
  if (asset_ticker === 'BTC') {
    return formatBitcoinAmount(amount, bitcoinUnit, asset.precision)
  } else {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: asset.precision,
      minimumFractionDigits: asset.precision,
      useGrouping: true,
    }).format(amount / Math.pow(10, asset.precision))
  }
}

export const parseAssetAmount = (
  amount: string,
  asset_ticker: string,
  assets: NiaAsset[],
  bitcoinUnit: 'BTC' | 'SAT'
): number => {
  if (asset_ticker === 'BTC') {
    return parseBitcoinAmount(amount, bitcoinUnit)
  } else {
    const asset = assets.find((a) => a.ticker === asset_ticker) || {
      precision: 8,
    }
    const cleanAmount = amount.replace(/[^\d.-]/g, '')
    return Math.round(parseFloat(cleanAmount) * Math.pow(10, asset.precision))
  }
}
