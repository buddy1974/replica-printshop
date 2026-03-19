import { isDemoMode } from '@/lib/demo'

export default async function DemoBanner() {
  const demo = await isDemoMode()
  if (!demo) return null
  return (
    <div className="bg-yellow-400 text-yellow-900 text-xs font-semibold text-center py-1.5 px-4">
      DEMO MODE — data resets periodically
    </div>
  )
}
