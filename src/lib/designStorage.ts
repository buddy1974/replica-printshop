// Steps 354, 359 — design preview storage helpers

import fs from 'fs'
import path from 'path'

const DESIGNS_DIR = path.resolve(process.cwd(), 'storage', 'designs')

function ensureDir() {
  fs.mkdirSync(DESIGNS_DIR, { recursive: true })
}

/**
 * Save a base64 data URL (PNG) to storage/designs/{id}.png.
 * Returns the storage path string, or null if the data URL is invalid.
 */
export function saveDesignPreview(id: string, dataUrl: string): string | null {
  if (!dataUrl.startsWith('data:image/')) return null
  const base64 = dataUrl.split(',')[1]
  if (!base64) return null

  ensureDir()
  const filename = `${id}.png`
  const diskPath = path.resolve(DESIGNS_DIR, filename)

  // Guard against path traversal (id should be a CUID)
  if (!diskPath.startsWith(DESIGNS_DIR + path.sep) && diskPath !== path.resolve(DESIGNS_DIR, filename)) {
    return null
  }

  try {
    fs.writeFileSync(diskPath, Buffer.from(base64, 'base64'))
    return `storage/designs/${filename}`
  } catch {
    return null
  }
}

/**
 * Return the absolute path to a design preview file, or null if not found.
 */
export function getDesignPreviewPath(id: string): string | null {
  const filename = `${id}.png`
  const diskPath = path.resolve(DESIGNS_DIR, filename)
  if (!diskPath.startsWith(DESIGNS_DIR + path.sep) && diskPath !== path.resolve(DESIGNS_DIR, filename)) return null
  return fs.existsSync(diskPath) ? diskPath : null
}

/**
 * Step 359 — delete design previews older than maxAgeDays (default 7).
 * Returns the number of files deleted.
 */
export function cleanOldDesignPreviews(maxAgeDays = 7): number {
  if (!fs.existsSync(DESIGNS_DIR)) return 0
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  let deleted = 0
  for (const file of fs.readdirSync(DESIGNS_DIR)) {
    const full = path.join(DESIGNS_DIR, file)
    try {
      const stat = fs.statSync(full)
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(full)
        deleted++
      }
    } catch {
      // ignore errors per file
    }
  }
  return deleted
}
