import { db } from '@/lib/db'

export async function getOrCreateUserByEmail(email: string, name?: string) {
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return existing

  return db.user.create({
    data: { email, name: name ?? null },
  })
}
