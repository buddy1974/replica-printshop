import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { extractVat } from '@/lib/tax'

const INVOICE_DIR = path.resolve(process.cwd(), 'storage', 'invoices')
const BRAND_NAME = 'Printshop'

// ── Types ────────────────────────────────────────────────────────────────────

interface InvoiceOrder {
  id: string
  createdAt: Date
  total: number
  shippingPrice: number
  taxPercent: number
  taxAmount: number
  deliveryType: string
  billingName: string | null
  billingStreet: string | null
  billingCity: string | null
  billingZip: string | null
  billingCountry: string | null
  shippingName: string | null
  shippingStreet: string | null
  shippingCity: string | null
  shippingZip: string | null
  shippingCountry: string | null
  user: { email: string; name: string | null } | null
  items: {
    productName: string
    variantName: string | null
    width: number
    height: number
    quantity: number
    priceSnapshot: number
  }[]
}

// ── PDF builder ──────────────────────────────────────────────────────────────

function buildPdf(order: InvoiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const red = '#cc0000'
    const dark = '#111111'
    const mid = '#555555'
    const light = '#888888'
    const lineGray = '#e0e0e0'

    const short = order.id.slice(0, 8).toUpperCase()
    const dateStr = order.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 72).fill(red)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text(BRAND_NAME, 50, 24)
    doc.fillColor('#ffcccc').font('Helvetica').fontSize(9)
      .text('Print & Production', 50, 48)

    // ── Invoice label ───────────────────────────────────────────────────────
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(22).text('INVOICE', 350, 24)
    doc.fillColor(mid).font('Helvetica').fontSize(9)
      .text(`#${short}`, 350, 50)
      .text(dateStr, 350, 62)

    doc.y = 100

    // ── Billing / From columns ───────────────────────────────────────────────
    const leftX = 50
    const rightX = 320

    doc.font('Helvetica-Bold').fontSize(8).fillColor(light)
      .text('INVOICE TO', leftX, doc.y, { width: 200 })
      .text('FROM', rightX, doc.y, { width: 200 })

    doc.y += 14

    // Customer
    const custName = order.billingName ?? order.user?.name ?? order.user?.email ?? 'Customer'
    doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text(custName, leftX, doc.y, { width: 200 })
    if (order.user?.email && order.billingName) {
      doc.font('Helvetica').fontSize(9).fillColor(mid).text(order.user.email, leftX, doc.y + 12, { width: 200 })
    }
    const billingLines = [
      order.billingStreet,
      [order.billingZip, order.billingCity].filter(Boolean).join(' '),
      order.billingCountry,
    ].filter(Boolean) as string[]
    billingLines.forEach((line) => {
      doc.font('Helvetica').fontSize(9).fillColor(mid).text(line, leftX, doc.y + 12, { width: 200 })
    })

    // From (shop address)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text(BRAND_NAME, rightX, doc.y - (billingLines.length + 1) * 12, { width: 200 })
    doc.font('Helvetica').fontSize(9).fillColor(mid)
      .text('print@printshop.at', rightX, doc.y - (billingLines.length) * 12, { width: 200 })

    doc.y = Math.max(doc.y + 20, 220)

    // Divider
    doc.moveTo(leftX, doc.y).lineTo(545, doc.y).strokeColor(lineGray).lineWidth(1).stroke()
    doc.y += 16

    // ── Delivery note ────────────────────────────────────────────────────────
    const deliveryLabel = order.deliveryType === 'EXPRESS' ? 'Express (1–2 business days)'
      : order.deliveryType === 'PICKUP' ? 'Pickup in store'
      : 'Standard (3–5 business days)'
    doc.font('Helvetica').fontSize(9).fillColor(mid).text(`Delivery: ${deliveryLabel}`, leftX, doc.y)
    doc.y += 20

    // ── Items table header ───────────────────────────────────────────────────
    const colProduct = 50
    const colSize = 290
    const colQty = 370
    const colUnit = 420
    const colTotal = 490

    doc.rect(leftX, doc.y, 495, 20).fill('#f5f5f5')
    doc.fillColor(light).font('Helvetica-Bold').fontSize(8)
      .text('PRODUCT', colProduct, doc.y + 6, { width: 230 })
      .text('SIZE', colSize, doc.y + 6, { width: 70 })
      .text('QTY', colQty, doc.y + 6, { width: 40 })
      .text('UNIT', colUnit, doc.y + 6, { width: 60 })
      .text('TOTAL', colTotal, doc.y + 6, { width: 55, align: 'right' })

    doc.y += 24

    // ── Item rows ────────────────────────────────────────────────────────────
    order.items.forEach((item, i) => {
      if (i % 2 === 1) {
        doc.rect(leftX, doc.y - 3, 495, 20).fill('#fafafa')
      }
      const lineTotal = item.priceSnapshot * item.quantity
      doc.fillColor(dark).font('Helvetica').fontSize(9)
        .text(item.productName + (item.variantName ? ` — ${item.variantName}` : ''), colProduct, doc.y, { width: 230 })
        .text(`${item.width}×${item.height} cm`, colSize, doc.y, { width: 70 })
        .text(String(item.quantity), colQty, doc.y, { width: 40 })
        .text(`€${item.priceSnapshot.toFixed(2)}`, colUnit, doc.y, { width: 60 })
        .text(`€${lineTotal.toFixed(2)}`, colTotal, doc.y, { width: 55, align: 'right' })
      doc.y += 18
    })

    // ── Totals ────────────────────────────────────────────────────────────────
    doc.moveTo(leftX, doc.y + 4).lineTo(545, doc.y + 4).strokeColor(lineGray).lineWidth(1).stroke()
    doc.y += 16

    const grossItems = order.total - order.shippingPrice
    // VAT: use stored taxAmount if > 0, otherwise derive from stored rate
    const vatRate = order.taxPercent
    const vatAmount = order.taxAmount > 0 ? order.taxAmount : extractVat(order.total, vatRate)
    const netTotal = order.total - vatAmount

    const rows: [string, string][] = [
      ['Subtotal (net)', `€${(grossItems - extractVat(grossItems, vatRate)).toFixed(2)}`],
      ['Delivery', order.shippingPrice > 0 ? `€${order.shippingPrice.toFixed(2)}` : 'Free'],
    ]
    rows.forEach(([label, value]) => {
      doc.font('Helvetica').fontSize(9).fillColor(mid)
        .text(label, 380, doc.y, { width: 100, align: 'right' })
        .text(value, 490, doc.y, { width: 55, align: 'right' })
      doc.y += 14
    })

    // VAT line
    if (vatRate > 0) {
      doc.font('Helvetica').fontSize(9).fillColor(mid)
        .text(`VAT (${vatRate}%)`, 380, doc.y, { width: 100, align: 'right' })
        .text(`€${vatAmount.toFixed(2)}`, 490, doc.y, { width: 55, align: 'right' })
      doc.y += 14
    }

    doc.y += 4
    doc.rect(360, doc.y, 185, 22).fill('#111111')
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
      .text('TOTAL (incl. VAT)', 370, doc.y + 6, { width: 100, align: 'right' })
      .text(`€${order.total.toFixed(2)}`, 490, doc.y + 6, { width: 55, align: 'right' })
    doc.y += 32

    void netTotal // suppress unused variable warning

    // ── Delivery address ─────────────────────────────────────────────────────
    if (order.shippingName && order.deliveryType !== 'PICKUP') {
      doc.y += 8
      doc.font('Helvetica-Bold').fontSize(8).fillColor(light).text('DELIVERY ADDRESS', leftX, doc.y)
      doc.y += 12
      const shipLines = [
        order.shippingName,
        order.shippingStreet,
        [order.shippingZip, order.shippingCity].filter(Boolean).join(' '),
        order.shippingCountry,
      ].filter(Boolean) as string[]
      shipLines.forEach((line) => {
        doc.font('Helvetica').fontSize(9).fillColor(mid).text(line, leftX, doc.y)
        doc.y += 12
      })
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor(light).font('Helvetica')
      .text(`${BRAND_NAME} · Thank you for your order`, leftX, 780, { align: 'center', width: 495 })

    doc.end()
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an invoice PDF for an order.
 * Returns the buffer. Also saves to disk and stores path on the order record.
 */
export async function generateInvoice(orderId: string): Promise<Buffer> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      createdAt: true,
      total: true,
      shippingPrice: true,
      taxPercent: true,
      taxAmount: true,
      deliveryType: true,
      billingName: true,
      billingStreet: true,
      billingCity: true,
      billingZip: true,
      billingCountry: true,
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
          width: true,
          height: true,
          quantity: true,
          priceSnapshot: true,
        },
      },
    },
  })

  if (!order) throw new Error(`Order not found: ${orderId}`)

  const mapped: InvoiceOrder = {
    ...order,
    total: Number(order.total),
    shippingPrice: Number(order.shippingPrice),
    taxPercent: Number(order.taxPercent),
    taxAmount: Number(order.taxAmount),
    items: order.items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      width: Number(i.width),
      height: Number(i.height),
      quantity: i.quantity,
      priceSnapshot: Number(i.priceSnapshot),
    })),
  }

  const buffer = await buildPdf(mapped)

  // Save to disk (overwrites any cached version — ensures updated format)
  fs.mkdirSync(INVOICE_DIR, { recursive: true })
  const filename = `invoice-${orderId.slice(0, 8).toUpperCase()}.pdf`
  const diskPath = path.join(INVOICE_DIR, filename)
  fs.writeFileSync(diskPath, buffer)

  const storagePath = `storage/invoices/${filename}`

  // Store path on order (non-blocking if already set)
  await db.order.update({
    where: { id: orderId },
    data: { invoicePath: storagePath },
  })

  return buffer
}

/**
 * Get invoice buffer — loads from disk if cached, regenerates if missing.
 */
export async function getInvoice(orderId: string): Promise<Buffer> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { invoicePath: true },
  })

  if (order?.invoicePath) {
    const absPath = path.resolve(process.cwd(), order.invoicePath)
    if (fs.existsSync(absPath)) {
      return fs.readFileSync(absPath)
    }
  }

  // Regenerate if not found
  return generateInvoice(orderId)
}
