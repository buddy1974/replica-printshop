import AdminSidebar from './AdminSidebar'
import AdminGuard from '@/components/AdminGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </AdminGuard>
  )
}
