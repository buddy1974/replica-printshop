import type { Metadata, Viewport } from 'next'
import './globals.css'
import Header from '@/components/Header'

const SITE_DESCRIPTION = 'Professional print, textile, banners and advertising technology. Fast turnaround, in-house production.'

export const metadata: Metadata = {
  metadataBase: new URL('https://replica.print'),
  title: {
    default: 'replica printshop',
    template: '%s | printshop',
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    siteName: 'replica printshop',
    locale: 'en_US',
    type: 'website',
    description: SITE_DESCRIPTION,
    images: [{ url: '/frontpage-hero.png', width: 1200, alt: 'replica printshop' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'replica printshop',
    description: SITE_DESCRIPTION,
    images: ['/frontpage-hero.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Header />
        <main>{children}</main>
        <footer className="border-t border-gray-200 bg-white">
          {/* Links row */}
          <div className="max-w-5xl mx-auto px-4 py-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { href: '/shop', label: 'Shop' },
              { href: '/shop/graphic-installation', label: 'Graphic Installation' },
              { href: '/contact', label: 'Contact' },
              { href: '/about', label: 'About' },
              { href: '/shipping', label: 'Shipping' },
              { href: '/payment', label: 'Payment' },
              { href: '/legal', label: 'Legal' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
          {/* Credit row */}
          <div className="border-t border-gray-100 py-5 text-center text-xs text-gray-400">
            Developed by{' '}
            <a
              href="https://maxpromo.digital"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
            >
              maxpromo.digital
            </a>
          </div>
        </footer>
      </body>
    </html>
  )
}
