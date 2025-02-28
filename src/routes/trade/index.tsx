import { Navigate } from 'react-router-dom'

import { TRADE_MARKET_MAKER_PATH } from '../../app/router/paths'

export const Component = () => {
  // By default, redirect to the market-maker page
  return <Navigate replace to={TRADE_MARKET_MAKER_PATH} />
}
