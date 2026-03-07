import Link from 'next/link'
import Container from '@/components/Container'

export default function Home() {
  return (
    <Container>
      <div className="flex flex-col gap-4">
        <h1>replica.printshop</h1>
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
