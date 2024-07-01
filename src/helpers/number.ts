import Decimal from 'decimal.js'

export const numberFormatter = {
  format: (value: number) => (Math.floor(value / 0.01) * 0.01).toFixed(2),
}

export const satoshiToBTC = (value: number): string =>
  new Decimal(value).mul(0.00000001).toFixed(8)

export const BTCtoSatoshi = (value: number): number => 
  new Decimal(value).mul(100000000).toNumber()
