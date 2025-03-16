// This import is required to extend the i18next module
import 'i18next'

// Define all possible namespaces as a union type
// This helps TypeScript limit type inference depth
type Namespace =
  | 'settings'
  | 'trade'
  | 'channels'
  | 'createNewChannel'
  | 'createUtxos'
  | 'orderNewChannel'
  | 'root'
  | 'walletDashboard'
  | 'walletHistory'
  | 'walletInit'
  | 'walletRemote'
  | 'walletRestore'
  | 'walletSetup'
  | 'walletUnlock'
  | 'components'
  | 'common'
  | 'helpers'

// Component-specific translation types
// Each interface represents the translation structure for a specific component
interface ComponentTranslations {
  AssetSelector: {
    title: string
    selectAsset: string
    searchPlaceholder: string
    noResults: string
  }
  BackupModal: {
    title: string
    description: string
    backupButton: string
    cancelButton: string
    successMessage: string
    errorMessage: string
  }
  ChannelCard: {
    title: string
    status: string
    balance: string
    capacity: string
    actions: {
      close: string
      force_close: string
      withdraw: string
    }
  }
  Layout: {
    navigation: {
      home: string
      wallet: string
      channels: string
      settings: string
    }
    userMenu: {
      profile: string
      logout: string
    }
  }
  LiquidityBar: {
    available: string
    total: string
    locked: string
  }
  Loader: {
    loading: string
    waiting: string
    processing: string
  }
  MnemonicDisplay: {
    title: string
    description: string
    warning: string
    copyButton: string
    copied: string
  }
  MnemonicVerifyForm: {
    title: string
    description: string
    placeholder: string
    error: string
    success: string
  }
  Modal: {
    close: string
    confirm: string
    cancel: string
  }
  PasswordSetupForm: {
    title: string
    description: string
    passwordLabel: string
    confirmLabel: string
    requirements: string
    error: string
    success: string
  }
  Select: {
    placeholder: string
    noOptions: string
    loading: string
  }
  Spinner: {
    loading: string
  }
  StatusToast: {
    success: string
    error: string
    warning: string
    info: string
  }
  SuccessCheckmark: {
    success: string
  }
  SwapConfirmation: {
    title: string
    details: {
      amount: string
      fee: string
      total: string
    }
    buttons: {
      confirm: string
      cancel: string
    }
  }
  SwapRecap: {
    title: string
    summary: {
      from: string
      to: string
      rate: string
      fee: string
    }
  }
  Toolbar: {
    search: string
    filter: string
    sort: string
    refresh: string
  }
  Trade: {
    buy: string
    sell: string
    amount: string
    price: string
    total: string
  }
  UnlockProgress: {
    title: string
    step: string
    complete: string
  }
}

// Route-specific translation types
// Each interface defines the translation structure for a specific route
interface ChannelsTranslations {
  dashboard: {
    title: string
    refresh: {
      button: string
      loading: string
    }
  }
  metrics: {
    totalBalance: {
      title: string
      value: string
    }
    inboundLiquidity: {
      title: string
      value: string
    }
    outboundLiquidity: {
      title: string
      value: string
    }
  }
  channels: {
    empty: string
    info: string
  }
}

interface CreateNewChannelTranslations {
  loading: {
    checkingBalance: string
  }
  error: {
    tryAgainLater: string
    insufficientBalance: string
    depositRequired: string
  }
  navigation: {
    goToDashboard: string
  }
  formError: {
    defaultMessage: string
    checkForm: string
    fieldPrefix: string
  }
  steps: {
    common: {
      back: string
      next: string
      confirm: string
    }
    step1: {
      title: string
      subtitle: string
      nodeInfo: {
        title: string
        loadingLsp: string
        pubkeyLabel: string
        pubkeyExample: string
        pubkeyHelp: string
        or: string
      }
      connectDialog: {
        title: string
        message: string
        connecting: string
        cancel: string
        connect: string
      }
    }
    step2: {
      title: string
      subtitle: string
      channelWith: string
      capacity: {
        label: string
        help: string
        max: string
        enterAmount: string
      }
      assets: {
        title: string
        addAsset: string
        selectAsset: string
        amount: string
        enterAmount: string
        noAssets: string
      }
      fee: {
        label: string
        rate: string
      }
    }
    step3: {
      title: string
      subtitle: string
      capacity: {
        label: string
      }
      node: {
        title: string
        id: string
        host: string
        copyPubkey: string
      }
      fee: {
        title: string
        selectedRate: string
        feeRate: string
        loading: string
      }
    }
    step4: {
      success: {
        title: string
        message: string
        button: string
      }
      error: {
        title: string
        tryAgain: string
        goToTrade: string
      }
    }
  }
}

interface CreateUtxosTranslations extends GenericRouteTranslations {
  title: string
  description: {
    line1: string
    line2: string
  }
  form: {
    numberOfUtxos: {
      label: string
      placeholder: string
    }
    utxoSize: {
      label: string
      placeholder: string
      satoshis: string
    }
    feeRate: {
      label: string
      options: {
        slow: string
        normal: string
        fast: string
        custom: string
      }
    }
  }
  balance: {
    available: string
  }
  buttons: {
    back: string
    create: string
    creating: string
  }
  notifications: {
    success: string
    error: string
  }
}

interface OrderNewChannelTranslations extends GenericRouteTranslations {
  // Form Error translations
  form: {
    error: string
    defaultMessage: string
    checkForm: string
    fieldPrefix: string
  }

  // Common elements across steps
  common: {
    back: string
    next: string
    loading: string
    checkingBalance: string
    errors: {
      tryAgainLater: string
      insufficientBalance: string
      depositRequired: string
    }
    navigation: {
      goToDashboard: string
      returnToTrade: string
    }
  }

  // Step 1 - LSP Connection
  step1: {
    title: string
    subtitle: string
    howItWorks: {
      title: string
      description: string
      steps: {
        connect: string
        configure: string
        payment: string
      }
    }
    lspUrl: {
      label: string
      placeholder: string
      description: string
      useDefault: string
    }
    connectionString: {
      label: string
      placeholder: string
      description: string
      copySuccess: string
    }
    connect: {
      button: string
      loading: string
      connected: string
      waitingForUrl: string
      continueWithConnected: string
    }
    errors: {
      connectionFailed: string
      invalidUrl: string
      noLspInfo: string
      fetchError: string
    }
    dialog: {
      title: string
      message: string
      cancel: string
      confirm: string
      alreadyConnected: {
        title: string
        message: string
        confirm: string
      }
    }
  }

  // Step 2 - Channel Configuration
  step2: {
    title: string
    subtitle: string
    channelCapacity: {
      label: string
      placeholder: string
      description: string
      available: string
      total: string
    }
    yourLiquidity: {
      label: string
      placeholder: string
      description: string
    }
    lockDuration: {
      label: string
      tooltip: string
      options: {
        week: string
        month: string
        sixMonths: string
      }
    }
    asset: {
      label: string
      addAsset: string
      selectAsset: string
      amount: {
        label: string
        placeholder: string
      }
      noAssets: string
    }
    validation: {
      insufficientCapacity: string
      invalidAmount: string
      maxCapacity: string
      minCapacity: string
      requiredField: string
    }
  }

  // Step 3 - Payment
  step3: {
    title: string
    subtitle: string
    orderSummary: {
      title: string
      orderId: {
        label: string
        copy: string
        copied: string
      }
      capacity: {
        title: string
        yourBalance: string
        lspBalance: string
        total: string
      }
      asset: {
        title: string
        name: string
        yourBalance: string
        lspBalance: string
        total: string
        details: string
      }
      costs: {
        title: string
        channelAmount: string
        serviceFee: string
        total: string
      }
      duration: {
        label: string
        blocks: string
        timeEstimate: string
      }
      expiry: {
        label: string
        datetime: string
      }
    }
    payment: {
      title: string
      methods: {
        lightning: string
        onchain: string
      }
      wallet: {
        title: string
        useWallet: string
        available: string
        loading: string
        insufficient: {
          title: string
          message: {
            lightning: string
            onchain: string
          }
          required: string
          available: string
        }
        confirmation: {
          title: string
          message: string
          processing: string
          cancel: string
          confirm: string
        }
      }
      fees: {
        title: string
        slow: string
        normal: string
        fast: string
        custom: string
        rate: string
        customPlaceholder: string
      }
      external: {
        title: string
        copyInvoice: string
        copyAddress: string
        amountToPay: string
        copied: string
      }
    }
  }

  // Step 4 - Final Status
  step4: {
    success: {
      title: string
      message: string
      progress: string
      button: string
    }
    failure: {
      title: string
      message: string
      button: string
      returnToTrade: string
    }
  }
}

interface RootTranslations extends GenericRouteTranslations {
  loadingTitle: string
  loadingDescription: string
  errorTitle: string
  errorNoWalletDescription: string
  errorNodeConnectionDescription: string
  errorReturnButton: string
  errorDetailsPrefix: string
}

interface SettingsTranslations {
  // Basic page settings
  title: string
  subtitle: string

  // Application settings section
  applicationSettings: string
  generalSettings: string
  language: string
  bitcoinUnit: string

  // Action buttons at the form level
  resetChanges: string
  saveSettings: string

  // Maker settings section
  maker: {
    title: string
    url: string
    additionalURLs: string
    addURL: string
  }

  // Node connection settings section - New addition
  nodeConnection: {
    title: string
    restartRequired: string
    connectionString: string
    rpcUrl: string
    indexerUrl: string
    proxyEndpoint: string
  }

  // Node status section - Updated with status field
  nodeStatus: {
    title: string
    status: string // Added to match the {{status}} interpolation
    online: string
    offline: string
    connectionType: string
    localNode: string
    remoteNode: string
  }

  // Backup section
  backup: {
    title: string
    description: string
  }

  // Logout modal section
  logout: {
    confirmTitle: string
    confirmMessage: string
    cancel: string
    confirm: string
  }

  // Shutdown modal section
  shutdown: {
    confirmTitle: string
    shuttingDownNode: string
    confirmMessage: string
    inProgress: string
    cancel: string
    confirm: string
    shutdown: string
  }

  // Logs section
  logs: {
    title: string
    show: string
    entries: string
    actions: {
      export: {
        title: string
        disabled: string
      }
      refresh: {
        title: string
      }
      clear: {
        title: string
        disabled: string
      }
    }
    display: {
      liveTitle: string
      showing: string
      noLogs: string
    }
  }

  // Modals section
  modals: {
    settingsSaved: {
      title: string
      message: string
    }
  }
}

interface TradeTranslations {
  title: string
  subtitle: string
  form: {
    amount: string
    asset: string
    price: string
    total: string
    submit: string
  }
  orderBook: {
    title: string
    price: string
    amount: string
    total: string
  }
  history: {
    title: string
    date: string
    type: string
    amount: string
    price: string
    status: string
  }
}

// Common translations used across multiple components
interface CommonTranslations {
  errors: {
    networkError: string
    connectionError: string
    validationError: string
    unknownError: string
  }
  buttons: {
    submit: string
    cancel: string
    confirm: string
    back: string
    next: string
    close: string
  }
  notifications: {
    success: string
    error: string
    warning: string
    info: string
  }
  validation: {
    required: string
    minLength: string
    maxLength: string
    pattern: string
    email: string
    url: string
  }
}

// Helper translations for utility functions and formatting
interface HelperTranslations {
  dates: {
    today: string
    yesterday: string
    tomorrow: string
    formats: {
      short: string
      medium: string
      long: string
    }
  }
  numbers: {
    decimal: string
    thousand: string
    precision: string
  }
  units: {
    bitcoin: {
      btc: string
      sat: string
    }
    time: {
      second: string
      minute: string
      hour: string
      day: string
    }
  }
}

// Generic route translation type for routes without specific translation requirements
interface GenericRouteTranslations {
  title: string
  subtitle?: string
  [key: string]: string | object | undefined
}

// Map connecting each namespace to its corresponding type
type NamespaceTypeMap = {
  settings: SettingsTranslations
  trade: TradeTranslations
  channels: GenericRouteTranslations
  createNewChannel: GenericRouteTranslations
  createUtxos: GenericRouteTranslations
  orderNewChannel: OrderNewChannelTranslations
  root: RootTranslations
  walletDashboard: GenericRouteTranslations
  walletHistory: GenericRouteTranslations
  walletInit: GenericRouteTranslations
  walletRemote: GenericRouteTranslations
  walletRestore: GenericRouteTranslations
  walletSetup: GenericRouteTranslations
  walletUnlock: GenericRouteTranslations
  components: ComponentTranslations
  common: CommonTranslations
  helpers: HelperTranslations
}

// Extend i18next module with our custom types
declare module 'i18next' {
  interface CustomTypeOptions {
    // Default namespace for the application
    defaultNS: 'settings'

    // Resource definitions for each supported language
    resources: {
      en: NamespaceTypeMap
      it: NamespaceTypeMap
    }

    // Additional options to improve type safety
    returnNull: false
    allowObjectInHTMLChildren: false
  }
}

// Export useful types for use in other files
export type TranslationNamespace = keyof NamespaceTypeMap
export type TranslationType<N extends TranslationNamespace> =
  NamespaceTypeMap[N]
