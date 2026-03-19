import type { Metadata, Viewport } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FloatingChat from '@/components/FloatingChat'
import { CartProvider } from '@/context/CartContext'
import { LocaleProvider } from '@/context/LocaleContext'
import { BrandingProvider, type BrandingData } from '@/context/BrandingContext'
import { getSetting } from '@/lib/settings/settingsService'
import CartDrawer from '@/components/CartDrawer'
import DemoBanner from '@/components/DemoBanner'

export const revalidate = 300

const SITE_DESCRIPTION = 'Professional print, textile, banners and advertising technology. Fast turnaround, in-house production.'

export async function generateMetadata(): Promise<Metadata> {
  const [companyName, faviconUrl] = await Promise.all([
    getSetting('company.name'),
    getSetting('branding.faviconUrl'),
  ])
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://replica.print'),
    title: {
      default: companyName,
      template: `%s | ${companyName}`,
    },
    description: SITE_DESCRIPTION,
    icons: {
      icon: faviconUrl || '/favicon.svg',
    },
    openGraph: {
      siteName: companyName,
      locale: 'en_US',
      type: 'website',
      description: SITE_DESCRIPTION,
      images: [{ url: '/frontpage-hero.png', width: 1200, alt: companyName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: companyName,
      description: SITE_DESCRIPTION,
      images: ['/frontpage-hero.png'],
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#dc2626',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [companyName, logoUrl, faviconUrl, footerText, primaryColor] = await Promise.all([
    getSetting('company.name'),
    getSetting('branding.logoUrl'),
    getSetting('branding.faviconUrl'),
    getSetting('branding.footerText'),
    getSetting('branding.primaryColor'),
  ])

  const branding: BrandingData = { companyName, logoUrl, faviconUrl, footerText, primaryColor }

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <BrandingProvider initial={branding}>
          <LocaleProvider>
          <CartProvider>
            <DemoBanner />
            <Header />
            <main>{children}</main>
            <Footer />
            <FloatingChat />
            <CartDrawer />
          </CartProvider>
          </LocaleProvider>
        </BrandingProvider>
      </body>
    </html>
  )
}
