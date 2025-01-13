import { ArrowLeft, Copy, AlertCircle, ArrowRight } from 'lucide-react'

interface MnemonicDisplayProps {
  mnemonic: string[]
  onCopy: () => void
  onNext: () => void
  onBack: () => void
}

export const MnemonicDisplay = ({
  mnemonic,
  onCopy,
  onNext,
  onBack,
}: MnemonicDisplayProps) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-10">
        <button
          className="group px-4 py-2 rounded-xl border border-slate-700 
                     hover:bg-slate-800/50 transition-all duration-200 
                     flex items-center gap-2 text-slate-400 hover:text-white"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>
      </div>

      {/* Header Section */}
      <div className="text-center mb-12">
        <h3
          className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan to-purple 
                       bg-clip-text text-transparent"
        >
          Secure Your Wallet
        </h3>
        <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
          Save your recovery phrase in a secure location. This is the only way
          to recover your wallet if you lose access.
        </p>
      </div>

      {/* Warning Message */}
      <div
        className="mb-8 p-4 bg-red-500/10 border border-red-500/20 
                    rounded-xl flex items-start gap-3 max-w-md mx-auto"
      >
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <p className="text-red-400 text-sm">
          Never share your recovery phrase with anyone. Store it securely
          offline. Anyone with access to this phrase can control your wallet.
        </p>
      </div>

      {/* Recovery Phrase Grid */}
      <div
        className="max-w-md mx-auto bg-slate-900/50 p-8 rounded-2xl 
                    border border-slate-800/50 backdrop-blur-sm"
      >
        <div className="grid grid-cols-3 gap-3">
          {mnemonic.map((word, i) => (
            <div
              className="flex items-center p-3 bg-slate-800/50 rounded-lg 
                       border border-slate-700/50 text-slate-300"
              key={i}
            >
              <span className="text-slate-500 text-sm mr-2">{i + 1}.</span>
              <span className="font-medium">{word}</span>
            </div>
          ))}
        </div>

        {/* Copy Button */}
        <button
          className="w-full mt-6 px-6 py-3 rounded-xl border-2 border-cyan/20 
                   text-cyan hover:bg-cyan/10 transition-all duration-200
                   focus:ring-2 focus:ring-cyan/20 focus:outline-none
                   flex items-center justify-center gap-2"
          onClick={onCopy}
          type="button"
        >
          <Copy className="w-5 h-5" />
          <span>Copy Recovery Phrase</span>
        </button>

        {/* Next Button */}
        <button
          className="w-full mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan to-purple 
                   text-white font-semibold hover:opacity-90 transition-all duration-200
                   focus:ring-2 focus:ring-cyan/20 focus:outline-none
                   flex items-center justify-center gap-2"
          onClick={onNext}
          type="button"
        >
          <span>I've Securely Saved My Recovery Phrase</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
