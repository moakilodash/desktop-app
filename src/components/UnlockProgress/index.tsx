import {
  ArrowLeft,
  XCircle,
  Shield,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useState, useEffect } from 'react'

import { Button } from '../ui'

interface UnlockingProgressProps {
  isUnlocking: boolean
  onBack?: () => void
  onCancel?: () => void
  hasError?: boolean
  errorMessage?: string
}

export const UnlockingProgress = ({
  isUnlocking,
  onBack,
  onCancel,
  hasError = false,
  errorMessage,
}: UnlockingProgressProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const steps = [
    { icon: Shield, title: 'Decrypting wallet' },
    { icon: Shield, title: 'Synchronizing Bitcoin blockchain' },
    { icon: Shield, title: 'Connecting to RGB proxy' },
    { icon: Shield, title: 'Connecting to Lightning' },
  ]

  // Simulate step progression for the demo
  useEffect(() => {
    if (!isUnlocking || hasError) return

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          setCompletedSteps((completed) => [...completed, prev])
          return prev + 1
        }
        clearInterval(interval)
        return prev
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [isUnlocking, hasError, steps.length])

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Animated Progress Ring with Gradient */}
        <div className="relative w-32 h-32 mb-8">
          {/* Outer static ring */}
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />

          {/* Spinning gradient ring - different animation if there's an error */}
          {hasError ? (
            <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-pulse" />
          ) : (
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-cyan-500 animate-[spin_3s_linear_infinite]" />
          )}

          {/* Inner pulsing circle */}
          <div className="absolute inset-0 m-auto w-16 h-16">
            {hasError ? (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center animate-pulse">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Status Text and Steps */}
        <div className="text-center space-y-6 w-full">
          <h3 className="text-2xl font-medium text-white">
            {hasError
              ? 'Error unlocking wallet'
              : isUnlocking
                ? 'Unlocking wallet...'
                : 'Verifying recovery phrase...'}
          </h3>

          {hasError && errorMessage && (
            <div className="p-4 rounded-lg bg-red-900/30 border border-red-500/20 text-red-300 text-sm animate-[fadeIn_0.5s_ease-out] max-w-2xl mx-auto">
              <p>{errorMessage}</p>
            </div>
          )}

          {isUnlocking && !hasError && (
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out] max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {steps.map((step, index) => {
                  const isActive = currentStep === index
                  const isCompleted = completedSteps.includes(index)
                  const StepIcon = step.icon

                  return (
                    <div
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-950/50 to-cyan-800/20 border-cyan-500/30 shadow-md shadow-cyan-500/10'
                          : isCompleted
                            ? 'bg-gradient-to-r from-green-950/30 to-green-900/10 border-green-500/20'
                            : 'bg-gradient-to-r from-transparent to-cyan-500/5 border-cyan-500/10'
                      } backdrop-blur-sm animate-[slideInRight_0.5s_ease-out]`}
                      key={step.title}
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      {/* Progress indicator */}
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full ${
                          isActive
                            ? 'bg-cyan-400 animate-[pulse_2s_infinite]'
                            : isCompleted
                              ? 'bg-green-500'
                              : 'bg-gray-700'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <StepIcon className="w-3 h-3 text-white" />
                        )}
                      </div>

                      {/* Step title */}
                      <span
                        className={`text-sm font-medium ${
                          isActive
                            ? 'text-cyan-100'
                            : isCompleted
                              ? 'text-green-300'
                              : 'text-gray-400'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  )
                })}
              </div>

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

          {(onBack || onCancel) && (
            <div
              className="mt-8 flex justify-center gap-4 animate-[fadeIn_0.5s_ease-out]"
              style={{ animationDelay: '800ms' }}
            >
              {onBack && (
                <Button
                  className="border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-colors"
                  onClick={onBack}
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Setup
                </Button>
              )}

              {onCancel && (
                <Button
                  className="bg-red-600/80 hover:bg-red-500 transition-colors"
                  onClick={onCancel}
                  variant="danger"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
