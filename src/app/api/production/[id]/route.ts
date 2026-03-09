import { NextRequest, NextResponse } from 'next/server'
import { JobStatus } from '@/generated/prisma/client'
import { updateJobStatus, assignMachine } from '@/lib/production'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'

interface Params {
  params: { id: string }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)
    const { id } = params
    const body = await req.json() as { status?: JobStatus; machine?: string }

    if (!body.status && !body.machine) {
      return NextResponse.json({ error: 'Provide status or machine' }, { status: 400 })
    }

    let job

    if (body.status) {
      job = await updateJobStatus(id, body.status)
    }

    if (body.machine) {
      job = await assignMachine(id, body.machine)
    }

    return NextResponse.json(job)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
