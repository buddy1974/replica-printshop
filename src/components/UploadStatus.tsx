import Badge from '@/components/Badge'

interface UploadStatusProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  dpi?: number | null
  widthCm?: number | null
  heightCm?: number | null
  message?: string | null
}

export default function UploadStatus({ status, dpi, widthCm, heightCm, message }: UploadStatusProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Badge label={status} />
        {dpi != null && <span className="text-xs text-gray-500">{dpi} dpi</span>}
        {widthCm != null && heightCm != null && (
          <span className="text-xs text-gray-500">{widthCm.toFixed(1)} × {heightCm.toFixed(1)} cm</span>
        )}
      </div>
      {message && (
        <p className={`text-xs ${status === 'REJECTED' ? 'text-red-600' : status === 'APPROVED' ? 'text-green-700' : 'text-gray-500'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
