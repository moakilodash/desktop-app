interface UnlockingProgressProps {
  isUnlocking: boolean
}

export const UnlockingProgress = ({ isUnlocking }: UnlockingProgressProps) => {
  const steps = [
    { title: 'Decrypting wallet' },
    { title: 'Connecting to Bitcoin network' },
    { title: 'Connecting to RGB proxy' },
    { title: 'Connecting to Lightning' },
  ]

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Animated Progress Ring with Gradient */}
        <div className="relative w-32 h-32 mb-8">
          {/* Outer static ring */}
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />

          {/* Spinning gradient ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-cyan-500 animate-[spin_3s_linear_infinite]" />

          {/* Inner pulsing circle */}
          <div className="absolute inset-0 m-auto w-16 h-16">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-lg shadow-cyan-500/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Status Text and Steps */}
        <div className="text-center space-y-6 w-full">
          <h3 className="text-2xl font-medium text-white">
            {isUnlocking
              ? 'Unlocking wallet...'
              : 'Verifying recovery phrase...'}
          </h3>

          {isUnlocking && (
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
              {steps.map((step, index) => (
                <div
                  className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-transparent to-cyan-500/5 backdrop-blur-sm border border-cyan-500/10 animate-[slideInRight_0.5s_ease-out]"
                  key={step.title}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Progress indicator */}
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-[pulse_2s_infinite]" />

                  {/* Step title */}
                  <span className="text-sm text-gray-200 font-medium">
                    {step.title}
                  </span>
                </div>
              ))}

              {/* Note card */}
              <div
                className="mt-6 p-4 rounded-lg bg-blue-900/30 border border-cyan-500/10 text-sm text-gray-400 animate-[fadeIn_0.5s_ease-out]"
                style={{ animationDelay: '600ms' }}
              >
                <p>
                  Please keep the application open while we complete the setup.
                </p>
                <p className="mt-2">
                  Note: If your node has been offline for some time,
                  synchronization may take a few minutes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
