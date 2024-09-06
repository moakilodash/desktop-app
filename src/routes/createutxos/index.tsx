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
  const [customFee, setCustomFee] = useState(1.0)

  const navigate = useNavigate()

  const { handleSubmit, register, watch, setValue } = useForm<FormFields>({
    defaultValues: {
      fee_rate: '2.0',
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

  const onSubmit = (data: FormFields) => {
    createutxos({
      fee_rate:
        data.fee_rate !== 'custom' ? parseFloat(data.fee_rate) : customFee,
      num: data.num,
      size: data.size,
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
    btcBalance()
  }, [btcBalance])

  useEffect(() => {
    refreshData()
    const intervalId = setInterval(refreshData, 3000)
    return () => clearInterval(intervalId)
  }, [refreshData])

  return (
    <div className="max-w-screen-lg w-full bg-blue-dark py-8 rounded px-14 pt-20 pb-8 relative">
      <form
        className="bg-gray-900 text-white p-8 rounded-lg shadow-lg"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h3 className="text-3xl font-bold mb-6 text-center">
          Create Colored UTXOs
        </h3>
        <h4 className="text-xl font-semibold mb-8 text-center text-gray-300">
          Select the size and number of UTXOs to create
        </h4>

        <div className="space-y-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              Number of UTXOs
            </label>
            <div className="flex items-center space-x-4">
              <input
                {...register('num', { valueAsNumber: true })}
                className="bg-gray-700 text-white px-4 py-2 rounded-md w-full"
                max={10}
                min={1}
                placeholder="Enter amount"
                type="number"
              />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <label className="block text-sm font-medium mb-2">UTXOs size</label>
            <div className="flex items-center space-x-4">
              <input
                {...register('size', { valueAsNumber: true })}
                className="bg-gray-700 text-white px-4 py-2 rounded-md w-full"
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
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"
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

          <div className="bg-gray-800 p-6 rounded-lg">
            <label className="block text-sm font-medium mb-2">Fee Rate</label>
            <select
              className="bg-gray-700 text-white px-4 py-2 rounded-md w-full"
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
                className="bg-gray-700 text-white px-4 py-2 mt-4 rounded-md w-full"
                defaultValue={customFee}
                onChange={(e) => setCustomFee(parseFloat(e.target.value))}
                step={0.1}
                type="number"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-10">
          <button
            className="px-6 py-3 rounded-lg text-lg font-bold bg-purple-600 hover:bg-purple-700 transition-colors"
            type="submit"
          >
            Create UTXOs
          </button>
        </div>
      </form>
    </div>
  )
}
