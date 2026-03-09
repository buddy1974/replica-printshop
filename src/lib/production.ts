import { db } from '@/lib/db'
import { JobStatus } from '@/generated/prisma/client'
import { assertExists } from '@/lib/assert'
import { ValidationError } from '@/lib/errors'
import { sendProductionStarted, sendDone } from '@/lib/email'
import { logInfo } from '@/lib/logger'
import { assertValidOrderTransition } from '@/lib/orderStatus'

// Step 278 — Valid status transitions (guards against illegal transitions)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  QUEUED:      ['IN_PROGRESS'],
  IN_PROGRESS: ['DONE', 'FAILED'],
  FAILED:      ['QUEUED'],
  DONE:        [], // terminal
  CANCELLED:   [], // terminal
}

const MACHINE_TYPE_MAP: Record<string, string> = {
  DTF:        'DTF',
  ROLL_PRINT: 'MIMAKI',
  PRINT_CUT:  'MIMAKI',
  CUT:        'PLOTTER',
  TEXTILE:    'PRESS',
  MANUAL:     'MANUAL',
}

const jobInclude = {
  orderItem: {
    include: {
      order: { include: { shippingMethod: true } },
    },
  },
} as const

export async function createProductionJob(orderItemId: string) {
  const item = await db.orderItem.findUnique({
    where: { id: orderItemId },
    select: { productionTypeSnapshot: true },
  })
  const machineType = item?.productionTypeSnapshot
    ? (MACHINE_TYPE_MAP[item.productionTypeSnapshot] ?? null)
    : null

  return db.productionJob.create({
    data: {
      orderItemId,
      status: 'QUEUED',
      machineType,
    },
    include: jobInclude,
  })
}

export async function getQueue() {
  return db.productionJob.findMany({
    include: jobInclude,
    orderBy: [
      { machineType: 'asc' },
      { status: 'asc' },
      { createdAt: 'asc' },
    ],
  })
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const job = await db.productionJob.findUnique({ where: { id: jobId }, select: { id: true, status: true } })
  assertExists(job, `ProductionJob not found: ${jobId}`)

  const allowed = ALLOWED_TRANSITIONS[job.status] ?? []
  if (!allowed.includes(status)) {
    throw new ValidationError(
      `Cannot transition job from ${job.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`
    )
  }

  const updated = await db.productionJob.update({
    where: { id: jobId },
    data: { status },
    include: jobInclude,
  })

  const orderId = updated.orderItem.order.id

  if (status === 'IN_PROGRESS') {
    // Step 309 — guard order status transition
    assertValidOrderTransition(updated.orderItem.order.status, 'IN_PRODUCTION')
    const order = await db.order.update({
      where: { id: orderId },
      data: { status: 'IN_PRODUCTION' },
      include: { user: { select: { email: true } } },
    })
    logInfo('Production started', { jobId, orderId }) // step 279
    if (order.user?.email) sendProductionStarted(orderId, order.user.email).catch(() => {})
  } else if (status === 'DONE') {
    const pendingJobs = await db.productionJob.count({
      where: {
        orderItem: { orderId },
        status: { notIn: ['DONE'] },
      },
    })
    if (pendingJobs === 0) {
      // Step 309 — guard order status transition
      assertValidOrderTransition(updated.orderItem.order.status, 'DONE')
      const order = await db.order.update({
        where: { id: orderId },
        data: { status: 'DONE' },
        include: { user: { select: { email: true } } },
      })
      logInfo('Production done — all jobs complete', { jobId, orderId }) // step 279
      if (order.user?.email) sendDone(orderId, order.user.email).catch(() => {})
    }
  }

  return updated
}

export async function assignMachine(jobId: string, machineName: string) {
  return db.productionJob.update({
    where: { id: jobId },
    data: { machine: machineName },
    include: jobInclude,
  })
}
