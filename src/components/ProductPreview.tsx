'use client'

interface Props {
  placement: 'front' | 'back'
  width: number
  height: number
}

// Garment silhouette dimensions (display units)
const GARMENT_W = 200
const GARMENT_H = 240

// Front and back print area anchors (% of garment display size)
const AREAS = {
  front: { top: '28%', left: '50%', transform: 'translateX(-50%)' },
  back:  { top: '22%', left: '50%', transform: 'translateX(-50%)' },
}

// Scale print size to display pixels — cap at garment display area
const MAX_PRINT_PX = 120
const scalePx = (cm: number) => Math.min((cm / 40) * MAX_PRINT_PX, MAX_PRINT_PX)

export default function ProductPreview({ placement, width, height }: Props) {
  const area = AREAS[placement]
  const printW = scalePx(width)
  const printH = scalePx(height)

  return (
    <div
      style={{
        position: 'relative',
        width: GARMENT_W,
        height: GARMENT_H,
        background: '#e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
      }}
      aria-label={`Garment preview — ${placement} placement`}
    >
      {/* Garment body */}
      <GarmentSilhouette />

      {/* Side label */}
      <span
        style={{
          position: 'absolute',
          bottom: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11,
          color: '#6b7280',
          fontWeight: 500,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {placement}
      </span>

      {/* Print area overlay */}
      <div
        style={{
          position: 'absolute',
          top: area.top,
          left: area.left,
          transform: area.transform,
          width: printW,
          height: printH,
          border: '2px dashed #3b82f6',
          background: 'rgba(59,130,246,0.12)',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={`${width} × ${height} cm`}
      >
        <span style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 600 }}>
          {width}×{height}cm
        </span>
      </div>
    </div>
  )
}

function GarmentSilhouette() {
  return (
    <svg
      viewBox="0 0 200 240"
      width={GARMENT_W}
      height={GARMENT_H}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      {/* T-shirt / garment outline */}
      <path
        d="M60,10 L20,50 L45,60 L45,220 L155,220 L155,60 L180,50 L140,10 Q120,30 100,30 Q80,30 60,10 Z"
        fill="#d1d5db"
        stroke="#9ca3af"
        strokeWidth="1.5"
      />
      {/* Sleeve left */}
      <path
        d="M60,10 L20,50 L45,60 L60,40 Z"
        fill="#c4c9d1"
        stroke="#9ca3af"
        strokeWidth="1"
      />
      {/* Sleeve right */}
      <path
        d="M140,10 L180,50 L155,60 L140,40 Z"
        fill="#c4c9d1"
        stroke="#9ca3af"
        strokeWidth="1"
      />
    </svg>
  )
}
