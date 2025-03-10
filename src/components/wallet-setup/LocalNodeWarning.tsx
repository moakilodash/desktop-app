import { openUrl } from '@tauri-apps/plugin-opener'
import { AlertTriangle, Info } from 'lucide-react'
import React from 'react'

import { Alert, Button } from '../../components/ui'

export const LocalNodeWarning: React.FC = () => (
  <div className="mb-8 fade-in">
    <Alert
      className="mb-8"
      icon={<AlertTriangle className="w-5 h-5" />}
      title="Running a Local Node"
      variant="warning"
    >
      <p className="leading-relaxed text-sm">
        Local nodes require 24/7 uptime for optimal performance. For most users,
        we recommend using a remote node instead.
        <Button
          className="ml-2 text-cyan underline"
          icon={<Info className="w-3.5 h-3.5" />}
          onClick={() =>
            openUrl(
              'https://github.com/RGB-Tools/rgb-lightning-node/wiki/Node-Hosting',
              '_blank'
            )
          }
          size="sm"
          variant="link"
        >
          Learn more
        </Button>
      </p>
    </Alert>
  </div>
)
