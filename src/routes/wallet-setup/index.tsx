import {
  Wallet,
  ArrowLeftRight,
  Cloud,
  Server,
  AlertTriangle,
  ArrowRight,
  Zap,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import {
  INIT_PATH,
  WALLET_REMOTE_PATH,
  WALLET_RESTORE_PATH,
} from '../../app/router/paths'
import { RootState } from '../../app/store'
import { Layout } from '../../components/Layout'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface NodeOptionProps {
  title: string
  description: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>
  onClick: () => void
  selected?: boolean
}

const CardBase = `
  relative overflow-hidden transition-all duration-300
  border-2 rounded-2xl backdrop-blur-sm
  hover:shadow-lg hover:shadow-cyan/5 hover:-translate-y-0.5
`

const IconWrapper = `
  p-4 rounded-xl backdrop-blur-sm bg-opacity-20
  flex items-center justify-center
`

const NodeOption: React.FC<NodeOptionProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  selected,
}) => (
  <button
    className={`${CardBase} w-full text-left group
      ${
        selected
          ? 'bg-gradient-to-br from-cyan/10 to-transparent border-cyan'
          : 'bg-blue-dark/40 hover:bg-blue-dark/60 border-divider/20'
      }`}
    onClick={onClick}
  >
    <div className="p-8">
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`${IconWrapper}
          ${selected ? 'bg-cyan/20 text-cyan' : 'bg-cyan/5 text-cyan/80'}`}
        >
          <Icon className="w-8 h-8" />
        </div>
        <h2
          className={`text-2xl font-bold ${selected ? 'text-cyan' : 'text-white'}`}
        >
          {title}
        </h2>
      </div>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  </button>
)

interface WalletActionProps {
  title: string
  description: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>
  onClick: () => void
  primary?: boolean
}

const WalletAction: React.FC<WalletActionProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  primary,
}) => (
  <button
    className={`${CardBase} w-full text-left group
      ${
        primary
          ? 'bg-gradient-to-br from-cyan/10 to-transparent border-cyan/30'
          : 'bg-blue-dark/40 hover:bg-blue-dark/60 border-divider/20'
      }`}
    onClick={onClick}
  >
    <div className="p-8">
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`${IconWrapper}
          ${primary ? 'bg-cyan/20 text-cyan' : 'bg-cyan/5 text-cyan/80'}`}
        >
          <Icon className="w-8 h-8" />
        </div>
        <h2
          className={`text-2xl font-bold ${primary ? 'text-cyan' : 'text-white'}`}
        >
          {title}
        </h2>
      </div>
      <p className="text-gray-400 text-sm leading-relaxed mb-6">
        {description}
      </p>
      <div
        className={`flex items-center gap-2 text-sm font-medium
        ${primary ? 'text-cyan' : 'text-gray-400'}`}
      >
        Get Started
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  </button>
)

const LocalNodeWarning: React.FC = () => (
  <div className={`${CardBase} bg-yellow-600/10 border-yellow-500/20 p-6 mb-8`}>
    <div className="flex items-center gap-3 mb-2">
      <div className={`${IconWrapper} bg-yellow-500/10`}>
        <AlertTriangle className="text-yellow-500 w-5 h-5" />
      </div>
      <span className="text-yellow-500 font-semibold">
        Running a Local Node
      </span>
    </div>
    <p className="text-yellow-500/90 leading-relaxed text-sm">
      Local nodes require 24/7 uptime for optimal performance. For most users,
      we recommend using a remote node instead.
    </p>
  </div>
)

const LocalNodeStatus: React.FC = () => {
  const nodeSettings = useSelector((state: RootState) => state.nodeSettings)
  const nodeInfo = nodeApi.endpoints.nodeInfo.useQueryState()

  if (!nodeInfo.isSuccess) return null

  return (
    <div className={`${CardBase} bg-blue-dark/60 border-divider/20 p-6 mb-8`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`${IconWrapper} bg-cyan/10`}>
          <Server className="w-5 h-5 text-cyan" />
        </div>
        <h3 className="text-white font-semibold">Current Local Node</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 text-gray-300 text-sm">
        <div className="space-y-2">
          <p>Network: {nodeSettings.data.network}</p>
          <p>Data Path: {nodeSettings.data.datapath}</p>
          <p>Account: {nodeSettings.data.name}</p>
        </div>
      </div>
    </div>
  )
}

const RemoteNodeInfo: React.FC = () => (
  <div className="mb-6">
    <div
      className={`${CardBase} bg-blue-dark/40 border-divider/20 p-6 max-w-xl`}
    >
      <div className="flex items-start gap-3">
        <div className={`${IconWrapper} bg-cyan/10 scale-90`}>
          <ShieldCheck className="w-5 h-5 text-cyan" />
        </div>
        <div>
          <h3 className="text-white font-semibold mb-1 text-sm">
            Prerequisites
          </h3>
          <p className="text-gray-300 text-sm">
            You'll need a running rgb-lightning-node instance to connect.
          </p>
          <a
            className="inline-flex items-center gap-1.5 mt-2 text-cyan text-sm 
              hover:text-cyan-400 transition-colors"
            href="https://github.com/RGB-Tools/rgb-lightning-node"
            rel="noopener noreferrer"
            target="_blank"
          >
            View Setup Guide
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  </div>
)

export const Component = () => {
  const navigate = useNavigate()
  const [nodeType, setNodeType] = useState<'local' | 'remote' | null>(null)

  const handleNodeTypeChange = (type: 'local' | 'remote' | null) => {
    setNodeType(type)
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto w-full p-12 min-h-screen">
        <div
          className="bg-blue-darkest/80 backdrop-blur-sm rounded-3xl shadow-xl p-12 
          border border-white/5"
        >
          {!nodeType ? (
            <>
              <div className="text-center mb-12">
                <div
                  className={`${IconWrapper} bg-cyan/10 border border-cyan/20 
                  inline-flex rounded-2xl mb-6`}
                >
                  <Zap className="w-10 h-10 text-cyan" />
                </div>
                <h1 className="text-4xl font-bold mb-3 text-white">
                  Connect to RGB Lightning
                </h1>
                <p className="text-gray-400 text-lg max-w-xl mx-auto">
                  Choose your preferred way to connect
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NodeOption
                  description="Run a node on your computer. Ideal for developers and advanced users."
                  icon={Server}
                  onClick={() => handleNodeTypeChange('local')}
                  title="Local Node"
                />
                <NodeOption
                  description="Connect to an existing node. Best for most users."
                  icon={Cloud}
                  onClick={() => handleNodeTypeChange('remote')}
                  title="Remote Node"
                />
              </div>
            </>
          ) : nodeType === 'local' ? (
            <>
              <button
                className="text-cyan mb-8 flex items-center gap-2 hover:text-cyan-600 
                  transition-colors group"
                onClick={() => handleNodeTypeChange(null)}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Back to node selection
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div
                  className={`${IconWrapper} bg-cyan/10 border border-cyan/20`}
                >
                  <Server className="w-6 h-6 text-cyan" />
                </div>
                <h2 className="text-3xl font-bold text-white">
                  Local Node Setup
                </h2>
              </div>
              <LocalNodeWarning />
              <LocalNodeStatus />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WalletAction
                  description="Create a fresh RGB Lightning wallet with a guided setup process."
                  icon={Wallet}
                  onClick={() => {
                    handleNodeTypeChange(null)
                    navigate(INIT_PATH)
                  }}
                  primary
                  title="New Wallet"
                />
                <WalletAction
                  description="Import an existing wallet using your backup phrase."
                  icon={ArrowLeftRight}
                  onClick={() => {
                    handleNodeTypeChange(null)
                    navigate(WALLET_RESTORE_PATH)
                  }}
                  title="Restore Wallet"
                />
              </div>
            </>
          ) : (
            <>
              <button
                className="text-cyan mb-8 flex items-center gap-2 hover:text-cyan-600 
                  transition-colors group"
                onClick={() => handleNodeTypeChange(null)}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Back to node selection
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div
                  className={`${IconWrapper} bg-cyan/10 border border-cyan/20`}
                >
                  <Cloud className="w-6 h-6 text-cyan" />
                </div>
                <h2 className="text-3xl font-bold text-white">
                  Remote Node Connection
                </h2>
              </div>

              <RemoteNodeInfo />

              <WalletAction
                description="Link to your existing RGB Lightning node securely."
                icon={Cloud}
                onClick={() => {
                  handleNodeTypeChange(null)
                  navigate(WALLET_REMOTE_PATH)
                }}
                primary
                title="Connect Node"
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
