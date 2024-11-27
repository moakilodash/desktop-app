import React from 'react'
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
    <>
      <div>
        <button
          className="px-3 py-1 rounded border text-sm border-gray-500"
          onClick={onBack}
        >
          Back to Recovery Phrase
        </button>
      </div>
      <div className="text-center mb-10">
        <h3 className="text-2xl font-semibold mb-4">
          Verify Your Recovery Phrase
        </h3>
        <p>
          Please enter your recovery phrase to confirm you've saved it
          correctly.
        </p>
      </div>
      <form
        className="flex items-center justify-center flex-col"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="w-80 space-y-4">
          <div>
            <div className="text-xs mb-3">Recovery Phrase</div>
            <div className="relative">
              <textarea
                className="border border-grey-light rounded bg-blue-dark px-4 py-3 w-full outline-none"
                {...form.register('mnemonic', { required: 'Required' })}
              />
            </div>
            <div className="text-sm text-red mt-2">
              {form.formState.errors.mnemonic?.message}
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="flex self-end justify-end mt-8">
          <button
            className="px-6 py-3 rounded border text-lg font-bold border-cyan"
            type="submit"
          >
            Complete Setup
          </button>
        </div>
      </form>
    </>
  )
}
