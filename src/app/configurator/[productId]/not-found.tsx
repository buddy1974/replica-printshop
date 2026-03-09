import Link from 'next/link'
import Container from '@/components/Container'

export default function NotFound() {
  return (
    <Container>
      <h1 className="mb-2">Product not found</h1>
      <p className="text-sm text-gray-500 mb-4">This product does not exist or is no longer available.</p>
      <Link href="/shop" className="text-sm text-gray-700 underline hover:text-gray-900">← Back to shop</Link>
    </Container>
  )
}
