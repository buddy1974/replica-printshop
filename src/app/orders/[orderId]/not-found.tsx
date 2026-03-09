import Link from 'next/link'
import Container from '@/components/Container'

export default function NotFound() {
  return (
    <Container>
      <h1 className="mb-2">Order not found</h1>
      <p className="text-sm text-gray-500 mb-4">This order does not exist or you do not have access to it.</p>
      <Link href="/orders" className="text-sm text-gray-700 underline hover:text-gray-900">← Back to orders</Link>
    </Container>
  )
}
