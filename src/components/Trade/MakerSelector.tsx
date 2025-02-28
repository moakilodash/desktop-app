import {
  ChevronDown,
  Star,
  Globe,
  RefreshCw,
  Plus,
  Check,
  ExternalLink,
} from 'lucide-react'
import React, { useState, useMemo, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { twJoin } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

import { webSocketService } from '../../app/hubs/websocketService'
import { useAppSelector } from '../../app/store/hooks'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { nodeSettingsActions } from '../../slices/nodeSettings/nodeSettings.slice'

interface MakerSelectorProps {
  hasNoPairs?: boolean
  onMakerChange: () => Promise<void>
  show?: boolean
}

export const MakerSelector: React.FC<MakerSelectorProps> = ({
  hasNoPairs = false,
  onMakerChange,
  show = true,
}) => {
  const nodeSettings = useAppSelector((state) => state.nodeSettings.data)
  const wsConnected = useAppSelector((state) => state.pairs.wsConnected)
  const [isOpen, setIsOpen] = useState(false)
  const [newMakerUrl, setNewMakerUrl] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()

  useOnClickOutside(dropdownRef, () => setIsOpen(false))

  const allMakerUrls = useMemo(() => {
    const defaultUrl = nodeSettings.default_maker_url
    const additionalUrls = Array.isArray(nodeSettings.maker_urls)
      ? nodeSettings.maker_urls
      : []

    return [defaultUrl, ...additionalUrls]
      .filter(Boolean)
      .filter((url, index, self) => self.indexOf(url) === index)
  }, [nodeSettings.default_maker_url, nodeSettings.maker_urls])

  const handleMakerChange = async (url: string) => {
    try {
      setIsLoading(true)
      webSocketService.close()

      dispatch(
        nodeSettingsActions.setNodeSettings({
          ...nodeSettings,
          default_maker_url: url,
        })
      )

      const clientId = uuidv4()
      const baseUrl = url.endsWith('/') ? url : `${url}/`
      webSocketService.init(baseUrl, clientId, dispatch)

      toast.info('Connecting to new maker...', {
        icon: () => <RefreshCw className="animate-spin h-4 w-4" />,
      })

      if (onMakerChange) {
        await onMakerChange()
      }
    } catch (error) {
      console.error('Failed to change maker:', error)
      toast.error('Failed to change maker')
    } finally {
      setIsOpen(false)
      setIsLoading(false)
    }
  }

  const handleAddNewMaker = () => {
    try {
      if (!newMakerUrl) return

      // Basic URL validation
      let url = newMakerUrl
      if (!url.startsWith('http')) {
        url = `https://${url}`
      }

      // Check if URL is valid
      new URL(url)

      // Add to maker URLs if not already present
      if (!allMakerUrls.includes(url)) {
        const updatedMakerUrls = [...(nodeSettings.maker_urls || []), url]
        dispatch(
          nodeSettingsActions.setNodeSettings({
            ...nodeSettings,
            maker_urls: updatedMakerUrls,
          })
        )

        // Switch to the new maker
        handleMakerChange(url)
      }

      setNewMakerUrl('')
      setIsAddingNew(false)
    } catch (error) {
      toast.error('Invalid URL format')
    }
  }

  const handleRefreshConnection = async () => {
    try {
      setIsLoading(true)
      webSocketService.reconnect()
      toast.info('Reconnecting to maker...', {
        icon: () => <RefreshCw className="animate-spin h-4 w-4" />,
      })

      if (onMakerChange) {
        await onMakerChange()
      }
    } catch (error) {
      console.error('Failed to refresh connection:', error)
      toast.error('Failed to reconnect to maker')
    } finally {
      setIsLoading(false)
    }
  }

  const currentUrl =
    webSocketService.getCurrentUrl() || nodeSettings.default_maker_url

  return (
    show && (
      <div className="relative" ref={dropdownRef}>
        <div className="flex flex-col gap-1 mb-1">
          <label className="text-sm font-medium text-slate-400">
            Market Maker
          </label>
          <div className="flex items-center gap-2">
            <button
              className={twJoin(
                'flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl',
                'transition-all duration-200 min-w-[200px]',
                'border',
                wsConnected
                  ? hasNoPairs
                    ? 'bg-yellow-500/5 border-yellow-500/30 hover:bg-yellow-500/10'
                    : 'bg-slate-800 border-slate-700/50 hover:bg-slate-700'
                  : 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10',
                hasNoPairs ? 'animate-pulse' : '',
                'hover:scale-[1.02] active:scale-[0.98]',
                isLoading ? 'opacity-70 pointer-events-none' : ''
              )}
              disabled={isLoading}
              onClick={() => !isLoading && setIsOpen(!isOpen)}
              type="button"
            >
              <div className="flex items-center gap-3">
                <div
                  className={twJoin(
                    'relative flex items-center gap-3',
                    wsConnected
                      ? hasNoPairs
                        ? 'text-yellow-200'
                        : 'text-emerald-200'
                      : 'text-red-200'
                  )}
                >
                  <div className="relative">
                    <div
                      className={twJoin(
                        'absolute inset-0 blur-md rounded-full',
                        wsConnected
                          ? hasNoPairs
                            ? 'bg-yellow-400/30'
                            : 'bg-emerald-400/30'
                          : 'bg-red-400/30'
                      )}
                    />
                    <div
                      className={twJoin(
                        'relative w-2 h-2 rounded-full',
                        wsConnected
                          ? hasNoPairs
                            ? 'bg-yellow-400'
                            : 'bg-emerald-400'
                          : 'bg-red-400',
                        wsConnected && !hasNoPairs ? 'animate-pulse' : '',
                        !wsConnected
                          ? 'animate-[pulse_1.5s_ease-in-out_infinite]'
                          : ''
                      )}
                    />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[180px]">
                    {currentUrl ? new URL(currentUrl).hostname : 'Select Maker'}
                  </span>
                </div>
              </div>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
              ) : (
                <ChevronDown
                  className={twJoin(
                    'w-4 h-4',
                    hasNoPairs ? 'text-yellow-400' : 'text-slate-400',
                    'transition-transform duration-200',
                    isOpen ? 'rotate-180' : ''
                  )}
                />
              )}
            </button>

            {!wsConnected && !isLoading && (
              <button
                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 
                transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                text-red-200 border border-red-500/30"
                onClick={handleRefreshConnection}
                title="Refresh connection"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {isLoading && (
              <div
                className="p-2.5 rounded-xl bg-slate-800 
              text-slate-400 border border-slate-700/50"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 w-96 bg-slate-800/95 backdrop-blur-sm rounded-xl border-2 border-slate-700/50 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 max-h-[320px] overflow-y-auto custom-scrollbar">
              {allMakerUrls.map((url) => (
                <button
                  className={twJoin(
                    'group flex items-center gap-3 w-full px-4 py-3 rounded-lg',
                    'transition-all duration-200',
                    url === currentUrl
                      ? 'bg-blue-600/20 hover:bg-blue-600/30 border-l-2 border-blue-500'
                      : 'hover:bg-slate-700/50 border-l-2 border-transparent',
                    'hover:scale-[1.01] active:scale-[0.99]'
                  )}
                  key={url}
                  onClick={() => handleMakerChange(url)}
                  type="button"
                >
                  {url === currentUrl ? (
                    <Check className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  )}
                  <div className="flex flex-col flex-1 text-left">
                    <span
                      className={twJoin(
                        'text-sm font-medium truncate transition-colors duration-200',
                        url === currentUrl
                          ? 'text-blue-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    >
                      {new URL(url).hostname}
                    </span>
                    <span className="text-xs text-slate-500 truncate">
                      {url}
                    </span>
                  </div>
                  {url === nodeSettings.default_maker_url && (
                    <Star className="w-4 h-4 text-blue-400 fill-current" />
                  )}
                </button>
              ))}

              {isAddingNew ? (
                <div className="p-3 border-t border-slate-700/50 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      onChange={(e) => setNewMakerUrl(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleAddNewMaker()
                      }
                      placeholder="Enter maker URL"
                      type="text"
                      value={newMakerUrl}
                    />
                    <button
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      onClick={handleAddNewMaker}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-blue-400 hover:text-blue-300 border-t border-slate-700/50 mt-2 transition-colors"
                  onClick={() => setIsAddingNew(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add new maker</span>
                </button>
              )}

              <a
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                href="https://github.com/BitSwap-BiFi/Kaleidoswap/wiki/Makers"
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Learn about makers</span>
              </a>
            </div>
          </div>
        )}
      </div>
    )
  )
}

export const MakerNotConnected: React.FC = () => (
  <div className="max-w-xl w-full bg-slate-800/30 backdrop-blur-sm border-2 border-red-500/20 rounded-xl overflow-hidden">
    <div className="px-6 py-8">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
          <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium text-red-200">Connection Lost</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Unable to connect to the selected maker. Please check if the maker
            is online or try selecting a different maker from above.
          </p>
        </div>

        <button
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-200 rounded-lg transition-colors"
          onClick={() => window.location.reload()}
          type="button"
        >
          Refresh Page
        </button>
      </div>
    </div>
  </div>
)
