import { ArrowLeft, AlertCircle, Check, Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import { SubmitHandler, UseFormReturn } from 'react-hook-form'
import { toast } from 'react-toastify'

export interface MnemonicVerifyFields {
  mnemonic: string
}

interface MnemonicVerifyFormProps {
  form: UseFormReturn<MnemonicVerifyFields>
  onSubmit: SubmitHandler<MnemonicVerifyFields>
  onBack: () => void
  errors: string[]
}

export const MnemonicVerifyForm = ({
  form,
  onSubmit,
  onBack,
  errors,
}: MnemonicVerifyFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Wrap the onSubmit handler to manage loading state
  const handleSubmit: SubmitHandler<MnemonicVerifyFields> = async (data) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function to split and display words
  const displayWords = (text: string) => {
    return text
      .trim()
      .split(/\s+/)
      .map((word, index) => (
        <span
          className="inline-block bg-slate-800/50 text-slate-300 px-3 py-1.5 
                   rounded-lg border border-slate-700/50 text-sm font-medium m-1
                   transition-colors hover:border-slate-600"
          key={index}
        >
          {word}
        </span>
      ))
  }

  React.useEffect(() => {
    errors.forEach((error) => {
      toast.error(error, {
        autoClose: 5000,
        closeOnClick: true,
        draggable: true,
        hideProgressBar: false,
        pauseOnHover: true,
        position: 'top-right',
      })
    })
  }, [errors])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-10">
        <button
          className="group px-4 py-2 rounded-xl border border-slate-700 
                     hover:bg-slate-800/50 transition-all duration-200 
                     flex items-center gap-2 text-slate-400 hover:text-white"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Recovery Phrase
        </button>
      </div>

      {/* Header Section */}
      <div className="text-center mb-12">
        <h3
          className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan to-purple 
                       bg-clip-text text-transparent"
        >
          Verify Your Recovery Phrase
        </h3>
        <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
          For your security, please enter your recovery phrase to confirm you've
          saved it correctly. This step cannot be skipped.
        </p>
      </div>

      {/* Form Section */}
      <form
        className="max-w-md mx-auto bg-slate-900/50 p-8 rounded-2xl 
                   border border-slate-800/50 backdrop-blur-sm"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium text-slate-300 mb-2"
              htmlFor="mnemonic"
            >
              Recovery Phrase
            </label>
            <div className="relative">
              <textarea
                className="w-full min-h-[120px] rounded-xl border-2 border-slate-700/50 
                          focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                          bg-slate-800/30 px-4 py-3 outline-none transition-all
                          text-slate-300 font-mono text-base placeholder:text-slate-600"
                id="mnemonic"
                placeholder="Enter your recovery phrase..."
                {...form.register('mnemonic', {
                  required: 'Recovery phrase is required',
                })}
              />

              {/* Word Display */}
              <div className="mt-3 min-h-[40px]">
                {form.watch('mnemonic') && (
                  <div className="flex flex-wrap gap-1">
                    {displayWords(form.watch('mnemonic'))}
                  </div>
                )}
              </div>

              {/* Word Counter */}
              <div
                className="absolute bottom-2 right-2 px-2 py-1 rounded-md 
                            bg-slate-800/80 text-xs text-slate-400"
              >
                {form.watch('mnemonic')?.split(/\s+/).filter(Boolean).length ||
                  0}{' '}
                words
              </div>
            </div>

            {/* Error Display */}
            {(form.formState.errors.mnemonic || errors.length > 0) && (
              <div
                className="mt-4 p-4 bg-red-500/10 border border-red-500/20 
                            rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  {form.formState.errors.mnemonic && (
                    <p className="text-red-400 text-sm mb-2">
                      {form.formState.errors.mnemonic.message}
                    </p>
                  )}
                  {errors.length > 0 && (
                    <ul className="text-red-400 text-sm space-y-1">
                      {errors.map((error, index) => (
                        <li className="flex items-center gap-2" key={index}>
                          <span>•</span> {error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-10">
          <button
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan to-purple 
                     text-white font-semibold hover:opacity-90 transition-all duration-200
                     focus:ring-2 focus:ring-cyan/20 focus:outline-none
                     flex items-center justify-center gap-2 disabled:opacity-50 
                     disabled:cursor-not-allowed"
            disabled={isSubmitting}
            type="submit"
          >
            <span>Confirm Recovery Phrase</span>
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
