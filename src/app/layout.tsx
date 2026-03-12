import type { Metadata, Viewport } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FloatingChat from '@/components/FloatingChat'
import { BRANDING } from '@/config/branding'
import { CartProvider } from '@/context/CartContext'
import CartDrawer from '@/components/CartDrawer'

const SITE_DESCRIPTION = 'Professional print, textile, banners and advertising technology. Fast turnaround, in-house production.'

export const metadata: Metadata = {
  metadataBase: new URL('https://replica.print'),
  title: {
    default: BRANDING.name,
    template: `%s | ${BRANDING.name}`,
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    siteName: BRANDING.name,
    locale: 'en_US',
    type: 'website',
    description: SITE_DESCRIPTION,
    images: [{ url: '/frontpage-hero.png', width: 1200, alt: BRANDING.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRANDING.name,
    description: SITE_DESCRIPTION,
    images: ['/frontpage-hero.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#dc2626',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <FloatingChat />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  )
}
