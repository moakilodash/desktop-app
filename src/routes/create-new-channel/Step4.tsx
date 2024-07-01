import { SuccessCheckmark } from '../../components/SuccessCheckmark'

interface Props {
  onFinish: VoidFunction
}

export const Step4 = (props: Props) => {
  return (
    <>
      <div className="flex flex-col items-center justify-center">
        <SuccessCheckmark />

        <div className="text-center mt-6">
          <h3 className="text-2xl font-semibold mb-4">
            Channel successfully created!
          </h3>

          <p>
            The channel has been successfully created, you can now start
            trading.
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-20">
        <button
          className="px-6 py-3 rounded border text-lg font-bold border-cyan"
          onClick={props.onFinish}
        >
          Finish
        </button>
      </div>
    </>
  )
}
