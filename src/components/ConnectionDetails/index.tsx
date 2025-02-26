import { ChevronDown, Server, Globe, Network, Database } from 'lucide-react'
import { useState } from 'react'

import { Button, Card } from '../ui'

interface ConnectionDetailsProps {
  host: string
  port: number
  indexerUrl: string
  proxyEndpoint: string
}

export const ConnectionDetails = ({
  host,
  port,
  indexerUrl,
  proxyEndpoint,
}: ConnectionDetailsProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="mb-6 transition-all duration-300">
      <Button
        className={`w-full flex items-center justify-between px-4 py-3 border-gray-700 ${
          isExpanded
            ? 'rounded-b-none border-b-0 bg-gray-800'
            : 'bg-gray-800/50'
        } text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200`}
        onClick={toggleExpanded}
        type="button"
        variant="outline"
      >
        <span className="flex items-center">
          <Server className="w-4 h-4 mr-2 text-blue-400" />
          <span className="font-medium">Connection Details</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 transform transition-transform duration-300 ${
            isExpanded ? 'rotate-180 text-blue-400' : 'text-gray-500'
          }`}
        />
      </Button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <Card className="rounded-t-none border-t-0 p-0 border-gray-700 bg-gray-800/60">
          <div className="divide-y divide-gray-700/50">
            <ConnectionItem
              icon={<Database className="w-4 h-4 text-blue-400" />}
              label="Node Host"
              value={host}
            />

            <ConnectionItem
              icon={<Network className="w-4 h-4 text-purple-400" />}
              label="Port"
              value={port.toString()}
            />

            <ConnectionItem
              fullWidth
              icon={<Globe className="w-4 h-4 text-green-400" />}
              label="Indexer URL"
              value={indexerUrl}
            />

            <ConnectionItem
              fullWidth
              icon={<Server className="w-4 h-4 text-yellow-400" />}
              label="Proxy Endpoint"
              value={proxyEndpoint}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

interface ConnectionItemProps {
  icon: React.ReactNode
  label: string
  value: string
  fullWidth?: boolean
}

const ConnectionItem = ({
  icon,
  label,
  value,
  fullWidth = false,
}: ConnectionItemProps) => (
  <div className={`p-4 ${fullWidth ? 'col-span-full' : ''}`}>
    <div className="flex items-start">
      <div className="mt-0.5 mr-3">{icon}</div>
      <div>
        <span className="text-xs text-gray-400 block mb-1">{label}</span>
        <span className="text-gray-100 font-medium break-all text-sm">
          {value}
        </span>
      </div>
    </div>
  </div>
)
