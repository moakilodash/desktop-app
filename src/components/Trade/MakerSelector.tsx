import { ChevronDown, Star, Globe, RefreshCw } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'

import { webSocketService } from '../../app/hubs/websocketService'
import { useAppSelector } from '../../app/store/hooks'
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
  const dispatch = useDispatch()

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
        icon: () => <span>🔄</span>,
      })

      if (onMakerChange) {
        await onMakerChange()
      }
    } catch (error) {
      console.error('Failed to change maker:', error)
      toast.error('Failed to change maker')
    } finally {
      setIsOpen(false)
    }
  }

  const handleRefreshConnection = async () => {
    try {
      webSocketService.reconnect()
      toast.info('Reconnecting to maker...', {
        icon: () => <span>🔄</span>,
      })

      if (onMakerChange) {
        await onMakerChange()
      }
    } catch (error) {
      console.error('Failed to refresh connection:', error)
      toast.error('Failed to reconnect to maker')
    }
  }

  const currentUrl =
    webSocketService.getCurrentUrl() || nodeSettings.default_maker_url

  return (
    show && (
      <div className="relative">
        <div className="flex items-center gap-2">
          <button
            className={`
            flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl
            transition-all duration-200 min-w-[200px]
            ${
              wsConnected
                ? hasNoPairs
                  ? 'bg-yellow-500/10 hover:bg-yellow-500/20 shadow-lg shadow-yellow-900/10'
                  : 'bg-gray-800/80 hover:bg-gray-700/80 shadow-lg shadow-gray-900/20'
                : 'bg-red-500/10 hover:bg-red-500/20 shadow-lg shadow-red-900/10'
            }
            ${hasNoPairs ? 'animate-pulse' : ''}
            hover:scale-[1.02] active:scale-[0.98]
          `}
            onClick={() => setIsOpen(!isOpen)}
            type="button"
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                relative flex items-center gap-3
                ${
                  wsConnected
                    ? hasNoPairs
                      ? 'text-yellow-200'
                      : 'text-emerald-200'
                    : 'text-red-200'
                }
              `}
              >
                <div className="relative">
                  <div
                    className={`
                    absolute inset-0 blur-md rounded-full
                    ${
                      wsConnected
                        ? hasNoPairs
                          ? 'bg-yellow-400/30'
                          : 'bg-emerald-400/30'
                        : 'bg-red-400/30'
                    }
                  `}
                  />
                  <div
                    className={`
                    relative w-2 h-2 rounded-full 
                    ${
                      wsConnected
                        ? hasNoPairs
                          ? 'bg-yellow-400'
                          : 'bg-emerald-400 animate-pulse'
                        : 'bg-red-400 animate-[pulse_1.5s_ease-in-out_infinite]'
                    }
                  `}
                  />
                </div>
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {currentUrl ? new URL(currentUrl).hostname : 'Select Maker'}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`
              w-4 h-4 
              ${hasNoPairs ? 'text-yellow-400' : 'text-gray-400'}
              transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
            `}
            />
          </button>

          {!wsConnected && (
            <button
              className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              text-red-200 shadow-lg shadow-red-900/10"
              onClick={handleRefreshConnection}
              title="Refresh connection"
              type="button"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {isOpen && allMakerUrls.length > 0 && (
          <div className="absolute top-full mt-2 right-0 w-96 bg-gray-800/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 max-h-[320px] overflow-y-auto custom-scrollbar">
              {allMakerUrls.map((url) => (
                <button
                  className={`
                  group flex items-center gap-3 w-full px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${
                    url === currentUrl
                      ? 'bg-gray-700/30 hover:bg-gray-700/40'
                      : 'hover:bg-gray-700/50'
                  }
                  hover:scale-[1.01] active:scale-[0.99]
                `}
                  key={url}
                  onClick={() => handleMakerChange(url)}
                  type="button"
                >
                  <Globe
                    className={`
                  w-4 h-4 transition-colors duration-200
                  ${
                    url === currentUrl
                      ? 'text-cyan'
                      : 'text-gray-500 group-hover:text-gray-300'
                  }
                `}
                  />
                  <div className="flex flex-col flex-1 text-left">
                    <span
                      className={`
                    text-sm font-medium truncate transition-colors duration-200
                    ${url === currentUrl ? 'text-cyan' : 'text-gray-400 group-hover:text-gray-200'}
                  `}
                    >
                      {new URL(url).hostname}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {url}
                    </span>
                  </div>
                  {url === nodeSettings.default_maker_url && (
                    <Star className="w-4 h-4 text-cyan fill-current" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  )
}

export const MakerNotConnected: React.FC = () => (
  <div className="max-w-xl w-full bg-gray-800/30 backdrop-blur-sm border border-red-500/20 rounded-xl overflow-hidden">
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
          <p className="text-sm text-gray-400 max-w-md">
            Unable to connect to the selected maker. Please check if the maker
            is online or try selecting a different maker from above.
          </p>
        </div>

        <button
          className="px-4 py-2 text-sm font-medium text-red-200 bg-red-500/10 rounded-lg
            hover:bg-red-500/20 transition-colors duration-200"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
      </div>
    </div>
  </div>
)
