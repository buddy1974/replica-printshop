// Backup service — reads existing data only. Never modifies records.
// Returns plain JS objects safe for JSON serialisation.

import { db } from '@/lib/db'
import { logError } from '@/lib/log'
import { OrderStatus, PaymentStatus, DeliveryType } from '@/generated/prisma/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackupMeta {
  version: 1
  createdAt: string
  counts: { orders: number; invoices: number; uploads: number }
}

export interface BackupBundle {
  meta: BackupMeta
  orders: object[]
  invoices: object[]
  uploads: object[]
}

// ── Individual exporters ──────────────────────────────────────────────────────

export async function backupOrders(): Promise<object[]> {
  const orders = await db.order.findMany({
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      deliveryType: true,
      total: true,
      shippingPrice: true,
      taxPercent: true,
      taxAmount: true,
      trackingNumber: true,
      stripePaymentIntentId: true,
      invoicePath: true,
      createdAt: true,
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
      user: { select: { id: true, email: true, name: true } },
      items: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          categoryName: true,
          productionTypeSnapshot: true,
          width: true,
          height: true,
          quantity: true,
          priceSnapshot: true,
          designId: true,
          preflightScore: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Serialise Decimal fields to string for safe JSON round-trip
  return orders.map((o) => ({
    ...o,
    total: o.total.toString(),
    shippingPrice: o.shippingPrice.toString(),
    taxPercent: o.taxPercent.toString(),
    taxAmount: o.taxAmount.toString(),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      ...i,
      width: i.width.toString(),
      height: i.height.toString(),
      priceSnapshot: i.priceSnapshot.toString(),
    })),
  }))
}

export async function backupInvoices(): Promise<object[]> {
  const orders = await db.order.findMany({
    where: { NOT: { invoicePath: null } },
    select: {
      id: true,
      invoicePath: true,
      createdAt: true,
      total: true,
      status: true,
      paymentStatus: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return orders.map((o) => ({
    orderId: o.id,
    invoicePath: o.invoicePath,
    createdAt: o.createdAt.toISOString(),
    total: o.total.toString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    customer: o.user?.email ?? null,
  }))
}

export async function backupUploads(): Promise<object[]> {
  const files = await db.uploadFile.findMany({
    select: {
      id: true,
      filename: true,
      mime: true,
      size: true,
      dpi: true,
      widthPx: true,
      heightPx: true,
      status: true,
      uploadType: true,
      filePath: true,
      orderItem: {
        select: {
          id: true,
          productName: true,
          order: { select: { id: true, status: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  return files.map((f) => ({
    id: f.id,
    filename: f.filename,
    mime: f.mime,
    size: f.size?.toString() ?? null,
    dpi: f.dpi,
    widthPx: f.widthPx,
    heightPx: f.heightPx,
    status: f.status,
    uploadType: f.uploadType,
    filePath: f.filePath,
    orderId: f.orderItem?.order?.id ?? null,
    orderStatus: f.orderItem?.order?.status ?? null,
    orderItemId: f.orderItem?.id ?? null,
    productName: f.orderItem?.productName ?? null,
  }))
}

// ── Full bundle ───────────────────────────────────────────────────────────────

export async function backupAll(): Promise<BackupBundle> {
  try {
    const [orders, invoices, uploads] = await Promise.all([
      backupOrders(),
      backupInvoices(),
      backupUploads(),
    ])

    return {
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        counts: {
          orders: orders.length,
          invoices: invoices.length,
          uploads: uploads.length,
        },
      },
      orders,
      invoices,
      uploads,
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    logError(`Backup failed: ${err.message}`, { stack: err.stack, path: 'backupAll' })
    throw err
  }
}

// ── Restore (safe: insert-only, never overwrites) ─────────────────────────────

export interface RestoreResult {
  ordersTotal: number
  ordersRestored: number
  ordersSkipped: number
  errors: string[]
}

/**
 * Restore orders from a backup bundle.
 * Only inserts orders whose ID does not already exist in the DB.
 * Never overwrites existing records.
 */
export async function restoreOrders(orders: object[]): Promise<RestoreResult> {
  const result: RestoreResult = {
    ordersTotal: orders.length,
    ordersRestored: 0,
    ordersSkipped: 0,
    errors: [],
  }

  for (const raw of orders) {
    const o = raw as Record<string, unknown>
    if (!o.id || typeof o.id !== 'string') {
      result.errors.push('Skipped record: missing id')
      result.ordersSkipped++
      continue
    }

    try {
      const exists = await db.order.findUnique({
        where: { id: o.id },
        select: { id: true },
      })

      if (exists) {
        result.ordersSkipped++
        continue
      }

      // Find or create user by email if present
      let userId: string | null = null
      const user = o.user as { id?: string; email?: string } | null
      if (user?.email) {
        const dbUser = await db.user.findUnique({ where: { email: user.email }, select: { id: true } })
        userId = dbUser?.id ?? null
      }

      await db.order.create({
        data: {
          id: o.id as string,
          userId,
          status: ((o.status as string | undefined) ?? 'DONE') as OrderStatus,
          paymentStatus: ((o.paymentStatus as string | undefined) ?? 'PAID') as PaymentStatus,
          deliveryType: ((o.deliveryType as string | undefined) ?? 'STANDARD') as DeliveryType,
          total: Number(o.total ?? 0),
          shippingPrice: Number(o.shippingPrice ?? 0),
          taxPercent: Number(o.taxPercent ?? 0),
          taxAmount: Number(o.taxAmount ?? 0),
          trackingNumber: (o.trackingNumber as string | null) ?? null,
          invoicePath: (o.invoicePath as string | null) ?? null,
          billingName: (o.billingName as string | null) ?? null,
          billingStreet: (o.billingStreet as string | null) ?? null,
          billingCity: (o.billingCity as string | null) ?? null,
          billingZip: (o.billingZip as string | null) ?? null,
          billingCountry: (o.billingCountry as string | null) ?? null,
          shippingName: (o.shippingName as string | null) ?? null,
          shippingStreet: (o.shippingStreet as string | null) ?? null,
          shippingCity: (o.shippingCity as string | null) ?? null,
          shippingZip: (o.shippingZip as string | null) ?? null,
          shippingCountry: (o.shippingCountry as string | null) ?? null,
          createdAt: o.createdAt ? new Date(o.createdAt as string) : new Date(),
          expressMultiplier: 1.5,
        },
      })

      result.ordersRestored++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`Order ${o.id}: ${msg}`)
      result.ordersSkipped++
    }
  }

  return result
}
