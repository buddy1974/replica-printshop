import { NextRequest } from 'next/server'
import { db } from './db'
import { UnauthorizedError } from './errors'

export async function requireAdmin(req: NextRequest): Promise<void> {
  const userId = req.cookies.get('replica_uid')?.value ?? ''
  if (!userId) throw new UnauthorizedError('Not authenticated')
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    throw new UnauthorizedError('Admin access required')
  }
}
