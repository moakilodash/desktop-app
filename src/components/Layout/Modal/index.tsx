import './styles.css'

import { useRef } from 'react'

import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useOnClickOutside } from '../../../hooks/useOnClickOutside'
import { uiSliceActions, uiSliceSeletors } from '../../../slices/ui/ui.slice'

import { Content } from './Content'

export const LayoutModal = () => {
  const dispatch = useAppDispatch()
  const modal = useAppSelector(uiSliceSeletors.modal)
  const modalRef = useRef(null)

  useOnClickOutside(modalRef, () =>
    dispatch(uiSliceActions.setModal({ type: 'none' }))
  )

  if (modal.type === 'none') return null

  return (
    <div className="fixed top-0 inset-0 modal-backdrop flex items-center justify-center z-50">
      <div
        className="flex-1 h-4/6 w-full max-w-screen-lg bg-blue-dark rounded px-14 pt-20 pb-8 overflow-y-auto"
        ref={modalRef}
      >
        <Content modal={modal} />
      </div>
    </div>
  )
}
