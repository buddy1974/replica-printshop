interface Props {
  className?: string
}

/**
 * Clean image placeholder shown when no image is available.
 * Pass className to control size (e.g. "w-14 h-14 shrink-0").
 * Defaults: rounded-lg, bg-gray-100, border-gray-200, photo icon in red-300.
 */
export default function ImagePlaceholder({ className = '' }: Props) {
  return (
    <div className={`flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-1/3 h-1/3 text-red-300"
        style={{ minWidth: 14, minHeight: 14 }}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  )
}
