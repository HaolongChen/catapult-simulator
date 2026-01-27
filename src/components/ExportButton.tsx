import { Download } from 'lucide-react'
import { useState } from 'react'
import type { FrameData } from '@/physics/types'
import { saveTrajectory } from '@/api/trajectoryApi'

interface ExportButtonProps {
  trajectory: FrameData[]
  disabled?: boolean
  onExportComplete?: () => void
}

export function ExportButton({
  trajectory,
  disabled,
  onExportComplete,
}: ExportButtonProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleExport = async () => {
    if (trajectory.length === 0) return

    setIsSaving(true)
    setMessage(null)

    const success = await saveTrajectory(trajectory)

    if (success) {
      setMessage('✓ Saved!')
      setTimeout(() => setMessage(null), 2000)
      onExportComplete?.()
    } else {
      setMessage('✗ Failed')
      setTimeout(() => setMessage(null), 2000)
    }

    setIsSaving(false)
  }

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
      {message && (
        <div
          className={`px-3 py-1 rounded-lg text-sm font-bold ${
            message.includes('✓')
              ? 'bg-green-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }`}
        >
          {message}
        </div>
      )}
      <button
        onClick={handleExport}
        disabled={disabled || isSaving || trajectory.length === 0}
        className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
      >
        {isSaving ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="font-bold text-sm">Saving...</span>
          </>
        ) : (
          <>
            <Download size={20} />
            <span className="font-bold text-sm">Export & Reload</span>
          </>
        )}
      </button>
    </div>
  )
}
