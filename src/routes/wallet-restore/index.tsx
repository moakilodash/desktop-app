import { Link } from 'react-router-dom'

import { WALLET_SETUP_PATH } from '../../app/router/paths'

export const Component = () => {
  return (
    <>
      <div>Restore Wallet</div>
      <Link to={WALLET_SETUP_PATH}>Go back</Link>
    </>
  )
}
