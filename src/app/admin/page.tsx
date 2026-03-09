import Link from 'next/link'
import Container from '@/components/Container'

const links = [
  { href: '/admin/products', label: 'Products', desc: 'Manage product catalogue' },
  { href: '/admin/orders', label: 'Orders', desc: 'View all orders' },
  { href: '/admin/production', label: 'Production', desc: 'Production queue' },
  { href: '/admin/shipping', label: 'Shipping rules', desc: 'Configure shipping prices' },
  { href: '/admin/categories', label: 'Categories', desc: 'Edit category names and descriptions' },
]

export default function AdminPage() {
  return (
    <Container>
      <h1 className="mb-6">Admin</h1>
      <div className="grid gap-3">
        {links.map(({ href, label, desc }) => (
          <Link key={href} href={href} className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors">
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </Link>
        ))}
      </div>
    </Container>
  )
}
