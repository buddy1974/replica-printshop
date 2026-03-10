import Link from 'next/link'
import Container from '@/components/Container'

export default function NotFound() {
  return (
    <Container>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6 py-16">
        <div className="text-7xl font-bold text-gray-100 select-none">404</div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
          <p className="text-sm text-gray-500 max-w-sm">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            Go to shop →
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
          >
            Homepage
          </Link>
        </div>
      </div>
    </Container>
  )
}
