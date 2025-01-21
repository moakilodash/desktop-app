import { Users, Plus, Loader, X, Link as LinkIcon, Unlink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'

import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface PeerManagementModalProps {
  onClose: () => void
}

interface ConnectPeerForm {
  peerAddress: string
}

export const PeerManagementModal = ({ onClose }: PeerManagementModalProps) => {
  const [showConnectForm, setShowConnectForm] = useState(false)
  const { register, handleSubmit, reset } = useForm<ConnectPeerForm>()

  const [getPeers, { data: peersData, isLoading }] =
    nodeApi.endpoints.listPeers.useLazyQuery()
  const [connectPeer] = nodeApi.useConnectPeerMutation()
  const [disconnectPeer] = nodeApi.useDisconnectPeerMutation()

  useEffect(() => {
    getPeers()
    const intervalId = setInterval(() => getPeers(), 10000)
    return () => clearInterval(intervalId)
  }, [getPeers])

  const handleConnect = async (data: ConnectPeerForm) => {
    try {
      await connectPeer({
        peer_pubkey_and_addr: data.peerAddress,
      }).unwrap()
      toast.success('Connected to peer successfully')
      setShowConnectForm(false)
      reset()
      getPeers()
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to connect to peer')
    }
  }

  const handleDisconnect = async (pubkey: string) => {
    try {
      await disconnectPeer({
        peer_pubkey: pubkey,
      }).unwrap()
      toast.success('Disconnected from peer')
      getPeers()
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to disconnect from peer')
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 pt-20"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 max-w-2xl w-full m-4 max-h-[calc(100vh-120px)] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Peers</h2>
          </div>
          <button
            className="text-slate-400 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showConnectForm ? (
          <form className="mb-6" onSubmit={handleSubmit(handleConnect)}>
            <div className="flex gap-3">
              <input
                {...register('peerAddress')}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white 
                         placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="pubkey@host:port"
                type="text"
              />
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                         font-medium transition-colors flex items-center gap-2"
                type="submit"
              >
                <LinkIcon className="w-4 h-4" />
                Connect
              </button>
              <button
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 
                         rounded-xl font-medium transition-colors"
                onClick={() => setShowConnectForm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="w-full mb-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                     font-medium transition-colors flex items-center justify-center gap-2"
            onClick={() => setShowConnectForm(true)}
          >
            <Plus className="w-5 h-5" />
            Connect to Peer
          </button>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : peersData?.peers && peersData.peers.length > 0 ? (
          <div className="space-y-3">
            {peersData.peers.map((peer) => (
              <div
                className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 
                         flex items-center justify-between group hover:border-red-500/20 hover:bg-red-500/5"
                key={peer.pubkey}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-300 truncate">
                    {peer.pubkey}
                  </div>
                </div>
                <button
                  className="ml-4 px-3 py-1.5 text-red-400 hover:text-red-300 bg-red-500/10 
                           rounded-lg transition-colors flex items-center gap-2 opacity-60 group-hover:opacity-100"
                  onClick={() => handleDisconnect(peer.pubkey)}
                  title="Disconnect peer"
                >
                  <Unlink className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            No peers connected. Connect to some peers to get started.
          </div>
        )}
      </div>
    </div>
  )
}
