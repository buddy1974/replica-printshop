import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { AppError } from '@/lib/errors'
import { orderCreated } from '@/mailTemplates/orderCreated'
import { paymentSuccess } from '@/mailTemplates/paymentSuccess'
import { uploadNeeded } from '@/mailTemplates/uploadNeeded'
import { fileFixRequest } from '@/mailTemplates/fileFixRequest'
import { fileApproved } from '@/mailTemplates/fileApproved'
import { approved } from '@/mailTemplates/approved'
import { orderReady } from '@/mailTemplates/orderReady'
import { done } from '@/mailTemplates/done'

const MOCK_ORDER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const MOCK_ITEM_ID  = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://printshop.com'

const MOCK_ITEMS = [
  { productName: 'Roll-Up Banner 85×200', quantity: 2, width: 85, height: 200, priceSnapshot: 49.90 },
  { productName: 'Outdoor Sticker A4',    quantity: 10, width: 21, height: 29.7, priceSnapshot: 3.50 },
]

function renderTemplate(template: string): { subject: string; html: string } {
  switch (template) {
    case 'orderCreated':
      return orderCreated({ orderId: MOCK_ORDER_ID, items: MOCK_ITEMS, total: 134.80, deliveryType: 'STANDARD' })
    case 'paymentSuccess':
      return paymentSuccess({ orderId: MOCK_ORDER_ID, items: MOCK_ITEMS, total: 134.80, deliveryType: 'EXPRESS' })
    case 'uploadNeeded':
      return uploadNeeded(MOCK_ORDER_ID, APP_URL)
    case 'fileFixRequest':
      return fileFixRequest(MOCK_ORDER_ID, 'banner-design-v2.pdf', 'NEEDS_FIX', MOCK_ITEM_ID, APP_URL, 'Please increase the bleed to at least 3 mm on all sides.')
    case 'fileRejected':
      return fileFixRequest(MOCK_ORDER_ID, 'sticker-artwork.ai', 'REJECTED', MOCK_ITEM_ID, APP_URL)
    case 'fileApproved':
      return fileApproved(MOCK_ORDER_ID, 'banner-design-v2.pdf')
    case 'approved':
      return approved(MOCK_ORDER_ID)
    case 'orderReady':
      return orderReady(MOCK_ORDER_ID)
    case 'done':
      return done(MOCK_ORDER_ID)
    default:
      throw new AppError(`Unknown template: ${template}`, 400)
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const template = req.nextUrl.searchParams.get('template') ?? ''
    if (!template) {
      return NextResponse.json({ error: 'Missing template param' }, { status: 400 })
    }
    const result = renderTemplate(template)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
