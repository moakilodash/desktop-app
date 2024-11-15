import { Info, DollarSign, Zap, ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface FormFields {
  up_to: boolean
  num: number
  size: number
  fee_rate: string
}

export const Component = () => {
  const [feeRates, setFeeRates] = useState({
    fast: 3.0,
    normal: 2.0,
    slow: 1.0,
  })
  const [customFee, setCustomFee] = useState(1.0)

  const navigate = useNavigate()

  const { handleSubmit, register, watch, setValue } = useForm<FormFields>({
    defaultValues: {
      fee_rate: feeRates.normal.toString(),
      num: 4,
      size: 32500,
    },
  })

  const num = watch('num')
  const size = watch('size')
  const feeRate = watch('fee_rate')

  const [btcBalance, btcBalanceResponse] =
    nodeApi.endpoints.btcBalance.useLazyQuery()
  const [createutxos] = nodeApi.useLazyCreateUTXOsQuery()
  const [estimateFee] = nodeApi.useLazyEstimateFeeQuery()

  const onSubmit = (data: FormFields) => {
    createutxos({
      fee_rate:
        data.fee_rate !== 'custom' ? parseFloat(data.fee_rate) : customFee,
      num: data.num,
      size: data.size,
      skip_sync: false,
    }).then((res: any) => {
      if (res.error) {
        toast.error(res.error.data.error)
      } else {
        navigate(-1)
        toast.success('UTXOs created successfully')
      }
    })
  }

  const refreshData = useCallback(() => {
    btcBalance({ skip_sync: false })
  }, [btcBalance])

  useEffect(() => {
    const fetchFees = async () => {
      const slowFeePromise = estimateFee({ blocks: 6 }).unwrap()
      const normalFeePromise = estimateFee({ blocks: 3 }).unwrap()
      const fastFeePromise = estimateFee({ blocks: 1 }).unwrap()

      try {
        const [slowFee, normalFee, fastFee] = await Promise.all([
          slowFeePromise,
          normalFeePromise,
          fastFeePromise,
        ])
        setFeeRates({
          fast: fastFee.fee_rate,
          normal: normalFee.fee_rate,
          slow: slowFee.fee_rate,
        })
      } catch (e) {
        console.error(e)
      }
    }

    fetchFees()
  }, [estimateFee])

  useEffect(() => {
    refreshData()
    const intervalId = setInterval(refreshData, 3000)
    return () => clearInterval(intervalId)
  }, [refreshData])

  return (
    <div className="max-w-screen-xl w-full bg-gray-900 py-8 rounded-lg px-8 md:px-14 pt-20 pb-8 relative">
      <button
        className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={24} />
      </button>

      <form
        className="bg-gray-800 text-white p-8 rounded-lg shadow-lg"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h3 className="text-3xl font-bold mb-6 text-center">
          Create Colored UTXOs
        </h3>
        <div className="bg-blue-600 text-white p-4 rounded-lg mb-8">
          <div className="flex items-start mb-2">
            <Info className="mr-2 flex-shrink-0 mt-1" size={24} />
            <p className="text-sm">
              Colored UTXOs are necessary for opening RGB asset lightning
              channels. They allow for the creation of asset-specific payment
              channels, enabling fast and secure transactions of RGB assets over
              the Lightning Network.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-700 p-6 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              Number of UTXOs
            </label>
            <div className="flex items-center space-x-4">
              <input
                {...register('num', { valueAsNumber: true })}
                className="bg-gray-600 text-white px-4 py-2 rounded-md w-full"
                max={10}
                min={1}
                placeholder="Enter amount"
                type="number"
              />
            </div>
          </div>

          <div className="bg-gray-700 p-6 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              UTXO Size (in satoshis)
            </label>
            <div className="flex items-center space-x-4">
              <input
                {...register('size', { valueAsNumber: true })}
                className="bg-gray-600 text-white px-4 py-2 rounded-md w-full"
                max={
                  btcBalanceResponse.data
                    ? Math.floor(
                        btcBalanceResponse.data?.vanilla.spendable / num
                      )
                    : 0
                }
                min={0}
                placeholder="Enter size"
                type="number"
              />
              <span className="text-lg font-semibold w-24 text-right">
                {size.toLocaleString()}
              </span>
            </div>
            <input
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-4"
              max={
                btcBalanceResponse.data
                  ? Math.floor(btcBalanceResponse.data?.vanilla.spendable / num)
                  : 0
              }
              min={0}
              onChange={(e) => setValue('size', Number(e.target.value))}
              step="1000"
              type="range"
              value={size}
            />
          </div>

          <div className="bg-gray-700 p-6 rounded-lg">
            <label className="block text-sm font-medium mb-2">Fee Rate</label>
            <select
              className="bg-gray-600 text-white px-4 py-2 rounded-md w-full"
              value={feeRate}
              {...register('fee_rate')}
            >
              <option value="1.0">Slow</option>
              <option value="2.0">Normal</option>
              <option value="3.0">Fast</option>
              <option value="custom">Custom</option>
            </select>
            {feeRate === 'custom' && (
              <input
                className="bg-gray-600 text-white px-4 py-2 mt-4 rounded-md w-full"
                defaultValue={customFee}
                onChange={(e) => setCustomFee(parseFloat(e.target.value))}
                step={0.1}
                type="number"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mt-10">
          <div className="flex items-center mb-4 sm:mb-0">
            <DollarSign className="text-yellow-500 mr-2" size={24} />
            <span className="text-gray-300">
              Available Balance:{' '}
              {btcBalanceResponse.data?.vanilla.spendable.toLocaleString()} sats
            </span>
          </div>
          <button
            className="px-6 py-3 rounded-lg text-lg font-bold bg-purple-600 hover:bg-purple-700 transition-colors flex items-center"
            type="submit"
          >
            <Zap className="mr-2" size={20} />
            Create UTXOs
          </button>
        </div>
      </form>
    </div>
  )
}
