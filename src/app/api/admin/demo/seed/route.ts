import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { logError } from '@/lib/log'
import { OrderStatus, PaymentStatus, DeliveryType } from '@/generated/prisma/client'

const DEMO_USERS = [
  { id: 'demo_user_alice', email: 'alice@demo.test', name: 'Alice Demo' },
  { id: 'demo_user_bob',   email: 'bob@demo.test',   name: 'Bob Demo'   },
  { id: 'demo_user_carol', email: 'carol@demo.test', name: 'Carol Demo' },
]

interface OrderSpec {
  id: string
  userId: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  deliveryType: DeliveryType
  total: number
  shippingPrice: number
  taxPercent: number
  taxAmount: number
  billingName: string
  billingStreet: string
  billingCity: string
  billingZip: string
  billingCountry: string
  createdAt: Date
  productName: string
  categoryName: string
  qty: number
  price: number
}

const DEMO_ORDERS: OrderSpec[] = [
  // CONFIRMED × 2
  { id: 'demo_ord_001', userId: 'demo_user_alice', status: 'CONFIRMED',      paymentStatus: 'PAID',     deliveryType: 'STANDARD', total: 48.50,  shippingPrice: 5.95,  taxPercent: 20, taxAmount: 9.70,  billingName: 'Alice Demo',  billingStreet: 'Musterstraße 1',  billingCity: 'Vienna', billingZip: '1010', billingCountry: 'AT', createdAt: new Date('2026-03-01'), productName: 'Stickers',          categoryName: 'Stickers',        qty: 100, price: 42.55 },
  { id: 'demo_ord_002', userId: 'demo_user_bob',   status: 'CONFIRMED',      paymentStatus: 'PAID',     deliveryType: 'EXPRESS',  total: 89.00,  shippingPrice: 12.95, taxPercent: 20, taxAmount: 17.80, billingName: 'Bob Demo',    billingStreet: 'Hauptgasse 12',   billingCity: 'Graz',   billingZip: '8010', billingCountry: 'AT', createdAt: new Date('2026-03-02'), productName: 'Textile print',      categoryName: 'Textile print',   qty: 5,   price: 76.05 },
  // UPLOADED × 1
  { id: 'demo_ord_003', userId: 'demo_user_carol', status: 'UPLOADED',       paymentStatus: 'PAID',     deliveryType: 'STANDARD', total: 34.90,  shippingPrice: 5.95,  taxPercent: 20, taxAmount: 6.98,  billingName: 'Carol Demo',  billingStreet: 'Linzer Str. 5',   billingCity: 'Linz',   billingZip: '4020', billingCountry: 'AT', createdAt: new Date('2026-03-03'), productName: 'Vinyl lettering',    categoryName: 'Vinyl plot',      qty: 1,   price: 28.95 },
  // APPROVED × 1
  { id: 'demo_ord_004', userId: 'demo_user_alice', status: 'APPROVED',       paymentStatus: 'PAID',     deliveryType: 'STANDARD', total: 125.00, shippingPrice: 5.95,  taxPercent: 20, taxAmount: 25.00, billingName: 'Alice Demo',  billingStreet: 'Musterstraße 1',  billingCity: 'Vienna', billingZip: '1010', billingCountry: 'AT', createdAt: new Date('2026-03-04'), productName: 'Banners',            categoryName: 'Banners',         qty: 2,   price: 119.05 },
  // IN_PRODUCTION × 2
  { id: 'demo_ord_005', userId: 'demo_user_bob',   status: 'IN_PRODUCTION',  paymentStatus: 'PAID',     deliveryType: 'STANDARD', total: 67.00,  shippingPrice: 5.95,  taxPercent: 20, taxAmount: 13.40, billingName: 'Bob Demo',    billingStreet: 'Hauptgasse 12',   billingCity: 'Graz',   billingZip: '8010', billingCountry: 'AT', createdAt: new Date('2026-03-05'), productName: 'Embroidery patch',   categoryName: 'Embroidery',      qty: 10,  price: 61.05 },
  { id: 'demo_ord_006', userId: 'demo_user_carol', status: 'IN_PRODUCTION',  paymentStatus: 'PAID',     deliveryType: 'EXPRESS',  total: 210.00, shippingPrice: 12.95, taxPercent: 20, taxAmount: 42.00, billingName: 'Carol Demo',  billingStreet: 'Linzer Str. 5',   billingCity: 'Linz',   billingZip: '4020', billingCountry: 'AT', createdAt: new Date('2026-03-06'), productName: 'Large format print', categoryName: 'Large format',    qty: 3,   price: 197.05 },
  // READY × 1
  { id: 'demo_ord_007', userId: 'demo_user_alice', status: 'READY',          paymentStatus: 'PAID',     deliveryType: 'PICKUP',   total: 55.00,  shippingPrice: 0,     taxPercent: 20, taxAmount: 11.00, billingName: 'Alice Demo',  billingStreet: 'Musterstraße 1',  billingCity: 'Vienna', billingZip: '1010', billingCountry: 'AT', createdAt: new Date('2026-03-07'), productName: 'Stickers',          categoryName: 'Stickers',        qty: 250, price: 55.00 },
  // SHIPPED × 2
  { id: 'demo_ord_008', userId: 'demo_user_bob',   status: 'SHIPPED',        paymentStatus: 'PAID',     deliveryType: 'STANDARD', total: 78.50,  shippingPrice: 5.95,  taxPercent: 20, taxAmount: 15.70, billingName: 'Bob Demo',    billingStreet: 'Hauptgasse 12',   billingCity: 'Graz',   billingZip: '8010', billingCountry: 'AT', createdAt: new Date('2026-02-20'), productName: 'Textile print',      categoryName: 'Textile print',   qty: 8,   price: 72.55 },
  { id: 'demo_ord_009', userId: 'demo_user_carol', status: 'SHIPPED',        paymentStatus: 'PAID',     deliveryType: 'EXPRESS',  total: 149.00, shippingPrice: 12.95, taxPercent: 20, taxAmount: 29.80, billingName: 'Carol Demo',  billingStreet: 'Linzer Str. 5',   billingCity: 'Linz',   billingZip: '4020', billingCountry: 'AT', createdAt: new Date('2026-02-22'), productName: 'Vinyl lettering',    categoryName: 'Vinyl plot',      qty: 5,   price: 136.05 },
  // DONE × 4
  { id: 'demo_ord_010', userId: 'demo_user_alice', status: 'DONE',           paymentStatus: 'PAID',     deliveryType: 'STANDARD', total: 92.00,  shippingPrice: 5.95,  taxPercent: 20, taxAmount: 18.40, billingName: 'Alice Demo',  billingStreet: 'Musterstraße 1',  billingCity: 'Vienna', billingZip: '1010', billingCountry: 'AT', createdAt: new Date('2026-02-10'), productName: 'Banners',            categoryName: 'Banners',         qty: 1,   price: 86.05 },
  { id: 'demo_ord_011', userId: 'demo_user_bob',   status: 'DONE',           paymentStatus: 'PAID',     deliveryType: 'PICKUP',   total: 44.00,  shippingPrice: 0,     taxPercent: 20, taxAmount: 8.80,  billingName: 'Bob Demo',    billingStreet: 'Hauptgasse 12',   billingCity: 'Graz',   billingZip: '8010', billingCountry: 'AT', createdAt: new Date('2026-02-12'), productName: 'Embroidery patch',   categoryName: 'Embroidery',      qty: 3,   price: 44.00 },
  { id: 'demo_ord_012', userId: 'demo_user_carol', status: 'DONE',           paymentStatus: 'PAID',     deliveryType: 'STANDARD', total: 188.00, shippingPrice: 5.95,  taxPercent: 20, taxAmount: 37.60, billingName: 'Carol Demo',  billingStreet: 'Linzer Str. 5',   billingCity: 'Linz',   billingZip: '4020', billingCountry: 'AT', createdAt: new Date('2026-02-14'), productName: 'Large format print', categoryName: 'Large format',    qty: 4,   price: 182.05 },
  { id: 'demo_ord_013', userId: 'demo_user_alice', status: 'DONE',           paymentStatus: 'PAID',     deliveryType: 'STANDARD', total: 36.50,  shippingPrice: 5.95,  taxPercent: 20, taxAmount: 7.30,  billingName: 'Alice Demo',  billingStreet: 'Musterstraße 1',  billingCity: 'Vienna', billingZip: '1010', billingCountry: 'AT', createdAt: new Date('2026-02-16'), productName: 'Stickers',          categoryName: 'Stickers',        qty: 50,  price: 30.55 },
  // CANCELLED × 2
  { id: 'demo_ord_014', userId: 'demo_user_bob',   status: 'CANCELLED',      paymentStatus: 'REFUNDED', deliveryType: 'STANDARD', total: 55.00,  shippingPrice: 5.95,  taxPercent: 20, taxAmount: 11.00, billingName: 'Bob Demo',    billingStreet: 'Hauptgasse 12',   billingCity: 'Graz',   billingZip: '8010', billingCountry: 'AT', createdAt: new Date('2026-01-28'), productName: 'Textile print',      categoryName: 'Textile print',   qty: 2,   price: 49.05 },
  { id: 'demo_ord_015', userId: 'demo_user_carol', status: 'CANCELLED',      paymentStatus: 'REFUNDED', deliveryType: 'EXPRESS',  total: 99.00,  shippingPrice: 12.95, taxPercent: 20, taxAmount: 19.80, billingName: 'Carol Demo',  billingStreet: 'Linzer Str. 5',   billingCity: 'Linz',   billingZip: '4020', billingCountry: 'AT', createdAt: new Date('2026-01-30'), productName: 'Vinyl lettering',    categoryName: 'Vinyl plot',      qty: 3,   price: 86.05 },
]

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    // Upsert demo users
    for (const u of DEMO_USERS) {
      await db.user.upsert({
        where:  { email: u.email },
        update: { name: u.name },
        create: { id: u.id, email: u.email, name: u.name },
      })
    }

    // Resolve actual user IDs (upsert may have matched by email, not id)
    const userMap: Record<string, string> = {}
    for (const u of DEMO_USERS) {
      const row = await db.user.findUnique({ where: { email: u.email }, select: { id: true } })
      if (row) userMap[u.id] = row.id
    }

    // Delete any existing demo orders first (FK-safe order)
    const demoIds = DEMO_ORDERS.map((o) => o.id)
    await db.productionJob.deleteMany({ where: { orderItem: { orderId: { in: demoIds } } } })
    await db.uploadFile.deleteMany({ where: { orderItem: { orderId: { in: demoIds } } } })
    await db.orderItem.deleteMany({ where: { orderId: { in: demoIds } } })
    await db.order.deleteMany({ where: { id: { in: demoIds } } })

    // Create orders + items
    for (const spec of DEMO_ORDERS) {
      const resolvedUserId = userMap[spec.userId] ?? null
      const order = await db.order.create({
        data: {
          id:               spec.id,
          userId:           resolvedUserId,
          status:           spec.status,
          paymentStatus:    spec.paymentStatus,
          deliveryType:     spec.deliveryType,
          total:            spec.total,
          shippingPrice:    spec.shippingPrice,
          taxPercent:       spec.taxPercent,
          taxAmount:        spec.taxAmount,
          expressMultiplier: spec.deliveryType === 'EXPRESS' ? 1.5 : 1.0,
          billingName:      spec.billingName,
          billingStreet:    spec.billingStreet,
          billingCity:      spec.billingCity,
          billingZip:       spec.billingZip,
          billingCountry:   spec.billingCountry,
          createdAt:        spec.createdAt,
        },
      })

      await db.orderItem.create({
        data: {
          orderId:      order.id,
          productName:  spec.productName,
          categoryName: spec.categoryName,
          width:        10,
          height:       10,
          quantity:     spec.qty,
          priceSnapshot: spec.price,
        },
      })
    }

    return NextResponse.json({ users: DEMO_USERS.length, orders: DEMO_ORDERS.length })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/admin/demo/seed' })
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
