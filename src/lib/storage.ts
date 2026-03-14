import fs from 'fs'
import path from 'path'
import { ValidationError } from '@/lib/errors'

const STORAGE_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'storage', 'uploads')

const PENDING_DIR = path.resolve(process.cwd(), 'storage', 'pending')

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

/** Save a pre-checkout pending file. Returns buffer always; storagePath is null when disk write
 *  fails (e.g. read-only filesystem on Vercel). Dimension reading works regardless. */
export async function savePendingFile(
  file: File,
  uploadId: string,
): Promise<{ storagePath: string | null; size: number; mime: string; buffer: Buffer }> {
  validateFileInput(file)

  // Read into memory first — always works, needed for dimension extraction
  const buffer = Buffer.from(await file.arrayBuffer())
  const size   = buffer.length
  const mime   = file.type || 'application/octet-stream'

  const sanitizedId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '')
  const rawName = path.basename(file.name)
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '_')
  if (!safeName || safeName === '.' || safeName === '..') {
    throw new ValidationError('Invalid filename')
  }

  const dir = path.resolve(PENDING_DIR, sanitizedId)
  const diskPath = path.resolve(dir, safeName)

  if (!diskPath.startsWith(PENDING_DIR + path.sep)) {
    throw new ValidationError('Invalid file path')
  }

  // Attempt disk write — non-fatal (read-only on serverless platforms)
  let storagePath: string | null = null
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(diskPath, buffer)
    storagePath = `storage/pending/${sanitizedId}/${safeName}`
  } catch (diskErr) {
    console.warn('[storage] savePendingFile: disk write failed (non-fatal):', diskErr instanceof Error ? diskErr.message : diskErr)
    // storagePath stays null — dimensions still extracted from buffer
  }

  return { storagePath, size, mime, buffer }
}

/** Read pixel dimensions from a PNG or JPEG buffer. Returns null for PDF/SVG. */
export function readImageDimensions(buf: Buffer, mime: string): { widthPx: number; heightPx: number } | null {
  if (mime === 'image/png') return readPngDims(buf)
  if (mime === 'image/jpeg') return readJpegDims(buf)
  return null
}

function readPngDims(buf: Buffer): { widthPx: number; heightPx: number } | null {
  if (buf.length < 24) return null
  const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < 8; i++) { if (buf[i] !== PNG_SIG[i]) return null }
  return { widthPx: buf.readUInt32BE(16), heightPx: buf.readUInt32BE(20) }
}

function readJpegDims(buf: Buffer): { widthPx: number; heightPx: number } | null {
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return null
  let i = 2
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xFF) break
    const marker = buf[i + 1]
    if (marker === 0xD9 || marker === 0xDA) break
    const segLen = buf.readUInt16BE(i + 2)
    const isSOF = (marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
                  (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)
    if (isSOF && i + 9 < buf.length) {
      return { widthPx: buf.readUInt16BE(i + 7), heightPx: buf.readUInt16BE(i + 5) }
    }
    i += 2 + segLen
  }
  return null
}

export function deleteFile(storagePath: string): void {
  const absPath = getAbsPath(storagePath)
  if (fs.existsSync(absPath)) {
    fs.unlinkSync(absPath)
  }
}
