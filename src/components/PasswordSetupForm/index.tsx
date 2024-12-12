import { ArrowLeft, Eye, EyeOff, AlertCircle, Lock } from 'lucide-react'
import { UseFormReturn, SubmitHandler } from 'react-hook-form'

export interface PasswordFields {
  password: string
  confirmPassword: string
}

interface PasswordSetupFormProps {
  form: UseFormReturn<PasswordFields>
  onSubmit: SubmitHandler<PasswordFields>
  isPasswordVisible: boolean
  setIsPasswordVisible: (value: boolean) => void
  errors: string[]
  onBack: () => void
}

export const PasswordSetupForm = ({
  form,
  onSubmit,
  isPasswordVisible,
  setIsPasswordVisible,
  errors,
  onBack,
}: PasswordSetupFormProps) => {
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
          Create Your Password
        </h3>
        <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
          Set a strong password to secure your node. This password will be
          required to access your wallet.
        </p>
      </div>

      {/* Form Section */}
      <form
        className="max-w-md mx-auto bg-slate-900/50 p-8 rounded-2xl 
                   border border-slate-800/50 backdrop-blur-sm"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-6">
          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Create Password
            </label>
            <div className="relative">
              <input
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                          bg-slate-800/30 text-slate-300 
                          focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                          outline-none transition-all placeholder:text-slate-600"
                placeholder="Enter a strong password"
                type={isPasswordVisible ? 'text' : 'password'}
                {...form.register('password', {
                  minLength: {
                    message: 'Password must be at least 8 characters',
                    value: 8,
                  },
                  required: 'Password is required',
                })}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5
                           text-slate-400 hover:text-white rounded-lg
                           hover:bg-slate-700/50 transition-colors"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                type="button"
              >
                {isPasswordVisible ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="mt-2 text-red-400 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-700/50 
                          bg-slate-800/30 text-slate-300 
                          focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                          outline-none transition-all placeholder:text-slate-600"
                placeholder="Re-enter your password"
                type={isPasswordVisible ? 'text' : 'password'}
                {...form.register('confirmPassword', {
                  minLength: {
                    message: 'Password must be at least 8 characters',
                    value: 8,
                  },
                  required: 'Password confirmation is required',
                  validate: (value) =>
                    value === form.getValues('password') ||
                    'Passwords do not match',
                })}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5
                           text-slate-400 hover:text-white rounded-lg
                           hover:bg-slate-700/50 transition-colors"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                type="button"
              >
                {isPasswordVisible ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="mt-2 text-red-400 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div
              className="p-4 bg-red-500/10 border border-red-500/20 
                          rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <ul className="text-red-400 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li className="flex items-center gap-2" key={index}>
                    <span>•</span> {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <button
            className="w-full mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan to-purple 
                     text-white font-semibold hover:opacity-90 transition-all duration-200
                     focus:ring-2 focus:ring-cyan/20 focus:outline-none
                     flex items-center justify-center gap-2"
            type="submit"
          >
            <Lock className="w-5 h-5" />
            <span>Initialize Node</span>
          </button>
        </div>
      </form>
    </div>
  )
}
