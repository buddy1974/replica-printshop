import { db } from '@/lib/db'

const SUPERADMIN_EMAIL = 'djstranger2000@gmail.com'

export async function getOrCreateUserByEmail(email: string, name?: string) {
  const isSuperadmin = email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
  console.log('[getOrCreateUserByEmail] email=%s isSuperadmin=%s', email, isSuperadmin)

  try {
    const existing = await db.user.findUnique({ where: { email } })
    console.log('[getOrCreateUserByEmail] existing=%s role=%s', existing?.id ?? 'none', existing?.role ?? 'n/a')

    if (existing) {
      // Ensure superadmin role is always up-to-date on login
      if (isSuperadmin && existing.role !== 'SUPERADMIN') {
        console.log('[getOrCreateUserByEmail] Upgrading to SUPERADMIN id=%s', existing.id)
        return db.user.update({ where: { id: existing.id }, data: { role: 'SUPERADMIN' } })
      }
      return existing
    }

    console.log('[getOrCreateUserByEmail] Creating new user')
    return db.user.create({
      data: {
        email,
        name: name ?? null,
        role: isSuperadmin ? 'SUPERADMIN' : 'CUSTOMER',
      },
    })
  } catch (e) {
    console.error('[getOrCreateUserByEmail] DB ERROR:', e instanceof Error ? e.message : String(e))
    console.error('[getOrCreateUserByEmail] This usually means the migration 20260318000001_add_user_role was not deployed. Run: npx prisma migrate deploy')
    throw e
  }
}
