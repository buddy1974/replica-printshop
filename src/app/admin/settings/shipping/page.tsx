import { redirect } from 'next/navigation'
import Container from '@/components/Container'
import Link from 'next/link'

// Shipping rules and methods are managed in the dedicated /admin/shipping page.
// This page provides a settings-section entry point.

export default function SettingsShippingPage() {
  redirect('/admin/shipping')
  return (
    <Container>
      <Link href="/admin/shipping">Go to Shipping settings →</Link>
    </Container>
  )
}
