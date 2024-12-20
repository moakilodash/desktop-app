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
          <h3 className="text-3xl font-bold text-white mb-4">
            Channel creation failed
          </h3>

          <p className="text-red-500 mb-6">{props.error}</p>

          <button
            className="px-8 py-3 rounded-lg text-lg font-bold
              bg-gray-700 hover:bg-gray-600 text-gray-300
              transform transition-all duration-200
              focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50
              shadow-md hover:shadow-lg mr-4"
            onClick={props.onRetry}
          >
            Try Again
          </button>

          <button
            className="px-8 py-3 rounded-lg text-lg font-bold text-white
              bg-blue-600 hover:bg-blue-700
              transform transition-all duration-200
              focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              shadow-lg hover:shadow-xl"
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
        <h3 className="text-3xl font-bold text-white mb-4">
          Channel successfully created!
        </h3>

        <p className="text-gray-400 mb-6">
          The channel has been successfully created, you can now start trading.
        </p>

        <button
          className="px-8 py-3 rounded-lg text-lg font-bold text-white
            bg-blue-600 hover:bg-blue-700
            transform transition-all duration-200
            focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            shadow-lg hover:shadow-xl"
          onClick={props.onFinish}
        >
          Go to Trade Page
        </button>
      </div>
    </div>
  )
}
