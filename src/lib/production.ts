import { db } from '@/lib/db'
import { JobStatus } from '@/generated/prisma/client'
import { assertExists } from '@/lib/assert'
import { ValidationError } from '@/lib/errors'

// Valid status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  QUEUED:      ['IN_PROGRESS'],
  IN_PROGRESS: ['DONE', 'FAILED'],
  FAILED:      ['QUEUED'],
  DONE:        [], // terminal — no transitions allowed
}

const jobInclude = {
  orderItem: {
    include: {
      order: true,
      uploadFiles: true,
    },
  },
} as const

export async function createProductionJob(orderItemId: string) {
  return db.productionJob.create({
    data: {
      orderItemId,
      status: 'QUEUED',
    },
    include: jobInclude,
  })
}

export async function getQueue() {
  return db.productionJob.findMany({
    include: jobInclude,
    orderBy: { orderItem: { order: { createdAt: 'asc' } } },
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

  return db.productionJob.update({
    where: { id: jobId },
    data: { status },
    include: jobInclude,
  })
}

export async function assignMachine(jobId: string, machineName: string) {
  return db.productionJob.update({
    where: { id: jobId },
    data: { machine: machineName },
    include: jobInclude,
  })
}
