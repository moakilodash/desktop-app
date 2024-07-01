const MAX_ADDRESS_LENGTH = 41
const ADDRESS_SLICE_LENGTH = (MAX_ADDRESS_LENGTH - 3) / 2

export const shortenAddress = (address: string) => {
  if (address.length <= MAX_ADDRESS_LENGTH) {
    return address
  }

  return `${address.slice(0, ADDRESS_SLICE_LENGTH)}...${address.slice(
    -ADDRESS_SLICE_LENGTH
  )}`
}
