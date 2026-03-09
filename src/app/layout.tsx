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
        <footer className="mt-10 py-5 border-t border-gray-200 text-center text-xs text-gray-400">
          Developed by{' '}
          <a href="https://maxpromo.digital" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 underline underline-offset-2">
            maxpromo.digital
          </a>
        </footer>
      </body>
    </html>
  )
}
