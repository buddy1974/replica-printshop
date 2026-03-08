import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'printshop',
  description: 'Custom printing, fast.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Header />
        <main>{children}</main>
        <footer
          style={{
            marginTop: 40,
            padding: 20,
            textAlign: 'center',
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          Developed by www.maxpromo.digital
        </footer>
      </body>
    </html>
  )
}
