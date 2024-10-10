import { SuccessCheckmark } from '../../components/SuccessCheckmark'

interface Props {
  error: string | null
  onFinish: VoidFunction
  onRetry: VoidFunction
}

export const Step4 = (props: Props) => {
  if (props.error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="text-red-500 text-6xl mb-6">❌</div>

        <div className="text-center mt-6">
          <h3 className="text-2xl font-semibold mb-4">
            Channel creation failed
          </h3>

          <p className="text-red-500 mb-6">{props.error}</p>

          <button
            className="px-6 py-3 rounded border text-lg font-bold border-cyan mr-4"
            onClick={props.onRetry}
          >
            Try Again
          </button>

          <button
            className="px-6 py-3 rounded border text-lg font-bold border-cyan"
            onClick={props.onFinish}
          >
            Go to Trade Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <SuccessCheckmark />

      <div className="text-center mt-6">
        <h3 className="text-2xl font-semibold mb-4">
          Channel successfully created!
        </h3>

        <p className="mb-6">
          The channel has been successfully created, you can now start trading.
        </p>

        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan"
          onClick={props.onFinish}
        >
          Go to Trade Page
        </button>
      </div>
    </div>
  )
}
