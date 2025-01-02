import { Folder, Loader2 } from 'lucide-react'
import React from 'react'
import { Controller } from 'react-hook-form'

interface BackupModalProps {
  showModal: boolean
  isBackupInProgress: boolean
  control: any
  formState: any
  backupPath: string
  onClose: () => void
  onSubmit: (data: any) => void
  onSelectFolder: () => void
  setValue: (name: string, value: string) => void
}

export const BackupModal: React.FC<BackupModalProps> = ({
  showModal,
  isBackupInProgress,
  control,
  formState,
  backupPath,
  onClose,
  onSubmit,
  onSelectFolder,
  setValue,
}) => {
  if (!showModal) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">
          Create Backup
        </h2>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Backup File Path
            </label>
            <div className="flex">
              <input
                className="flex-grow px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setValue('backupPath', e.target.value)}
                type="text"
                value={backupPath}
              />
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                onClick={onSelectFolder}
                type="button"
              >
                <Folder className="w-5 h-5" />
              </button>
            </div>
            {formState.errors.backupPath && (
              <p className="mt-1 text-sm text-red-500">Invalid backup path</p>
            )}
          </div>
          <Controller
            control={control}
            name="nodePassword"
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Node Password
                </label>
                <input
                  {...field}
                  className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter node password"
                  type="password"
                />
              </div>
            )}
          />
          {isBackupInProgress && (
            <div className="mt-4">
              <div className="flex items-center justify-center mb-2">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
              <p className="text-white text-center">
                Please wait, the backup is in progress...
                <br />
                The node will be locked until the backup process is finished.
              </p>
            </div>
          )}
          <div className="flex justify-between space-x-4 pt-6">
            <button
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isBackupInProgress}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isBackupInProgress}
              type="submit"
            >
              Create Backup
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
