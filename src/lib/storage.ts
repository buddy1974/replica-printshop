import fs from 'fs'
import path from 'path'
import { ValidationError } from '@/lib/errors'

const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'uploads')

// Step 323 — max 50 MB (configurable via MAX_UPLOAD_SIZE env)
const MAX_SIZE_BYTES = process.env.MAX_UPLOAD_SIZE
  ? parseInt(process.env.MAX_UPLOAD_SIZE, 10)
  : 50 * 1024 * 1024

// Step 323 — allowed types: pdf, png, jpg, jpeg, svg only (no tiff)
const ALLOWED_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
  'image/svg+xml': 'svg',
}

export function validateFileInput(file: File) {
  if (file.size > MAX_SIZE_BYTES) {
    const mb = Math.round(MAX_SIZE_BYTES / 1024 / 1024)
    throw new ValidationError(`File too large. Maximum size is ${mb} MB.`)
  }
  if (!ALLOWED_MIMES[file.type]) {
    throw new ValidationError('Unsupported file type. Allowed: PDF, PNG, JPG, SVG.')
  }
}

export async function saveFile(
  file: File,
  orderItemId: string
): Promise<{ storagePath: string; size: number; mime: string }> {
  validateFileInput(file)

  // Step 329 — sanitize orderItemId: only alphanumeric + hyphens (CUID-safe)
  if (!/^[a-z0-9]+$/i.test(orderItemId)) {
    throw new ValidationError('Invalid order item ID')
  }

  // Step 329 — sanitize filename: strip path chars, keep safe chars only
  const rawName = path.basename(file.name)
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '_')
  if (!safeName || safeName === '.' || safeName === '..') {
    throw new ValidationError('Invalid filename')
  }

  const dir = path.resolve(STORAGE_DIR, orderItemId)
  const diskPath = path.resolve(dir, safeName)

  // Step 329 — ensure resolved path is within STORAGE_DIR
  if (!diskPath.startsWith(STORAGE_DIR + path.sep)) {
    throw new ValidationError('Invalid file path')
  }

  fs.mkdirSync(dir, { recursive: true })

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
  const abs = path.resolve(process.cwd(), storagePath)
  // Step 329 — ensure path stays within cwd
  if (!abs.startsWith(path.resolve(process.cwd()))) {
    throw new ValidationError('Invalid storage path')
  }
  return abs
}

export function deleteFile(storagePath: string): void {
  const absPath = getAbsPath(storagePath)
  if (fs.existsSync(absPath)) {
    fs.unlinkSync(absPath)
  }
}
