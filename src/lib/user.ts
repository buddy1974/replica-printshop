import { db } from '@/lib/db'

const SUPERADMIN_EMAIL = 'djstranger2000@gmail.com'

export async function getOrCreateUserByEmail(email: string, name?: string) {
  const isSuperadmin = email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    // Ensure superadmin role is always up-to-date on login
    if (isSuperadmin && existing.role !== 'SUPERADMIN') {
      return db.user.update({ where: { id: existing.id }, data: { role: 'SUPERADMIN' } })
    }
    return existing
  }

  return db.user.create({
    data: {
      email,
      name: name ?? null,
      role: isSuperadmin ? 'SUPERADMIN' : 'CUSTOMER',
    },
  })
}
