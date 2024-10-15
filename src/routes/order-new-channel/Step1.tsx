import {
  Globe,
  Link,
  Copy,
  ArrowRight,
  CheckCircle,
  Settings,
  Info,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { makerApi } from '../../slices/makerApi/makerApi.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { selectDefaultLspUrl } from '../../slices/settings/settings.slice'

interface Props {
  onNext: (data: any) => void
}

const ConnectPopup: React.FC<{
  onClose: () => void
  onConfirm: () => void
  connectionUrl: string
  isAlreadyConnected: boolean
}> = ({ onClose, onConfirm, connectionUrl, isAlreadyConnected }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
      <h3 className="text-2xl font-semibold mb-4">Connect to LSP</h3>
      {isAlreadyConnected ? (
        <>
          <div className="mb-6 flex items-center bg-green-800 text-white p-4 rounded-lg">
            <CheckCircle className="text-green-300 mr-3" size={24} />
            <p className="font-medium">
              You are already connected to this LSP.
            </p>
          </div>
        </>
      ) : (
        <p className="mb-6 text-gray-300">
          Do you want to connect to the LSP at this address?
        </p>
      )}
      <p className="mb-6 text-sm bg-gray-700 p-4 rounded-lg break-all">
        {connectionUrl}
      </p>
      <div className="flex justify-end space-x-4">
        {isAlreadyConnected ? (
          <button
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            onClick={onConfirm}
          >
            OK
          </button>
        ) : (
          <>
            <button
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              onClick={onConfirm}
            >
              Connect
            </button>
          </>
        )}
      </div>
    </div>
  </div>
)

export const Step1: React.FC<Props> = ({ onNext }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showConnectPopup, setShowConnectPopup] = useState(false)
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false)
  const [connectionUrl, setConnectionUrl] = useState('')
  const [getInfo] = makerApi.endpoints.get_info.useLazyQuery()
  const [connectPeer] = nodeApi.endpoints.connectPeer.useLazyQuery()
  const [listPeers] = nodeApi.endpoints.listPeers.useLazyQuery()

  const navigate = useNavigate()
  const lspUrl = useSelector(selectDefaultLspUrl)

  useEffect(() => {
    console.log('Fetching LSP Info...')
    if (lspUrl) {
      setIsLoading(true)
      getInfo()
        .then((response) => {
          console.log('LSP Info response:', response)
          if (response.data?.lsp_connection_url) {
            setConnectionUrl(response.data.lsp_connection_url)
            checkPeerConnection(response.data.lsp_connection_url)
          } else {
            toast.error('Failed to get LSP connection URL')
          }
        })
        .catch((error) => {
          console.error('Error fetching LSP info:', error)
          toast.error('Failed to fetch LSP information')
        })
        .finally(() => setIsLoading(false))
    }
  }, [lspUrl, getInfo])

  const checkPeerConnection = async (connectionUrl: string) => {
    try {
      const pubkey = connectionUrl.split('@')[0]
      const peersResponse = await listPeers()
      console.log('Peers response:', peersResponse)
      if (peersResponse.data?.peers) {
        const isConnected = peersResponse.data.peers.some(
          (peer) => peer.pubkey === pubkey
        )
        setIsAlreadyConnected(isConnected)
        console.log('Is already connected:', isConnected)
      }
    } catch (error) {
      console.error('Error checking peer connection:', error)
    }
  }

  const handleNext = () => {
    console.log('Next button clicked')
    if (connectionUrl) {
      setShowConnectPopup(true)
    } else {
      toast.error('Please wait for LSP connection URL to be fetched')
    }
  }

  const handleConnect = async () => {
    setShowConnectPopup(false)
    if (isAlreadyConnected) {
      toast.success('Already connected to LSP')
      onNext({ connectionUrl })
      return
    }
    setIsLoading(true)
    try {
      const response = await connectPeer({ pubkey_and_addr: connectionUrl })
      console.log('Connect peer response:', response)
      toast.success('Successfully connected to LSP')
      onNext({ connectionUrl })
    } catch (error) {
      console.error('Failed to connect to peer:', error)
      toast.error('Failed to connect to LSP')
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToSettings = () => {
    navigate('/settings')
  }

  return (
    <div className="bg-gray-900 text-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Connect to Lightning Service Provider (LSP)
      </h2>
      <div className="bg-blue-900 p-4 rounded-lg mb-8">
        <div className="flex items-start">
          <Info className="text-blue-300 mr-3 mt-1" size={24} />
          <p className="text-blue-100">
            Connecting to an LSP is the first step to request a new channel.{' '}
            <br />
            Based on the requested channel options, after a payment, the LSP
            will open a channel to your node and you will be able to use the
            channel to swap assets.
          </p>
        </div>
      </div>
      <div className="space-y-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block text-lg font-medium mb-2">
            Current LSP URL
          </label>
          <div className="relative">
            <Globe
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              readOnly
              value={lspUrl}
            />
          </div>
          <p className="mt-2 text-sm text-gray-400">
            This is the LSP URL defined in your settings.
          </p>
          <button
            className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center"
            onClick={navigateToSettings}
          >
            <Settings className="mr-2" size={16} />
            Change LSP in Settings
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block text-lg font-medium mb-2">
            LSP Connection URL
          </label>
          <div className="relative">
            <Link
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              className="w-full bg-gray-700 text-white pl-10 pr-12 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              readOnly
              value={connectionUrl}
            />
            <CopyToClipboard
              onCopy={() => toast.success('Connection URL copied to clipboard')}
              text={connectionUrl}
            >
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                type="button"
              >
                <Copy
                  className="text-gray-400 hover:text-white transition-colors"
                  size={20}
                />
              </button>
            </CopyToClipboard>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            This is the unique connection URL for your LSP.
          </p>
        </div>

        <div className="flex justify-center mt-8">
          <button
            className={`
              px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 
              text-white rounded-lg hover:from-green-600 hover:to-green-700 
              transition-all duration-300 ease-in-out transform hover:scale-105
              focus:ring-2 focus:ring-green-500 focus:outline-none 
              flex items-center justify-center space-x-2 text-lg font-semibold
              ${isLoading || !connectionUrl ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
            `}
            disabled={isLoading || !connectionUrl}
            onClick={handleNext}
          >
            {isLoading ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                Connecting...
              </>
            ) : (
              <>
                <span>Connect to LSP</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>

      {showConnectPopup && (
        <ConnectPopup
          connectionUrl={connectionUrl}
          isAlreadyConnected={isAlreadyConnected}
          onClose={() => setShowConnectPopup(false)}
          onConfirm={handleConnect}
        />
      )}
    </div>
  )
}
