import { Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { UseFormReturn, SubmitHandler } from 'react-hook-form'

import { Button, Card, Alert } from '../ui'

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
}

export const PasswordSetupForm = ({
  form,
  onSubmit,
  isPasswordVisible,
  setIsPasswordVisible,
  errors,
}: PasswordSetupFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit: SubmitHandler<PasswordFields> = async (data) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <p className="text-slate-400 mb-6 leading-relaxed">
        Set a strong password to secure your node. This password will be
        required to access your wallet.
      </p>

      {/* Form Section */}
      <Card className="p-6 bg-blue-dark/40 border border-white/5">
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Create Password
            </label>
            <div className="relative">
              <input
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
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
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1
                           text-slate-400 hover:text-white rounded-lg
                           hover:bg-slate-700/50 transition-colors"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                type="button"
              >
                {isPasswordVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="mt-1.5 text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
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
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1
                           text-slate-400 hover:text-white rounded-lg
                           hover:bg-slate-700/50 transition-colors"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                type="button"
              >
                {isPasswordVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="mt-1.5 text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Password Strength Indicator */}
          <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
            <h4 className="text-sm font-medium text-slate-300 mb-2">
              Password Requirements:
            </h4>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-1.5 text-slate-400">
                <span
                  className={`w-3 h-3 rounded-full ${form.watch('password')?.length >= 8 ? 'bg-green-500' : 'bg-slate-600'}`}
                ></span>
                At least 8 characters
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span
                  className={`w-3 h-3 rounded-full ${form.watch('password')?.match(/[A-Z]/) ? 'bg-green-500' : 'bg-slate-600'}`}
                ></span>
                Contains uppercase letter
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span
                  className={`w-3 h-3 rounded-full ${form.watch('password')?.match(/[0-9]/) ? 'bg-green-500' : 'bg-slate-600'}`}
                ></span>
                Contains number
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span
                  className={`w-3 h-3 rounded-full ${form.watch('password') === form.watch('confirmPassword') && form.watch('password')?.length > 0 ? 'bg-green-500' : 'bg-slate-600'}`}
                ></span>
                Passwords match
              </li>
            </ul>
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <Alert
              icon={<AlertCircle className="w-5 h-5" />}
              title="Error"
              variant="error"
            >
              <ul className="text-sm space-y-1">
                {errors.map((error, index) => (
                  <li className="flex items-center gap-2" key={index}>
                    <span>•</span> {error}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            className="w-full mt-4"
            disabled={isSubmitting}
            icon={
              isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )
            }
            iconPosition="right"
            size="lg"
            type="submit"
            variant="primary"
          >
            {isSubmitting ? 'Initializing...' : 'Initialize Node'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
