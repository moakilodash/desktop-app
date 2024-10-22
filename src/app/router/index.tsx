import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { RootRoute } from '../../routes/root'

import {
  CHANNELS_PATH,
  CREATE_NEW_CHANNEL_PATH,
  ORDER_CHANNEL_PATH,
  INIT_PATH,
  ROOT_PATH,
  SETTINGS_PATH,
  TRADE_PATH,
  WALLET_CONFIG_PATH,
  WALLET_SETUP_PATH,
  WALLET_RESTORE_PATH,
  WALLET_UNLOCK_PATH,
  WALLET_DASHBOARD_PATH,
  WALLET_HISTORY_DEPOSITS_PATH,
  WALLET_HISTORY_PATH,
  WALLET_HISTORY_TRADES_PATH,
  WALLET_HISTORY_WITHDRAWALS_PATH,
  CREATEUTXOS_PATH,
} from './paths'

export const router = createBrowserRouter([
  {
    lazy: () => import('../../routes/wallet-setup'),
    path: WALLET_SETUP_PATH,
  },
  {
    lazy: () => import('../../routes/init'),
    path: INIT_PATH,
  },
  {
    lazy: () => import('../../routes/wallet-config'),
    path: WALLET_CONFIG_PATH,
  },
  {
    lazy: () => import('../../routes/wallet-restore'),
    path: WALLET_RESTORE_PATH,
  },
  {
    lazy: () => import('../../routes/wallet-unlock'),
    path: WALLET_UNLOCK_PATH,
  },
  {
    children: [
      {
        lazy: () => import('../../routes/trade'),
        path: TRADE_PATH,
      },
      {
        lazy: () => import('../../routes/settings'),
        path: SETTINGS_PATH,
      },
      {
        lazy: () => import('../../routes/wallet-dashboard'),
        path: WALLET_DASHBOARD_PATH,
      },
      {
        children: [
          {
            lazy: () => import('../../routes/wallet-history/deposits'),
            path: WALLET_HISTORY_DEPOSITS_PATH,
          },
          {
            lazy: () => import('../../routes/wallet-history/withdrawals'),
            path: WALLET_HISTORY_WITHDRAWALS_PATH,
          },
          {
            lazy: () => import('../../routes/wallet-history/swaps'),
            path: WALLET_HISTORY_TRADES_PATH,
          },
        ],
        lazy: () => import('../../routes/wallet-history'),
        path: WALLET_HISTORY_PATH,
      },
      {
        lazy: () => import('../../routes/create-new-channel'),
        path: CREATE_NEW_CHANNEL_PATH,
      },
      {
        lazy: () => import('../../routes/createutxos'),
        path: CREATEUTXOS_PATH,
      },
      {
        lazy: () => import('../../routes/channels'),
        path: CHANNELS_PATH,
      },
      {
        lazy: () => import('../../routes/order-new-channel'),
        path: ORDER_CHANNEL_PATH,
      },
    ],
    element: <RootRoute />,
    path: ROOT_PATH,
  },
])

export const Router = () => <RouterProvider router={router} />
