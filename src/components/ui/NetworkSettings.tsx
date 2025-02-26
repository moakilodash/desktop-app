import { UseFormReturn } from 'react-hook-form'

import { Input } from './Input'
import { FormField } from './SetupLayout'

interface NetworkSettingsProps {
  form: UseFormReturn<any>
  className?: string
}

/**
 * A reusable component for network configuration settings
 */
export const NetworkSettings = ({
  form,
  className = '',
}: NetworkSettingsProps) => {
  // Helper function to safely convert error messages to strings
  const getErrorMessage = (error: any): string | undefined => {
    return error?.message ? String(error.message) : undefined
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <FormField
        error={getErrorMessage(form.formState.errors.rpc_connection_url)}
        htmlFor="rpc_connection_url"
        label="RPC Connection URL"
      >
        <Input
          id="rpc_connection_url"
          placeholder="Enter RPC connection URL"
          {...form.register('rpc_connection_url', {
            required: 'RPC connection URL is required',
          })}
          error={!!form.formState.errors.rpc_connection_url}
        />
      </FormField>

      <FormField
        error={getErrorMessage(form.formState.errors.indexer_url)}
        htmlFor="indexer_url"
        label="Indexer URL"
      >
        <Input
          id="indexer_url"
          placeholder="Enter indexer URL"
          {...form.register('indexer_url', {
            required: 'Indexer URL is required',
          })}
          error={!!form.formState.errors.indexer_url}
        />
      </FormField>

      <FormField
        error={getErrorMessage(form.formState.errors.proxy_endpoint)}
        htmlFor="proxy_endpoint"
        label="Proxy Endpoint"
      >
        <Input
          id="proxy_endpoint"
          placeholder="Enter proxy endpoint"
          {...form.register('proxy_endpoint', {
            required: 'Proxy endpoint is required',
          })}
          error={!!form.formState.errors.proxy_endpoint}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          error={getErrorMessage(form.formState.errors.daemon_listening_port)}
          htmlFor="daemon_listening_port"
          label="Daemon Listening Port"
        >
          <Input
            id="daemon_listening_port"
            placeholder="Enter daemon port"
            {...form.register('daemon_listening_port', {
              required: 'Daemon port is required',
            })}
            error={!!form.formState.errors.daemon_listening_port}
          />
        </FormField>

        <FormField
          error={getErrorMessage(form.formState.errors.ldk_peer_listening_port)}
          htmlFor="ldk_peer_listening_port"
          label="LDK Peer Listening Port"
        >
          <Input
            id="ldk_peer_listening_port"
            placeholder="Enter LDK peer port"
            {...form.register('ldk_peer_listening_port', {
              required: 'LDK peer port is required',
            })}
            error={!!form.formState.errors.ldk_peer_listening_port}
          />
        </FormField>
      </div>
    </div>
  )
}
