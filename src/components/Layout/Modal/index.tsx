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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-5xl bg-slate-900 rounded-3xl border border-slate-800/50 
                   shadow-2xl shadow-black/20 overflow-hidden"
        ref={modalRef}
      >
        <div className="max-h-[85vh] overflow-y-auto px-8 py-10">
          <Content modal={modal} />
        </div>
      </div>
    </div>
  )
}
