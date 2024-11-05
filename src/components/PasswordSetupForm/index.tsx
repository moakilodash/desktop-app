import { EyeIcon } from 'lucide-react'
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
    <>
      <div className="mb-8">
        <button
          className="px-4 py-2 rounded-full border text-sm border-gray-500 hover:bg-gray-700 transition-colors"
          onClick={onBack}
          type="button"
        >
          ← Back
        </button>
      </div>
      <div className="text-center mb-10">
        <h3 className="text-2xl font-semibold mb-4">Create Your Password</h3>
        <p>
          Set a strong password to secure your node. This password will be
          required to access your wallet.
        </p>
      </div>
      <form
        className="flex items-center justify-center flex-col"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="w-80 space-y-4">
          {/* Password Field */}
          <div>
            <div className="text-xs mb-3">Create Password</div>
            <div className="relative">
              <input
                className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                placeholder="Enter a strong password"
                type={isPasswordVisible ? 'text' : 'password'}
                {...form.register('password', {
                  minLength: {
                    message: 'Password must be at least 8 characters',
                    value: 8,
                  },
                  required: 'Required',
                })}
              />
              <div
                className="absolute top-0 right-4 h-full flex items-center cursor-pointer"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                <EyeIcon />
              </div>
            </div>
            <div className="text-sm text-red mt-2">
              {form.formState.errors.password?.message}
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <div className="text-xs mb-3">Confirm Password</div>
            <div className="relative">
              <input
                className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                placeholder="Re-enter your password"
                type={isPasswordVisible ? 'text' : 'password'}
                {...form.register('confirmPassword', {
                  minLength: {
                    message: 'Password must be at least 8 characters',
                    value: 8,
                  },
                  required: 'Required',
                  validate: (value) =>
                    value === form.getValues('password') ||
                    'Passwords do not match',
                })}
              />
              <div
                className="absolute top-0 right-4 h-full flex items-center cursor-pointer"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                <EyeIcon />
              </div>
            </div>
            <div className="text-sm text-red mt-2">
              {form.formState.errors.confirmPassword?.message}
            </div>
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="text-sm text-red">
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex self-end justify-end mt-8">
          <button
            className="px-6 py-3 rounded border text-lg font-bold border-cyan"
            type="submit"
          >
            Initialize Node
          </button>
        </div>
      </form>
    </>
  )
}
