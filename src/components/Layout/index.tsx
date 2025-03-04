import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import Decimal from 'decimal.js'
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Zap,
  Home,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Activity,
  ShoppingCart,
  Bell,
  HelpCircle,
  User,
  Clock,
  MessageCircle,
  Github,
  Store,
  Users,
} from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'

import {
  TRADE_PATH,
  TRADE_MARKET_MAKER_PATH,
  TRADE_MANUAL_PATH,
  TRADE_NOSTR_P2P_PATH,
  WALLET_HISTORY_DEPOSITS_PATH,
  WALLET_HISTORY_PATH,
  WALLET_SETUP_PATH,
  WALLET_RESTORE_PATH,
  WALLET_UNLOCK_PATH,
  WALLET_REMOTE_PATH,
  WALLET_INIT_PATH,
  WALLET_DASHBOARD_PATH,
  SETTINGS_PATH,
  CHANNELS_PATH,
  CREATE_NEW_CHANNEL_PATH,
  ORDER_CHANNEL_PATH,
} from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import logo from '../../assets/logo.svg'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { nodeSettingsActions } from '../../slices/nodeSettings/nodeSettings.slice'
import { uiSliceActions } from '../../slices/ui/ui.slice'
import { LogoutModal, LogoutButton } from '../LogoutModal'
import { ShutdownAnimation } from '../ShutdownAnimation'
import { SupportModal } from '../SupportModal'

import 'react-toastify/dist/ReactToastify.min.css'
import { LayoutModal } from './Modal'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface Props {
  className?: string
  children: React.ReactNode
}

const HIDE_NAVBAR_PATHS = [
  WALLET_SETUP_PATH,
  WALLET_RESTORE_PATH,
  WALLET_UNLOCK_PATH,
  WALLET_REMOTE_PATH,
  WALLET_INIT_PATH,
]

// Define main navigation items with icons
const MAIN_NAV_ITEMS = [
  {
    icon: <Zap className="w-5 h-5" />,
    label: 'Trade',
    matchPath: TRADE_PATH,
    subMenu: [
      {
        icon: <Store className="w-4 h-4" />,
        label: 'Market Maker',
        to: TRADE_MARKET_MAKER_PATH,
      },
      {
        icon: <Zap className="w-4 h-4" />,
        label: 'Manual Swaps',
        to: TRADE_MANUAL_PATH,
      },
      {
        disabled: true,
        icon: <Users className="w-4 h-4" />,
        label: 'Nostr P2P',
        to: TRADE_NOSTR_P2P_PATH,
      },
    ],
    to: TRADE_PATH,
  },
  {
    icon: <Home className="w-5 h-5" />,
    label: 'Dashboard',
    matchPath: WALLET_DASHBOARD_PATH,
    to: WALLET_DASHBOARD_PATH,
  },
  {
    icon: <Clock className="w-5 h-5" />,
    label: 'History',
    matchPath: WALLET_HISTORY_PATH,
    to: WALLET_HISTORY_DEPOSITS_PATH,
  },
  {
    icon: <Activity className="w-5 h-5" />,
    label: 'Channels',
    matchPath: CHANNELS_PATH,
    to: CHANNELS_PATH,
  },
]

// Channel menu items
const CHANNEL_MENU_ITEMS = [
  {
    icon: <Plus className="w-4 h-4" />,
    label: 'Create New Channel',
    to: CREATE_NEW_CHANNEL_PATH,
  },
  {
    icon: <ShoppingCart className="w-4 h-4" />,
    label: 'Buy a Channel',
    to: ORDER_CHANNEL_PATH,
  },
  {
    icon: <Settings className="w-4 h-4" />,
    label: 'Manage Channels',
    to: CHANNELS_PATH,
  },
]

// Transaction menu items
const TRANSACTION_MENU_ITEMS = [
  {
    action: 'deposit',
    icon: (
      <div className="p-1 rounded-full bg-cyan/10 text-cyan">
        <ArrowDownLeft className="w-4 h-4" />
      </div>
    ),
    label: 'Deposit',
  },
  {
    action: 'withdraw',
    icon: (
      <div className="p-1 rounded-full bg-purple/10 text-purple">
        <ArrowUpRight className="w-4 h-4" />
      </div>
    ),
    label: 'Withdraw',
  },
]

// User settings menu items
const USER_MENU_ITEMS = [
  {
    icon: <Settings className="w-4 h-4" />,
    label: 'Settings',
    to: SETTINGS_PATH,
  },
  {
    action: 'support',
    icon: <HelpCircle className="w-4 h-4" />,
    label: 'Help & Support',
  },
]

// Support resources for the Help menu
const SUPPORT_RESOURCES = [
  {
    description: 'Read our comprehensive guides and tutorials',
    icon: <FileText className="w-4 h-4" />,
    name: 'Documentation',
    url: 'https://docs.kaleidoswap.com',
  },
  {
    description: 'Frequently asked questions',
    icon: <HelpCircle className="w-4 h-4" />,
    name: 'FAQ',
    url: 'https://docs.kaleidoswap.com/desktop-app/faq',
  },
  {
    description: 'Join our community for support',
    icon: <MessageCircle className="w-4 h-4" />,
    name: 'Telegram Group',
    url: 'https://t.me/kaleidoswap',
  },
  {
    description: 'Report bugs or request features',
    icon: <Github className="w-4 h-4" />,
    name: 'GitHub Issues',
    url: 'https://github.com/kaleidoswap/desktop-app',
  },
]

// Define types for navigation items
interface NavItem {
  label: string
  icon: React.ReactNode
  to?: string
  matchPath?: string
  action?: string
  url?: string
  subMenu?: {
    icon: React.ReactNode
    label: string
    to?: string
    mode?: string
    disabled?: boolean
  }[]
}

// Define types for modal actions
type ModalActionType = 'deposit' | 'withdraw' | 'none'

// Define types for dropdown menu props
interface DropdownMenuProps {
  menuRef: React.RefObject<HTMLDivElement>
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  title: string
  icon: React.ReactNode
  items: NavItem[]
  onItemClick?: (item: NavItem | string) => void
}

// Define types for NavItem component props
interface NavItemProps {
  item: NavItem & { to: string }
  isCollapsed: boolean
  isActive: boolean
}

// Define types for UserProfile component props
interface UserProfileProps {
  isCollapsed: boolean
  onSupportClick: () => void
  onLogout: () => void
}

// NavItem component for sidebar
const SidebarNavItem = ({ item, isCollapsed }: NavItemProps) => {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Check if this is the Trade section and if we have a trading mode in the URL
  const hasSubMenu = item.subMenu && item.subMenu.length > 0

  const handleClick = (e: React.MouseEvent) => {
    if (hasSubMenu) {
      e.preventDefault()
      setIsSubMenuOpen(!isSubMenuOpen)
    }
  }

  const handleSubMenuClick = (subItem: any) => {
    if (subItem.disabled) return
    if (subItem.to) {
      navigate(subItem.to)
    }
  }

  return (
    <div className="relative">
      <NavLink
        className={({ isActive }) => `
          flex items-center py-3 px-4 rounded-lg transition-all duration-200
          ${
            isActive
              ? 'bg-cyan/10 text-cyan font-medium'
              : 'text-gray-400 hover:text-white hover:bg-blue-darker'
          }
          ${isCollapsed ? 'justify-center' : hasSubMenu ? 'justify-between' : 'justify-start space-x-3'}
        `}
        onClick={handleClick}
        to={item.to}
      >
        <div className={`flex items-center ${!isCollapsed && 'space-x-3'}`}>
          <div>{item.icon}</div>
          {!isCollapsed && <span>{item.label}</span>}
        </div>
        {hasSubMenu && !isCollapsed && (
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-200 ${isSubMenuOpen ? 'rotate-90' : ''}`}
          />
        )}
      </NavLink>

      {hasSubMenu && isSubMenuOpen && !isCollapsed && (
        <div className="pl-4 mt-1 space-y-1">
          {item.subMenu &&
            item.subMenu.map((subItem, index) => (
              <div
                className={`
                flex items-center space-x-3 px-4 py-2 rounded-lg text-sm cursor-pointer
                ${subItem.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-darker hover:text-white'}
                ${location.pathname === subItem.to ? 'bg-cyan/10 text-cyan font-medium' : 'text-gray-400'}
              `}
                key={index}
                onClick={() => handleSubMenuClick(subItem)}
              >
                <div>{subItem.icon}</div>
                <span>{subItem.label}</span>
                {subItem.disabled && (
                  <span className="text-[0.6rem] bg-blue-500/20 text-blue-300 px-0.5 py-px rounded ml-0.5">
                    Soon
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// Dropdown menu component
const DropdownMenu = ({
  menuRef,
  isOpen,
  setIsOpen,
  title,
  icon,
  items,
  onItemClick,
}: DropdownMenuProps) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleItemClick = (item: NavItem) => {
    setIsOpen(false)

    if (item.action) {
      if (item.action === 'support') {
        // Handle support modal action
        if (onItemClick) onItemClick('support')
      } else {
        dispatch(
          uiSliceActions.setModal({
            assetId: undefined,
            type: item.action as ModalActionType,
          })
        )
      }
    } else if (item.to) {
      navigate(item.to)
    }

    if (onItemClick && item.action !== 'support') {
      onItemClick(item)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <div
        className="px-3 py-2 rounded-lg cursor-pointer flex items-center space-x-2 
                  text-gray-300 hover:text-white hover:bg-blue-dark/50 transition-colors duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-cyan">{icon}</div>
        <span className="font-medium">{title}</span>
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </div>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 bg-blue-dark border border-divider/20 
                       rounded-lg shadow-lg shadow-black/30 overflow-hidden z-50 w-56"
        >
          <div className="py-1">
            {items.map((item, index) => (
              <div
                className="px-4 py-3 flex items-center space-x-3 cursor-pointer hover:bg-blue-darker transition-colors"
                key={item.label || index}
                onClick={() => handleItemClick(item)}
              >
                <div className="text-cyan">{item.icon}</div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// User profile component
const UserProfile = ({
  isCollapsed,
  onSupportClick,
  onLogout,
}: UserProfileProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const nodeInfo = nodeApi.endpoints.nodeInfo.useQueryState()
  const accountName = useAppSelector((state) => state.nodeSettings.data.name)

  useOnClickOutside(menuRef, () => setIsOpen(false))

  const handleMenuItemClick = (item: NavItem) => {
    setIsOpen(false)

    if (item.action === 'support') {
      onSupportClick()
    } else if (item.to) {
      navigate(item.to)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <div
        className={`flex items-center p-3 cursor-pointer rounded-lg hover:bg-blue-darker
          ${isCollapsed ? 'justify-center' : 'justify-between space-x-2'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`flex items-center ${!isCollapsed && 'space-x-2'}`}>
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-purple to-cyan/50 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-blue-darker
              ${nodeInfo.isSuccess ? 'bg-green' : 'bg-red'}`}
            ></div>
          </div>

          {!isCollapsed && (
            <>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {accountName || 'My Wallet'}
                </span>
                <span className="text-xs text-gray-400">
                  {nodeInfo.isSuccess ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              />
            </>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1 bg-blue-dark border border-divider/20 
                      rounded-lg shadow-lg shadow-black/30 overflow-hidden z-50 w-56"
        >
          <div className="p-3 border-b border-divider/20">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple to-cyan/50 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {accountName || 'My Wallet'}
                </div>
                <div className="text-xs text-gray-400 flex items-center space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${nodeInfo.isSuccess ? 'bg-green' : 'bg-red'}`}
                  ></div>
                  <span>
                    {nodeInfo.isSuccess ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="py-1">
            {USER_MENU_ITEMS.map((item) => (
              <div
                className="px-4 py-3 flex items-center space-x-3 cursor-pointer hover:bg-blue-darker transition-colors"
                key={item.label}
                onClick={() => handleMenuItemClick(item)}
              >
                <div className="text-cyan">{item.icon}</div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}

            <div className="border-t border-divider/20 mt-1">
              <LogoutButton onClick={onLogout} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const Layout = (props: Props) => {
  const [lastDeposit, setLastDeposit] = useState<number | undefined>(undefined)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isShuttingDown, setIsShuttingDown] = useState(false)
  const [shutdownStatus, setShutdownStatus] = useState<string>('')
  const [isChannelMenuOpen, setIsChannelMenuOpen] = useState(false)
  const [isTransactionMenuOpen, setIsTransactionMenuOpen] = useState(false)
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false)

  const [showSupportModal, setShowSupportModal] = useState(false)

  const channelMenuRef = useRef(null)
  const transactionMenuRef = useRef(null)
  const supportMenuRef = useRef(null)

  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [lock] = nodeApi.endpoints.lock.useLazyQuery()

  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useOnClickOutside(channelMenuRef, () => setIsChannelMenuOpen(false))
  useOnClickOutside(transactionMenuRef, () => setIsTransactionMenuOpen(false))
  useOnClickOutside(supportMenuRef, () => setIsSupportMenuOpen(false))

  const nodeInfo = nodeApi.endpoints.nodeInfo.useQueryState()
  const shouldPoll = nodeInfo.isSuccess

  const { data, isFetching, error } = nodeApi.useListTransactionsQuery(
    { skip_sync: false },
    {
      pollingInterval: 30_000,
      skip: isRetrying || !shouldPoll,
    }
  )

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const lockResponse = await lock().unwrap()
      await invoke('stop_node')

      if (lockResponse !== undefined || lockResponse === null) {
        dispatch(nodeSettingsActions.resetNodeSettings())
        toast.success('Logout successful')
        navigate(WALLET_SETUP_PATH)
      } else {
        throw new Error('Node lock unsuccessful')
      }
    } catch (error) {
      toast.error(
        `Logout failed: ${error instanceof Error ? error.message : ''}. Redirecting anyway.`
      )
      navigate(WALLET_SETUP_PATH)
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  const openExternalLink = (url: string) => {
    window.open(url, '_blank')
  }

  useEffect(() => {
    const checkDeposits = async () => {
      if (!shouldPoll) return
      if (isFetching) return

      if (error && 'status' in error && error.status === 403) {
        setIsRetrying(true)
        await sleep(3000)
        setIsRetrying(false)
        return
      }

      const filteredTransactions =
        data?.transactions
          .filter(
            (tx) =>
              tx.transaction_type === 'User' &&
              new Decimal(tx.received).minus(tx.sent).gt(0)
          )
          .map((tx) => ({
            amount: new Decimal(tx.received).minus(tx.sent).toString(),
            asset: 'BTC',
            confirmation_time: tx.confirmation_time,
            txId: tx.txid,
            type: 'on-chain' as const,
          })) || []

      const highestBlockDeposit =
        filteredTransactions && filteredTransactions.length > 0
          ? filteredTransactions?.reduce((prev, current) =>
              prev?.confirmation_time?.height >
              current?.confirmation_time?.height
                ? prev
                : current
            )
          : undefined

      if (lastDeposit === undefined) {
        if (highestBlockDeposit) {
          setLastDeposit(highestBlockDeposit?.confirmation_time?.height)
        } else {
          setLastDeposit(0)
        }
        return
      }

      if (
        lastDeposit !== undefined &&
        highestBlockDeposit &&
        highestBlockDeposit?.confirmation_time?.height > lastDeposit
      ) {
        toast.info('Deposit received')
        setLastDeposit(highestBlockDeposit?.confirmation_time?.height)
      }
    }

    checkDeposits()
  }, [data, error, shouldPoll, lastDeposit, isFetching])

  useEffect(() => {
    const handleBeforeUnload = () => {
      setIsShuttingDown(true)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Listen for Tauri shutdown events
    const setupShutdownListeners = async () => {
      const unlistenTrigger = await listen<string>(
        'trigger-shutdown',
        (event) => {
          setIsShuttingDown(true)
          setShutdownStatus(event.payload)
        }
      )

      const unlistenStatus = await listen<string>(
        'update-shutdown-status',
        (event) => {
          setShutdownStatus(event.payload)
        }
      )

      return () => {
        unlistenTrigger()
        unlistenStatus()
      }
    }

    const cleanup = setupShutdownListeners()

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      cleanup.then((unsubscribe) => unsubscribe())
    }
  }, [])

  const shouldHideNavbar = HIDE_NAVBAR_PATHS.includes(location.pathname)

  const handleTransactionAction = (type: string) => {
    dispatch(
      uiSliceActions.setModal({
        assetId: undefined,
        type: type as ModalActionType,
      })
    )
  }

  return (
    <div className={props.className}>
      <ShutdownAnimation isVisible={isShuttingDown} status={shutdownStatus} />

      {!shouldHideNavbar ? (
        <div className="min-h-screen flex">
          {/* Sidebar Navigation */}
          <div
            className={`flex flex-col fixed left-0 top-0 h-screen bg-blue-darkest border-r border-divider/10
                      transition-all duration-300 ease-in-out z-30
                      ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
          >
            {/* Logo and collapse button */}
            <div className="flex items-center justify-between py-3 px-4 border-b border-divider/10">
              <img
                alt="KaleidoSwap"
                className={`cursor-pointer transition-all duration-300 ${isSidebarCollapsed ? 'w-10 h-10' : 'h-8'}`}
                onClick={() => navigate(WALLET_SETUP_PATH)}
                src={logo}
              />

              <button
                className="p-2 rounded-lg text-gray-400 hover:text-white 
                         hover:bg-blue-darker transition-colors duration-200"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
              </button>
            </div>

            {/* Main navigation */}
            <div className="flex-1 overflow-y-auto pt-4 px-3">
              <div className={`space-y-1 ${isSidebarCollapsed ? '' : 'mb-8'}`}>
                {MAIN_NAV_ITEMS.map((item) => {
                  const isActive = location.pathname.startsWith(item.to)
                  return (
                    <SidebarNavItem
                      isActive={isActive}
                      isCollapsed={isSidebarCollapsed}
                      item={item}
                      key={item.to}
                    />
                  )
                })}
              </div>

              {/* Quick action buttons */}
              {!isSidebarCollapsed && (
                <>
                  <div className="mb-6">
                    <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className="flex items-center justify-center space-x-2 bg-blue-darker hover:bg-blue-dark
                                 text-white rounded-lg py-2.5 px-3 transition-all duration-200
                                 border border-cyan/10 hover:border-cyan/30 group"
                        onClick={() => handleTransactionAction('deposit')}
                      >
                        <div className="p-1 rounded-full bg-cyan/10 text-cyan group-hover:bg-cyan/20 transition-colors">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm">Deposit</span>
                      </button>
                      <button
                        className="flex items-center justify-center space-x-2 bg-blue-darker hover:bg-blue-dark
                                 text-white rounded-lg py-2.5 px-3 transition-all duration-200
                                 border border-purple/10 hover:border-purple/30 group"
                        onClick={() => handleTransactionAction('withdraw')}
                      >
                        <div className="p-1 rounded-full bg-purple/10 text-purple group-hover:bg-purple/20 transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm">Withdraw</span>
                      </button>
                    </div>
                  </div>

                  {/* Channel management section */}
                  <div className="mb-6">
                    <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Channels
                    </h3>
                    <div className="space-y-1">
                      {CHANNEL_MENU_ITEMS.map((item) => (
                        <NavLink
                          className={({ isActive }) => `
                            flex items-center space-x-3 px-4 py-2 rounded-lg text-sm
                            ${
                              isActive
                                ? 'bg-cyan/10 text-cyan font-medium'
                                : 'text-gray-400 hover:text-white hover:bg-blue-darker'
                            }
                            transition-colors duration-200
                          `}
                          key={item.to}
                          to={item.to}
                        >
                          <div>{item.icon}</div>
                          <span>{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User profile section */}
            <div className="p-3 border-t border-divider/10">
              <UserProfile
                isCollapsed={isSidebarCollapsed}
                onLogout={() => setShowLogoutModal(true)}
                onSupportClick={() => setShowSupportModal(true)}
              />
            </div>
          </div>

          {/* Main content */}
          <main
            className={`flex-1 min-h-screen bg-background transition-all duration-300
                      ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
          >
            {/* Top bar with notifications */}
            <div className="sticky top-0 z-20 bg-blue-darkest/80 backdrop-blur-sm border-b border-divider/10 px-6 py-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  {(() => {
                    // Get the current page icon and title
                    const mainNavItem = MAIN_NAV_ITEMS.find((item) =>
                      location.pathname.startsWith(item.to)
                    )

                    let icon = mainNavItem?.icon
                    let title = ''

                    // Check for channel management pages
                    if (location.pathname === CREATE_NEW_CHANNEL_PATH) {
                      icon = <Plus className="w-5 h-5" />
                      title = 'Create New Channel'
                    } else if (location.pathname === ORDER_CHANNEL_PATH) {
                      icon = <ShoppingCart className="w-5 h-5" />
                      title = 'Buy a Channel'
                    } else if (location.pathname === CHANNELS_PATH) {
                      title = 'Channels'
                    } else if (location.pathname === SETTINGS_PATH) {
                      icon = <Settings className="w-5 h-5" />
                      title = 'Settings'
                    } else {
                      title = mainNavItem?.label || 'Dashboard'
                    }

                    return (
                      <>
                        <div className="text-cyan mr-3">{icon}</div>
                        <h1 className="text-xl font-semibold text-white">
                          {title}
                        </h1>
                      </>
                    )
                  })()}
                </div>

                <div className="flex items-center space-x-4">
                  {/* Support button in header */}
                  <button
                    aria-label="Support"
                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-blue-darker transition-colors"
                    onClick={() => setShowSupportModal(true)}
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>

                  {/* Notifications bell */}
                  <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-blue-darker transition-colors">
                    <Bell className="w-5 h-5" />
                  </button>

                  {/* Quick action dropdown menus - only show on smaller screens */}
                  <div className="md:hidden flex items-center space-x-2">
                    <DropdownMenu
                      icon={<Activity className="w-5 h-5" />}
                      isOpen={isChannelMenuOpen}
                      items={CHANNEL_MENU_ITEMS}
                      menuRef={channelMenuRef}
                      onItemClick={() => {}} // Add empty function to satisfy the type
                      setIsOpen={setIsChannelMenuOpen}
                      title="Channels"
                    />

                    <DropdownMenu
                      icon={<ArrowDownLeft className="w-5 h-5" />}
                      isOpen={isTransactionMenuOpen}
                      items={TRANSACTION_MENU_ITEMS}
                      menuRef={transactionMenuRef}
                      onItemClick={(item: any) =>
                        handleTransactionAction(item.action)
                      }
                      setIsOpen={setIsTransactionMenuOpen}
                      title="Transactions"
                    />

                    {/* Support dropdown for mobile */}
                    <DropdownMenu
                      icon={<HelpCircle className="w-5 h-5" />}
                      isOpen={isSupportMenuOpen}
                      items={[
                        {
                          action: 'support',
                          icon: <HelpCircle className="w-4 h-4" />,
                          label: 'Get Help & Support',
                        },
                        ...SUPPORT_RESOURCES.map((resource) => ({
                          icon: resource.icon,
                          label: resource.name,
                          to: '#', // Placeholder
                          url: resource.url,
                        })),
                      ]}
                      menuRef={supportMenuRef}
                      onItemClick={(item: NavItem | string) => {
                        if (item === 'support') {
                          setShowSupportModal(true)
                        } else if (typeof item !== 'string' && item.url) {
                          openExternalLink(item.url)
                        }
                      }}
                      setIsOpen={setIsSupportMenuOpen}
                      title="Help & Support"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="p-3 h-[calc(100vh-56px)] overflow-auto">
              {props.children}
            </div>
          </main>
        </div>
      ) : (
        // For setup and other paths that hide the navbar
        <div className="min-h-screen">{props.children}</div>
      )}

      {/* Support Modal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      {/* Logout Modal */}
      <LogoutModal
        isLoggingOut={isLoggingOut}
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

      <ToastContainer
        autoClose={5000}
        closeOnClick={false}
        draggable={false}
        hideProgressBar={false}
        newestOnTop={false}
        pauseOnFocusLoss={false}
        pauseOnHover={true}
        position="bottom-right"
        rtl={false}
        theme="dark"
      />

      {/* Add LayoutModal for deposit/withdraw functionality */}
      <LayoutModal />
    </div>
  )
}
