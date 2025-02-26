import { Copy, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'

interface MnemonicDisplayProps {
  mnemonic: string[]
  onCopy: () => void
  onNext: () => void
  onBack?: () => void
}

export const MnemonicDisplay = ({
  mnemonic,
  onCopy,
  onNext,
  onBack,
}: MnemonicDisplayProps) => {
  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan">
          <Copy className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold text-white">Recovery Phrase</h2>
      </div>

      <p className="text-slate-400 mb-6 leading-relaxed">
        Save your recovery phrase in a secure location. This is the only way to
        recover your wallet if you lose access.
      </p>

      {/* Warning Message */}
      <div
        className="mb-6 p-3 bg-red-500/10 border border-red-500/20 
                    rounded-lg flex items-start gap-3"
      >
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-red-400 text-xs">
          Never share your recovery phrase with anyone. Store it securely
          offline. Anyone with access to this phrase can control your wallet.
        </p>
      </div>

      {/* Recovery Phrase Grid */}
      <div className="bg-blue-dark/40 p-6 rounded-xl border border-white/5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {mnemonic.map((word, i) => (
            <div
              className="flex items-center p-2.5 bg-slate-800/50 rounded-lg 
                       border border-slate-700/50 text-slate-300"
              key={i}
            >
              <span className="text-slate-500 text-xs mr-2">{i + 1}.</span>
              <span className="font-medium text-sm">{word}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {/* Back Button - Only show if onBack is provided */}
          {onBack && (
            <button
              className="px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                       text-slate-300 hover:bg-slate-700/30 transition-all duration-200
                       focus:ring-2 focus:ring-slate-700/20 focus:outline-none
                       flex items-center justify-center gap-2 text-sm"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            className="px-4 py-2.5 rounded-lg border-2 border-cyan/20 
                     text-cyan hover:bg-cyan/10 transition-all duration-200
                     focus:ring-2 focus:ring-cyan/20 focus:outline-none
                     flex items-center justify-center gap-2 text-sm"
            onClick={onCopy}
            type="button"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Recovery Phrase</span>
          </button>

          {/* Next Button */}
          <button
            className="px-4 py-2.5 rounded-lg bg-cyan text-blue-darkest 
                     font-semibold hover:bg-cyan/90 transition-colors duration-200
                     focus:ring-2 focus:ring-cyan/20 focus:outline-none
                     flex items-center justify-center gap-2 text-sm flex-1"
            onClick={onNext}
            type="button"
          >
            <span>I've Securely Saved My Recovery Phrase</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
