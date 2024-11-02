interface ModalProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export const Modal: React.FC<ModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-blue-dark p-6 rounded-lg max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            className="px-4 py-2 rounded border border-gray-500 hover:bg-gray-700"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-cyan text-blue-dark hover:bg-cyan-light"
            onClick={onConfirm}
          >
            Initialize
          </button>
        </div>
      </div>
    </div>
  )
}
