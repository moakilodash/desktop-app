interface FormErrorProps {
  message?: string
}

export const FormError = ({
  message = 'There was an error submitting the form.',
}: FormErrorProps) => (
  <div className="flex justify-end text-red mt-4">{message}</div>
)
