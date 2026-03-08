type Color = 'gray' | 'yellow' | 'blue' | 'green' | 'red'

const colors: Record<Color, string> = {
  gray:   'bg-gray-100 text-gray-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-blue-100 text-blue-800',
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
}

const statusColor: Record<string, Color> = {
  // FileStatus
  PENDING:       'yellow',
  REJECTED:      'red',
  // JobStatus
  QUEUED:        'gray',
  IN_PROGRESS:   'blue',
  FAILED:        'red',
  // OrderStatus
  CONFIRMED:     'blue',
  UPLOADED:      'yellow',
  APPROVED:      'green',
  READY:         'green',
  IN_PRODUCTION: 'blue',
  DONE:          'green',
  SHIPPED:       'green',
  DELIVERED:     'green',
  CANCELLED:     'red',
  // PaymentStatus
  UNPAID:        'yellow',
  PAID:          'green',
  REFUNDED:      'gray',
}

interface BadgeProps {
  label: string
  statusKey?: string
  color?: Color
}

export default function Badge({ label, statusKey, color }: BadgeProps) {
  const resolvedColor = color ?? statusColor[statusKey ?? label] ?? 'gray'
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[resolvedColor]}`}>
      {label}
    </span>
  )
}
