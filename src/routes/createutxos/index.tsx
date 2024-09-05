import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface FormFields {
  up_to: boolean
  num: number
  size: number
  fee_rate: number
}

export const Component = () => {
  const navigate = useNavigate()
  const { handleSubmit, register, watch, setValue } = useForm<FormFields>({
    defaultValues: {
      fee_rate: 4.1,
      num: 4,
      size: 32500,
    },
  })

  const num = watch('num')
  const size = watch('size')

  const [btcBalance, btcBalanceResponse] =
    nodeApi.endpoints.btcBalance.useLazyQuery()
  const [createutxos] = nodeApi.useLazyCreateUTXOsQuery()

  const onSubmit = (data: FormFields) => {
    createutxos(data).then((res: any) => {
      console.log(res)
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
