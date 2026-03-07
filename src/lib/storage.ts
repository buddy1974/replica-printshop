import fs from 'fs'
import path from 'path'
import { ValidationError } from '@/lib/errors'

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'uploads')
const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

const ALLOWED_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
}

export function validateFileInput(file: File) {
  if (file.size > MAX_SIZE_BYTES) {
    throw new ValidationError(`File too large. Maximum size is 100 MB.`)
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
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(diskPath, buffer)

  const storagePath = `storage/uploads/${orderItemId}/${safeName}`
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
