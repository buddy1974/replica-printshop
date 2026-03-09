'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Badge from '@/components/Badge'
import { orderStatusLabel } from '@/lib/statusLabel'

interface Upload {
  id: string
  filename: string
  status: string
  uploadType: string | null
  dpi: number | null
  widthPx: number | null
  heightPx: number | null
  size: number | null
  filePath: string | null
}

interface Item {
  id: string
  productName: string
  variantName: string | null
  width: number
  height: number
  quantity: number
  priceSnapshot: number
  uploadFiles: Upload[]
}

interface Order {
  id: string
  status: string
  paymentStatus: string
  deliveryType: string
  total: number
  createdAt: string
  items: Item[]
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [fileStatuses, setFileStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((o: Order) => {
        setOrder(o)
        const statuses: Record<string, string> = {}
        for (const item of o.items) {
          for (const f of item.uploadFiles) statuses[f.id] = f.status
        }
        setFileStatuses(statuses)
      })
  }, [id])

  const setFileStatus = async (fileId: string, status: string) => {
    const res = await fetch(`/api/upload/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setFileStatuses((prev) => ({ ...prev, [fileId]: status }))
  }

  if (!order) return <p style={{ padding: 24 }}>Loading…</p>

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Order <span style={{ fontFamily: 'monospace', fontSize: 16 }}>{order.id.slice(0, 8)}</span></h1>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', margin: '12px 0 24px' }}>
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>Status</p>
          <Badge label={orderStatusLabel(order.status)} statusKey={order.status} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>Payment</p>
          <Badge label={order.paymentStatus} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>Delivery</p>
          <p style={{ fontSize: 14, fontWeight: 500 }}>{order.deliveryType}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>Total</p>
          <p style={{ fontSize: 14, fontWeight: 500 }}>€{Number(order.total).toFixed(2)}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>Date</p>
          <p style={{ fontSize: 14 }}>{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <h2>Items</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        {order.items.map((item) => {
          const previews = item.uploadFiles.filter((f) => f.uploadType === 'PREVIEW')
          const artFiles = item.uploadFiles.filter((f) => f.uploadType !== 'PREVIEW')
          return (
            <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>
                {item.productName}{item.variantName ? ` — ${item.variantName}` : ''}
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                {Number(item.width)} × {Number(item.height)} cm · Qty {item.quantity} · €{Number(item.priceSnapshot).toFixed(2)}
              </p>

              {previews.map((f) => (
                <div key={f.id} style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>PREVIEW</p>
                  <img src={`/api/admin/files/${f.id}`} alt="Preview" loading="lazy" style={{ maxWidth: 240, borderRadius: 6, border: '1px solid #e5e7eb' }} />
                </div>
              ))}

              {item.uploadFiles.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No files uploaded</p>
              ) : artFiles.length === 0 ? null : (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Uploaded files</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        {['File', 'Type', 'DPI', 'Width px', 'Height px', 'Size', 'Status', ''].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {artFiles.map((f) => {
                        const currentStatus = fileStatuses[f.id] ?? f.status
                        return (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 12 }}>
                              {f.filePath ? (
                                <a href={`/api/admin/files/${f.id}`} style={{ color: '#2563eb' }}>{f.filename}</a>
                              ) : f.filename}
                            </td>
                            <td style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280' }}>{f.uploadType ?? '—'}</td>
                            <td style={{ padding: '6px 8px' }}>{f.dpi ?? '—'}</td>
                            <td style={{ padding: '6px 8px' }}>{f.widthPx ?? '—'}</td>
                            <td style={{ padding: '6px 8px' }}>{f.heightPx ?? '—'}</td>
                            <td style={{ padding: '6px 8px' }}>{f.size ? `${(f.size / 1024).toFixed(0)} KB` : '—'}</td>
                            <td style={{ padding: '6px 8px' }}><Badge label={currentStatus} /></td>
                            <td style={{ padding: '6px 8px' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  onClick={() => setFileStatus(f.id, 'APPROVED')}
                                  disabled={currentStatus === 'APPROVED'}
                                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #16a34a', background: currentStatus === 'APPROVED' ? '#16a34a' : 'white', color: currentStatus === 'APPROVED' ? 'white' : '#16a34a', cursor: currentStatus === 'APPROVED' ? 'default' : 'pointer' }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setFileStatus(f.id, 'REJECTED')}
                                  disabled={currentStatus === 'REJECTED'}
                                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #dc2626', background: currentStatus === 'REJECTED' ? '#dc2626' : 'white', color: currentStatus === 'REJECTED' ? 'white' : '#dc2626', cursor: currentStatus === 'REJECTED' ? 'default' : 'pointer' }}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
