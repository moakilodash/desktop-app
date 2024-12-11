import { ChevronDown, Star } from 'lucide-react'
import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'

import { webSocketService } from '../../app/hubs/websocketService'
import { useAppSelector } from '../../app/store/hooks'
import { nodeSettingsActions } from '../../slices/nodeSettings/nodeSettings.slice'

export const MakerSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const dispatch = useDispatch()
  const nodeSettings = useAppSelector((state) => state.nodeSettings.data)

  const allMakerUrls = [
    nodeSettings.default_maker_url,
    ...(nodeSettings.maker_urls || []).filter(
      (url) => url !== nodeSettings.default_maker_url
    ),
  ].filter(Boolean)

  const handleMakerChange = (url: string) => {
    try {
      // Update node settings with new default maker
      dispatch(
        nodeSettingsActions.setNodeSettings({
          ...nodeSettings,
          default_maker_url: url,
        })
      )

      // Update websocket connection
      webSocketService.updateUrl(url)

      toast.success('Maker changed successfully')
    } catch (error) {
      console.error('Failed to change maker:', error)
      toast.error('Failed to change maker')
    }
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700 hover:bg-gray-700/80 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="text-sm text-gray-300">Current Maker</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-gray-800/95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl z-50">
          <div className="p-2">
            {allMakerUrls.map((url) => (
              <button
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-gray-700/50 transition-colors group"
                key={url}
                onClick={() => handleMakerChange(url)}
                type="button"
              >
                <span className="text-sm text-gray-300 truncate flex-1 text-left">
                  {url}
                </span>
                {url === nodeSettings.default_maker_url && (
                  <Star className="w-4 h-4 text-blue-400 fill-current ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
