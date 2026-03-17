import Link from 'next/link'
import { redirect } from 'next/navigation'
import Container from '@/components/Container'

// Tax rates are managed in the dedicated /admin/tax page.
// This page provides a settings-section entry point.

export default function SettingsTaxPage() {
  // Redirect immediately to the tax management page
  redirect('/admin/tax')
  // Return kept to satisfy TypeScript (redirect throws internally)
  return (
    <Container>
      <Link href="/admin/tax">Go to Tax / VAT settings →</Link>
    </Container>
  )
}
