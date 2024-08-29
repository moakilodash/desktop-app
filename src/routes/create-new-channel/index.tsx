import { useCallback, /* useEffect, */ useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { TRADE_PATH } from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  channelSliceActions,
  channelSliceSelectors,
  TNewChannelForm,
} from '../../slices/channel/channel.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { Step3 } from './Step3'
import { Step4 } from './Step4'

export const Component = () => {
  const dispatch = useAppDispatch()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const navigate = useNavigate()

  const [openChannel, openChannelResponse] =
    nodeApi.endpoints.openChannel.useLazyQuery()

  const newChannelForm = useAppSelector((state) =>
    channelSliceSelectors.form(state, 'new')
  )

  const onSubmit = useCallback(async () => {
    const form = newChannelForm as TNewChannelForm

    try {
      const openChannelResponse = await openChannel({
        asset_amount: form.assetAmount,
        asset_id: form.assetId,
        capacity_sat: form.capacitySat,
        peer_pubkey_and_addr: form.pubKeyAndAddress,
      })

      console.log('Opened channel successfully:', openChannelResponse.data)
      setStep(4)
    } catch (error) {
      console.error('Failed to open channel:', error)
    }
  }, [openChannel, newChannelForm])

  const onStep2Back = useCallback(() => {
    dispatch(
      channelSliceActions.setNewChannelForm({
        ...newChannelForm,
      })
    )
    setStep(1)
  }, [dispatch, channelSliceActions, setStep])

  // const onStep3Back = useCallback(() => {
  //   dispatch(
  //     channelSliceActions.setNewChannelForm({
  //       ...newChannelForm,
  //     })
  //   )
  //   setStep(2)
  // }, [dispatch, channelSliceActions, setStep])

  return (
    <div className="max-w-screen-lg w-full bg-blue-dark py-8 rounded px-14 pt-20 pb-8">
      <div className={step !== 1 ? 'hidden' : ''}>
        <Step1 error={''} onNext={() => setStep(2)} />
      </div>

      <div className={step !== 2 ? 'hidden' : ''}>
        <Step2 onBack={onStep2Back} onNext={() => setStep(3)} />
      </div>

      <div className={step !== 3 ? 'hidden' : ''}>
        <Step3
          error={
            (openChannelResponse.error as { data: { error: string } })?.data
              .error
          }
          onBack={() => setStep(2)}
          onNext={onSubmit}
        />
      </div>

      <div className={step !== 4 ? 'hidden' : ''}>
        <Step4 onFinish={() => navigate(TRADE_PATH)} />
      </div>
    </div>
  )
}
