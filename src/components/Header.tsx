import Link from 'next/link'

const links = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/admin', label: 'Admin' },
  { href: '/login', label: 'Login' },
]

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 flex items-center gap-6 h-14">
        <span className="font-bold text-sm tracking-wide uppercase">printshop</span>
        <nav className="flex gap-4 text-sm">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="text-gray-600 hover:text-gray-900 transition-colors">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
