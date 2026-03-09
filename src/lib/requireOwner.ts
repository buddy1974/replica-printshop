import { NextRequest } from 'next/server'
import { db } from './db'
import { UnauthorizedError } from './errors'

/**
 * Verifies that the cookie session user is either the resource owner or an admin.
 * Returns the authenticated userId.
 * Throws UnauthorizedError if not authenticated or not allowed.
 */
export async function requireOwner(req: NextRequest, ownerId: string | null): Promise<string> {
  const userId = req.cookies.get('replica_uid')?.value ?? ''
  if (!userId) throw new UnauthorizedError('Not authenticated')

  // Owner match — always allowed
  if (ownerId && userId === ownerId) return userId

  // No owner set (guest order) — allow the requester
  if (!ownerId) return userId

  // Mismatch — check if admin
  const user = await db.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (user?.isAdmin) return userId

  throw new UnauthorizedError('Access denied')
}
