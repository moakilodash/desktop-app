import { UseFormReturn } from 'react-hook-form'

export type SetupStep = 'setup' | 'password' | 'mnemonic' | 'verify'

export interface NodeSetupFields {
  name: string
  network: 'regtest' | 'testnet' | 'mainnet' | 'signet'
  datapath: string
  rpc_connection_url: string
  indexer_url: string
  proxy_endpoint: string
}

export interface PasswordFields {
  password: string
  confirmPassword: string
}

export interface MnemonicVerifyFields {
  mnemonic: string
}

export interface NodeSetupFormProps {
  form: UseFormReturn<NodeSetupFields>
  onSubmit: (data: NodeSetupFields) => Promise<void>
  errors: string[]
}

export interface PasswordSetupFormProps {
  form: UseFormReturn<PasswordFields>
  onSubmit: (data: PasswordFields) => Promise<void>
  isPasswordVisible: boolean
  setIsPasswordVisible: (value: boolean) => void
  errors: string[]
}

export interface MnemonicDisplayProps {
  mnemonic: string[]
  onCopy: () => void
  onNext: () => void
}

export interface MnemonicVerifyFormProps {
  form: UseFormReturn<MnemonicVerifyFields>
  onSubmit: (data: MnemonicVerifyFields) => Promise<void>
  onBack: () => void
  errors: string[]
}
