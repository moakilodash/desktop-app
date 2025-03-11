import { openUrl } from '@tauri-apps/plugin-opener'
import { ShieldCheck, ExternalLink } from 'lucide-react'
import React from 'react'

import { Card, Button } from '../../components/ui'

export const IconWrapper = `
  p-4 rounded-xl backdrop-blur-sm bg-opacity-20
  flex items-center justify-center
  transition-all duration-300
`

export const RemoteNodeInfo: React.FC = () => (
  <div className="mb-6 fade-in">
    <Card className="w-full bg-blue-dark/40 border border-cyan/10">
      <div className="flex items-start gap-3 p-4">
        <div className={`${IconWrapper} bg-cyan/10 scale-90 mt-1`}>
          <ShieldCheck className="w-5 h-5 text-cyan" />
        </div>
        <div>
          <h3 className="text-white font-semibold mb-1 text-sm">
            Prerequisites
          </h3>
          <p className="text-gray-300 text-sm mb-3">
            You'll need a running rgb-lightning-node instance to connect. Follow
            our setup guide to get started.
          </p>
          <Button
            className="border-cyan/30 text-cyan hover:bg-cyan/10"
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            onClick={() =>
              openUrl('https://docs.kaleidoswap.com/desktop-app/node-hosting')
            }
            size="sm"
            variant="outline"
          >
            View Setup Guide
          </Button>
        </div>
      </div>
    </Card>
  </div>
)
