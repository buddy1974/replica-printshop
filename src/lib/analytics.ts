// Steps 281–290 — Admin analytics
// All queries run in parallel via Promise.all for efficiency.

import { db } from '@/lib/db'

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export interface AnalyticsResult {
  revenue: {
    total: number
    today: number
    month: number
    avg: number
  }
  orders: {
    total: number
    today: number
    month: number
    byDelivery: { STANDARD: number; EXPRESS: number; PICKUP: number }
  }
  production: {
    queued: number
    inProgress: number
    done: number
    failed: number
  }
  uploads: {
    pending: number
    approved: number
    rejected: number
  }
  topProducts: { name: string; count: number }[]
  topCategories: { name: string; count: number }[]
}

export async function getAnalytics(): Promise<AnalyticsResult> {
  const todayStart = startOfDay()
  const monthStart = startOfMonth()

  const [
    revenueAll,
    revenueToday,
    revenueMonth,
    ordersTotal,
    ordersToday,
    ordersMonth,
    ordersByDelivery,
    productionGroups,
    uploadGroups,
    topProductsRaw,
    topCategoriesRaw,
  ] = await Promise.all([
    // Revenue — paid orders only (steps 281, 287)
    db.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { total: true },
      _avg: { total: true },
    }),
    db.order.aggregate({
      where: { paymentStatus: 'PAID', createdAt: { gte: todayStart } },
      _sum: { total: true },
    }),
    db.order.aggregate({
      where: { paymentStatus: 'PAID', createdAt: { gte: monthStart } },
      _sum: { total: true },
    }),

    // Orders (step 282)
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.count({ where: { createdAt: { gte: monthStart } } }),

    // By delivery type (step 288)
    db.order.groupBy({ by: ['deliveryType'], _count: { id: true } }),

    // Production (step 283)
    db.productionJob.groupBy({ by: ['status'], _count: { id: true } }),

    // Uploads (step 284)
    db.uploadFile.groupBy({ by: ['status'], _count: { id: true } }),

    // Top products (step 285)
    db.orderItem.groupBy({
      by: ['productName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),

    // Top categories (step 286)
    db.orderItem.groupBy({
      by: ['categoryName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
      where: { categoryName: { not: null } },
    }),
  ])

  const toNum = (v: unknown) => v != null ? parseFloat(String(v)) : 0

  const deliveryMap = Object.fromEntries(ordersByDelivery.map((r) => [r.deliveryType, r._count.id]))
  const productionMap = Object.fromEntries(productionGroups.map((r) => [r.status, r._count.id]))
  const uploadMap = Object.fromEntries(uploadGroups.map((r) => [r.status, r._count.id]))

  return {
    revenue: {
      total: toNum(revenueAll._sum.total),
      today: toNum(revenueToday._sum.total),
      month: toNum(revenueMonth._sum.total),
      avg: toNum(revenueAll._avg.total),
    },
    orders: {
      total: ordersTotal,
      today: ordersToday,
      month: ordersMonth,
      byDelivery: {
        STANDARD: deliveryMap['STANDARD'] ?? 0,
        EXPRESS: deliveryMap['EXPRESS'] ?? 0,
        PICKUP: deliveryMap['PICKUP'] ?? 0,
      },
    },
    production: {
      queued: productionMap['QUEUED'] ?? 0,
      inProgress: productionMap['IN_PROGRESS'] ?? 0,
      done: productionMap['DONE'] ?? 0,
      failed: productionMap['FAILED'] ?? 0,
    },
    uploads: {
      pending: uploadMap['PENDING'] ?? 0,
      approved: uploadMap['APPROVED'] ?? 0,
      rejected: uploadMap['REJECTED'] ?? 0,
    },
    topProducts: topProductsRaw.map((r) => ({ name: r.productName, count: r._count.id })),
    topCategories: topCategoriesRaw.map((r) => ({ name: r.categoryName ?? '—', count: r._count.id })),
  }
}
