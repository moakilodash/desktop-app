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
    <div className="py-20 flex flex-col items-center space-y-4">
      <div className="self-start mb-8">
        <button
          className="px-4 py-2 rounded-full border text-sm border-gray-500 hover:bg-gray-700 transition-colors"
          onClick={onBack}
          type="button"
        >
          ← Back
        </button>
      </div>

      <h3 className="text-2xl font-semibold mb-4">
        Secure Your Wallet: Save Your Recovery Phrase
      </h3>
      <p className="text-red-500 text-center">
        Warning: Your recovery phrase is the key to your wallet. Write it down
        and store it in a secure location. Never share it with anyone.
      </p>
      <div className="grid grid-cols-4 gap-4">
        {mnemonic.map((word, i) => (
          <div className="border p-4 text-center bg-gray-600 rounded" key={i}>
            {i + 1}. {word}
          </div>
        ))}
      </div>
      <button
        className="px-6 py-3 mt-4 rounded border font-bold border-cyan"
        onClick={onCopy}
      >
        Copy Recovery Phrase
      </button>
      <div className="flex self-center justify-center mt-8">
        <button
          className="px-6 py-3 mt-7 rounded border font-bold border-cyan"
          onClick={onNext}
        >
          I've Securely Saved My Recovery Phrase
        </button>
      </div>
    </div>
  )
}
