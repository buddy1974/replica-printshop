import { getSetting } from '@/lib/settings/settingsService'

export async function isDemoMode(): Promise<boolean> {
  const val = await getSetting('demo.enabled')
  return val === 'true'
}

export async function getSnapshotMeta(): Promise<{ date: string; counts: object } | null> {
  const date = await getSetting('demo.snapshot.date')
  const countsRaw = await getSetting('demo.snapshot.counts')
  if (!date) return null
  try {
    const counts = JSON.parse(countsRaw) as object
    return { date, counts }
  } catch {
    return { date, counts: {} }
  }
}
