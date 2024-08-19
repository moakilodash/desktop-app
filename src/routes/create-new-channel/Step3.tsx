import { useAppSelector } from '../../app/store/hooks'
import { ArrowRightIcon } from '../../icons/ArrowRight'
import { WarningIcon } from '../../icons/Warning'
import {
  channelSliceSelectors,
  TNewChannelForm,
} from '../../slices/channel/channel.slice'

interface Props {
  error?: string
  onBack: VoidFunction
  onNext: VoidFunction
}

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const Step3 = (props: Props) => {
  const newChannelForm = useAppSelector(
    (state) => channelSliceSelectors.form(state, 'new') as TNewChannelForm
  )
  const [pubKey, address] = newChannelForm.pubKeyAndAddress?.split('@') ?? []

  return (
    <div className="max-w-lg mx-auto p-6 bg-gray-800 text-white rounded-lg shadow-md">
      <div className="text-center mb-10">
        <h3 className="text-3xl font-semibold mb-4">
          Confirm Channel - Step 3
        </h3>
        <p className="text-lg text-gray-400">
          Last confirmation before the channel is opened.
        </p>
      </div>

      <div className="bg-gray-900 p-6 rounded-lg shadow-inner text-center space-y-4">
        <div className="text-3xl font-bold text-cyan-400">
          {formatNumber(newChannelForm.capacitySat)} SAT
        </div>
        {newChannelForm.assetAmount > 0 && (
          <div className="text-lg text-gray-400">
            {newChannelForm.assetAmount} {newChannelForm.assetTicker}
          </div>
        )}
      </div>

      <div className="flex justify-center my-6">
        <ArrowRightIcon />
      </div>

      <div className="bg-gray-900 p-6 rounded-lg shadow-inner text-center space-y-4">
        <div className="text-2xl font-bold text-cyan-400">{address}</div>
        <div className="text-lg text-gray-400">
          {pubKey.slice(0, 10)}...{pubKey.slice(-10)}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-center text-red-500 space-x-2">
        <WarningIcon />
        <p className="text-sm max-w-md text-center">
          When you open a direct channel, the market maker who creates the
          channel might apply a fee to open the channel for the other asset.
        </p>
      </div>

      <div className="flex justify-between mt-10">
        <button
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
          onClick={props.onBack}
        >
          Go Back
        </button>

        <button
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-bold rounded shadow-md transition duration-200"
          onClick={props.onNext}
        >
          Next Step
        </button>
      </div>

      {props.error && (
        <div className="flex justify-end text-red-500 mt-4">{props.error}</div>
      )}
    </div>
  )
}
