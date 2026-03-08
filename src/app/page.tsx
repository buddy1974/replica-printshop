import Link from 'next/link'
import Container from '@/components/Container'
import { db } from '@/lib/db'

export default async function Home() {
  try {
    await db.$queryRaw`SELECT 1`
  } catch (e) {
    console.error('[home] DB connection failed:', e)
    return (
      <Container>
        <p className="text-red-600 text-sm">DB error — check server logs.</p>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex flex-col gap-4">
        <h1>printshop</h1>
        <p className="text-gray-600 text-sm">Custom printing, delivered fast.</p>
        <div>
          <Link href="/shop" className="inline-flex items-center rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            Browse shop
          </Link>
        </div>
      </div>
    </Container>
  )
}
