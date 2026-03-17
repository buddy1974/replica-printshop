// Auto-backup cron endpoint.
// Called daily by Vercel Cron (see vercel.json).
// Protected by CRON_SECRET env var.
import { NextRequest, NextResponse } from 'next/server'
import { backupAll } from '@/lib/backup/backupService'
import { logAction, logError } from '@/lib/log'

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret (set CRON_SECRET in Vercel environment variables)
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const bundle = await backupAll()

    // Log the backup event to audit trail
    await logAction('AUTO_BACKUP', 'system', {
      data: {
        createdAt: bundle.meta.createdAt,
        orders: bundle.meta.counts.orders,
        invoices: bundle.meta.counts.invoices,
        uploads: bundle.meta.counts.uploads,
      },
    })

    return NextResponse.json({
      ok: true,
      createdAt: bundle.meta.createdAt,
      counts: bundle.meta.counts,
    })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/admin/backup/cron' })
    return NextResponse.json({ error: 'Cron backup failed' }, { status: 500 })
  }
}
