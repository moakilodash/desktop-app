import { uiSliceSeletors } from '../../../slices/ui/ui.slice'

import { DepositModalContent } from './Deposit'
import { WithdrawModalContent } from './Withdraw'

interface Props {
  modal: Exclude<ReturnType<typeof uiSliceSeletors.modal>, 'none'>
}
export const Content = (props: Props) => {
  switch (props.modal.type) {
    case 'deposit':
      return <DepositModalContent />
    case 'withdraw':
      return <WithdrawModalContent />
  }
}
