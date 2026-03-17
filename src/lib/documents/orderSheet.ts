import PDFDocument from 'pdfkit'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings/settingsService'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SheetItem {
  productName: string
  variantName: string | null
  categoryName: string | null
  productionTypeSnapshot: string | null
  width: number
  height: number
  quantity: number
  designId: string | null
  uploadFiles: {
    id: string
    filename: string
    mime: string | null
    dpi: number | null
    status: string
    filePath: string | null
  }[]
}

interface SheetOrder {
  id: string
  createdAt: Date
  deliveryType: string
  trackingNumber: string | null
  shippingName: string | null
  shippingStreet: string | null
  shippingCity: string | null
  shippingZip: string | null
  shippingCountry: string | null
  user: { email: string; name: string | null } | null
  items: SheetItem[]
}

// ── PDF builder ───────────────────────────────────────────────────────────────

function buildPdf(order: SheetOrder, baseUrl: string, brandName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const BLACK  = '#111111'
    const RED    = '#cc0000'
    const GRAY   = '#555555'
    const LGRAY  = '#888888'
    const RULE   = '#e0e0e0'
    const BGALT  = '#f5f5f5'

    const short    = order.id.slice(0, 8).toUpperCase()
    const dateStr  = order.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const delivery = order.deliveryType === 'EXPRESS' ? 'Express'
                   : order.deliveryType === 'PICKUP'  ? 'Pickup'
                   : 'Standard'

    const L = 50   // left margin
    const W = 495  // usable width

    // ── Header strip ──────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 72).fill(BLACK)

    doc.fillColor(RED).font('Helvetica-Bold').fontSize(22)
      .text('ORDER SHEET', L, 18)
    doc.fillColor('#cccccc').font('Helvetica').fontSize(9)
      .text(`${brandName} · Workshop copy`, L, 44)

    // Order ID + date on the right
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(28)
      .text(`#${short}`, 320, 14, { width: 225, align: 'right' })
    doc.fillColor('#999999').font('Helvetica').fontSize(9)
      .text(dateStr, 320, 48, { width: 225, align: 'right' })

    doc.y = 90

    // ── Delivery / customer row ────────────────────────────────────────────────
    const customer = order.user?.name ?? order.user?.email ?? 'Guest'
    const shipLines = [
      order.shippingName,
      order.shippingStreet,
      [order.shippingZip, order.shippingCity].filter(Boolean).join(' '),
      order.shippingCountry,
    ].filter(Boolean) as string[]

    doc.font('Helvetica-Bold').fontSize(8).fillColor(LGRAY)
      .text('CUSTOMER', L, doc.y, { width: 220 })
    doc.text('DELIVERY', 310, doc.y, { width: 235 })

    doc.y += 12

    doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
      .text(customer, L, doc.y, { width: 220 })
    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text(`${delivery} delivery`, 310, doc.y, { width: 235 })

    if (order.user?.email && order.user.name) {
      doc.y += 12
      doc.font('Helvetica').fontSize(9).fillColor(LGRAY)
        .text(order.user.email, L, doc.y, { width: 220 })
    }

    if (shipLines.length) {
      const startY = doc.y + 12
      shipLines.forEach((line, idx) => {
        doc.font('Helvetica').fontSize(9).fillColor(GRAY)
          .text(line, 310, startY + idx * 12, { width: 235 })
      })
    }

    doc.y = Math.max(doc.y + 30, 165)

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(RULE).lineWidth(1).stroke()
    doc.y += 14

    // ── Items ─────────────────────────────────────────────────────────────────
    order.items.forEach((item, idx) => {
      if (doc.y > 680) { doc.addPage(); doc.y = 50 }

      const rowY = doc.y

      // Alternating background for readability on the print table
      if (idx % 2 === 1) {
        doc.rect(L - 4, rowY - 4, W + 8, 1).fill(RULE) // top rule
      }

      // Item number badge
      doc.rect(L, rowY, 22, 22).fill(RED)
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
        .text(String(idx + 1), L, rowY + 5, { width: 22, align: 'center' })

      const tx = L + 30

      // Product name
      const productLabel = item.productName + (item.variantName ? ` — ${item.variantName}` : '')
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11)
        .text(productLabel, tx, rowY, { width: 360 })

      // Size + quantity on same line
      doc.y = rowY + 16
      doc.fillColor(GRAY).font('Helvetica').fontSize(10)
        .text(`${item.width} × ${item.height} cm`, tx, doc.y, { width: 140, continued: false })
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
        .text(`Qty: ${item.quantity}`, tx + 150, doc.y - 12, { width: 80 })

      doc.y += 2

      // Category + production type (options)
      const optParts: string[] = []
      if (item.categoryName) optParts.push(item.categoryName)
      if (item.productionTypeSnapshot) optParts.push(item.productionTypeSnapshot)
      if (optParts.length) {
        doc.fillColor(RED).font('Helvetica-Bold').fontSize(9)
          .text(`Options: `, tx, doc.y, { continued: true })
        doc.fillColor(GRAY).font('Helvetica').fontSize(9)
          .text(optParts.join(' · '), { width: 380 })
        doc.y += 2
      }

      // File info
      const artFiles = item.uploadFiles
      if (item.designId) {
        doc.fillColor(LGRAY).font('Helvetica').fontSize(8)
          .text(`File: Designer file  ·  URL: ${baseUrl}/api/design/${item.designId}/preview`, tx, doc.y, { width: 420 })
        doc.y += 10
      } else if (artFiles.length > 0) {
        artFiles.forEach((f) => {
          const dpiNote = f.dpi ? `  ${f.dpi} DPI` : ''
          const dlUrl = f.filePath ? `${baseUrl}/api/admin/files/${f.id}` : '(no file)'
          doc.fillColor(LGRAY).font('Helvetica').fontSize(8)
            .text(`File: ${f.filename}${dpiNote}`, tx, doc.y, { width: 420 })
          doc.y += 10
          doc.fillColor(LGRAY).font('Helvetica').fontSize(8)
            .text(`Download: ${dlUrl}`, tx, doc.y, { width: 420 })
          doc.y += 10
        })
      } else {
        doc.fillColor('#cc6600').font('Helvetica-Bold').fontSize(8)
          .text('⚠ No file uploaded', tx, doc.y, { width: 380 })
        doc.y += 10
      }

      // Notes / checklist boxes
      doc.y += 4
      const boxes = ['Printed', 'Cut', 'Checked', 'Packed']
      let bx = tx
      boxes.forEach((label) => {
        doc.rect(bx, doc.y, 10, 10).strokeColor(RULE).lineWidth(1).stroke()
        doc.fillColor(LGRAY).font('Helvetica').fontSize(8)
          .text(label, bx + 13, doc.y + 1, { width: 55 })
        bx += 72
      })
      doc.y += 20

      // Row bottom rule
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(RULE).lineWidth(0.5).stroke()
      doc.y += 12
    })

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = 810
    doc.moveTo(L, footerY - 8).lineTo(L + W, footerY - 8).strokeColor(RULE).lineWidth(1).stroke()
    doc.fillColor(LGRAY).font('Helvetica').fontSize(8)
      .text(
        `${brandName}  ·  Order #${short}  ·  ${dateStr}  ·  Workshop copy — do not send to customer`,
        L, footerY, { width: W, align: 'center' }
      )

    void BGALT // referenced in design intent but not used in current layout

    doc.end()
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an order sheet PDF for the workshop.
 * Always regenerated on demand — no caching needed for workshop copy.
 */
export async function generateOrderSheet(orderId: string, baseUrl: string): Promise<Buffer> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      createdAt: true,
      deliveryType: true,
      trackingNumber: true,
      shippingName: true,
      shippingStreet: true,
      shippingCity: true,
      shippingZip: true,
      shippingCountry: true,
      user: { select: { email: true, name: true } },
      items: {
        select: {
          productName: true,
          variantName: true,
          categoryName: true,
          productionTypeSnapshot: true,
          width: true,
          height: true,
          quantity: true,
          designId: true,
          uploadFiles: {
            where: { NOT: { uploadType: 'PREVIEW' } },
            select: { id: true, filename: true, mime: true, dpi: true, status: true, filePath: true },
            orderBy: { uploadType: 'asc' },
          },
        },
      },
    },
  })

  if (!order) throw new Error(`Order not found: ${orderId}`)

  const mapped: SheetOrder = {
    ...order,
    items: order.items.map((i) => ({
      ...i,
      width: Number(i.width),
      height: Number(i.height),
    })),
  }

  const brandName = await getSetting('company.name').catch(() => 'PRINTSHOP')
  return buildPdf(mapped, baseUrl, brandName || 'PRINTSHOP')
}
