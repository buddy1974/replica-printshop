import AdminHeader from '@/components/AdminHeader'
import AdminGuard from '@/components/AdminGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminHeader />
      <AdminGuard>
        <main>{children}</main>
      </AdminGuard>
    </>
  )
}
