import fs from 'fs'
import path from 'path'
import { ValidationError } from '@/lib/errors'

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'uploads')
// Step 305 — configurable via MAX_UPLOAD_SIZE env (bytes), default 100 MB
const MAX_SIZE_BYTES = process.env.MAX_UPLOAD_SIZE
  ? parseInt(process.env.MAX_UPLOAD_SIZE, 10)
  : 100 * 1024 * 1024

const ALLOWED_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
}

export function validateFileInput(file: File) {
  if (file.size > MAX_SIZE_BYTES) {
    const mb = Math.round(MAX_SIZE_BYTES / 1024 / 1024)
    throw new ValidationError(`File too large. Maximum size is ${mb} MB.`)
  }
  if (!ALLOWED_MIMES[file.type]) {
    throw new ValidationError(
      `Unsupported file type "${file.type}". Allowed: ${Object.keys(ALLOWED_MIMES).join(', ')}`
    )
  }
}

export async function saveFile(
  file: File,
  orderItemId: string
): Promise<{ storagePath: string; size: number; mime: string }> {
  validateFileInput(file)

  const safeName = path.basename(file.name)
  const dir = path.join(STORAGE_DIR, orderItemId)
  fs.mkdirSync(dir, { recursive: true })

  const diskPath = path.join(dir, safeName)
  const storagePath = `storage/uploads/${orderItemId}/${safeName}`

  // Step 274 — clean up partial file on write failure
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(diskPath, buffer)
  } catch (err) {
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath)
    throw err
  }

  return { storagePath, size: file.size, mime: file.type }
}

export function getAbsPath(storagePath: string): string {
  return path.join(process.cwd(), storagePath)
}

export function deleteFile(storagePath: string): void {
  const absPath = getAbsPath(storagePath)
  if (fs.existsSync(absPath)) {
    fs.unlinkSync(absPath)
  }
}
