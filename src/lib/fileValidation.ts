// File validation engine — parses image/PDF binary headers without external dependencies.
// Returns structured metadata + print-specific warnings and recommendations.

export interface ValidationResult {
  width: number          // px for images, mm for PDF (0 = unknown)
  height: number         // px for images, mm for PDF (0 = unknown)
  dpi: number | null     // null = could not determine
  format: string
  sizeMB: number
  ratio: string          // e.g. "16:9" or "1.78:1" for unusual ratios
  warnings: string[]
  recommendations: string[]
}

// ---------------------------------------------------------------------------
// PNG — parse IHDR + optional pHYs chunk
// ---------------------------------------------------------------------------

function parsePNG(buf: Buffer): { width: number; height: number; dpi: number | null } {
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== SIG[i]) throw new Error('Not a valid PNG')
  }
  if (buf.length < 24) throw new Error('PNG too small to parse')

  // IHDR chunk always starts at offset 8: [length(4)][type(4)][data...]
  // width at 16, height at 20
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)

  // Scan for pHYs chunk (pixels per unit metadata)
  let dpi: number | null = null
  let offset = 8

  while (offset + 12 <= buf.length) {
    const chunkLen = buf.readUInt32BE(offset)
    const chunkType = buf.slice(offset + 4, offset + 8).toString('ascii')

    if (chunkType === 'IDAT' || chunkType === 'IEND') break

    if (chunkType === 'pHYs' && chunkLen >= 9) {
      // pHYs data: pixelsPerUnitX(4) pixelsPerUnitY(4) unitType(1)
      // unitType 1 = metre → convert to DPI: ppu × 0.0254
      const pixelsPerUnitX = buf.readUInt32BE(offset + 8)
      const unitType = buf.readUInt8(offset + 16)
      if (unitType === 1 && pixelsPerUnitX > 0) {
        dpi = Math.round(pixelsPerUnitX * 0.0254)
      }
      break
    }

    // Each chunk: 4-byte length + 4-byte type + data + 4-byte CRC
    offset += 12 + chunkLen
  }

  return { width, height, dpi }
}

// ---------------------------------------------------------------------------
// JPEG — scan markers for SOF (dimensions) and APP0/JFIF (DPI)
// ---------------------------------------------------------------------------

function parseJPEG(buf: Buffer): { width: number; height: number; dpi: number | null } {
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) throw new Error('Not a valid JPEG')

  let width = 0
  let height = 0
  let dpi: number | null = null
  let offset = 2

  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xFF) break

    const marker = buf[offset + 1]
    if (marker === 0xDA) break // SOS — scan data begins, stop

    const segLen = buf.readUInt16BE(offset + 2) // includes the 2-byte length field

    // SOF markers (Start Of Frame) — carry image dimensions
    const isSOF =
      (marker >= 0xC0 && marker <= 0xC3) ||
      (marker >= 0xC5 && marker <= 0xC7) ||
      (marker >= 0xC9 && marker <= 0xCB) ||
      (marker >= 0xCD && marker <= 0xCF)

    if (isSOF && offset + 9 <= buf.length) {
      // SOF data: precision(1) height(2) width(2) components(1)...
      height = buf.readUInt16BE(offset + 5)
      width = buf.readUInt16BE(offset + 7)
    }

    // APP0 (0xE0) — JFIF header, contains DPI
    if (marker === 0xE0 && segLen >= 14 && offset + 14 <= buf.length) {
      const id = buf.slice(offset + 4, offset + 9).toString('ascii')
      if (id === 'JFIF\0') {
        const units = buf[offset + 11]
        const densityX = buf.readUInt16BE(offset + 12)
        if (densityX > 0) {
          if (units === 1) dpi = densityX               // pixels/inch
          else if (units === 2) dpi = Math.round(densityX * 2.54) // pixels/cm → DPI
        }
      }
    }

    offset += 2 + segLen
  }

  return { width, height, dpi }
}

// ---------------------------------------------------------------------------
// GIF — fixed header: dimensions at bytes 6–9 (little-endian uint16)
// ---------------------------------------------------------------------------

function parseGIF(buf: Buffer): { width: number; height: number } {
  if (buf.length < 10) throw new Error('GIF too small')
  const sig = buf.slice(0, 6).toString('ascii')
  if (!sig.startsWith('GIF')) throw new Error('Not a valid GIF')
  return {
    width: buf.readUInt16LE(6),
    height: buf.readUInt16LE(8),
  }
}

// ---------------------------------------------------------------------------
// WebP — handle VP8X (extended), VP8 (lossy), VP8L (lossless)
// ---------------------------------------------------------------------------

function parseWebP(buf: Buffer): { width: number; height: number } {
  if (buf.length < 12) throw new Error('WebP too small')
  if (buf.slice(0, 4).toString('ascii') !== 'RIFF') throw new Error('Not a valid WebP (no RIFF)')
  if (buf.slice(8, 12).toString('ascii') !== 'WEBP') throw new Error('Not a valid WebP')

  if (buf.length < 16) return { width: 0, height: 0 }
  const chunkType = buf.slice(12, 16).toString('ascii')

  if (chunkType === 'VP8X' && buf.length >= 30) {
    // VP8X: flags(4) canvasWidth-1(3 LE) canvasHeight-1(3 LE) at offsets 20, 24, 27
    const w = buf.readUIntLE(24, 3) + 1
    const h = buf.readUIntLE(27, 3) + 1
    return { width: w, height: h }
  }

  if (chunkType === 'VP8 ' && buf.length >= 30) {
    // VP8 bitstream tag at offset 20; look for sync bytes 0x9D 0x01 0x2A at offset 23
    if (buf[23] === 0x9D && buf[24] === 0x01 && buf[25] === 0x2A) {
      const w = buf.readUInt16LE(26) & 0x3FFF
      const h = buf.readUInt16LE(28) & 0x3FFF
      return { width: w, height: h }
    }
  }

  if (chunkType === 'VP8L' && buf.length >= 25) {
    // VP8L: signature byte 0x2F at offset 20, then 28-bit width-1, 28-bit height-1
    if (buf[20] === 0x2F) {
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24]
      const bits = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)
      const w = (bits & 0x3FFF) + 1
      const h = ((bits >> 14) & 0x3FFF) + 1
      return { width: w, height: h }
    }
  }

  return { width: 0, height: 0 }
}

// ---------------------------------------------------------------------------
// PDF — extract MediaBox from the first 100KB of the file
// ---------------------------------------------------------------------------

function parsePDFPageSize(buf: Buffer): { widthPt: number; heightPt: number } | null {
  const text = buf.slice(0, Math.min(buf.length, 102400)).toString('binary')

  // Match /MediaBox [x0 y0 x1 y1] — values may be integers or floats
  const match = text.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/)
  if (!match) return null

  const x0 = parseFloat(match[1])
  const y0 = parseFloat(match[2])
  const x1 = parseFloat(match[3])
  const y1 = parseFloat(match[4])

  return { widthPt: Math.abs(x1 - x0), heightPt: Math.abs(y1 - y0) }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeRatio(w: number, h: number): string {
  if (w === 0 || h === 0) return 'unknown'
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const g = gcd(w, h)
  const rw = w / g
  const rh = h / g
  if (rw > 100 || rh > 100) return `${(w / h).toFixed(2)}:1`
  return `${rw}:${rh}`
}

function dpiWarnings(dpi: number | null): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (dpi === null) {
    warnings.push('DPI metadata not found — verify resolution in your design software')
    return { warnings, recommendations }
  }

  if (dpi < 72) {
    warnings.push(`Very low resolution: ${dpi} DPI — file is unusable for commercial print`)
    recommendations.push('Re-export at 300 DPI (small prints) or 150 DPI (large format) at the intended print size')
  } else if (dpi < 100) {
    warnings.push(`Low resolution: ${dpi} DPI — suitable only for very large prints (3m+) viewed from distance`)
    recommendations.push('For banners use 100–150 DPI minimum; for stickers and small prints use 300 DPI')
  } else if (dpi < 150) {
    warnings.push(`Medium-low resolution: ${dpi} DPI — borderline for large format printing`)
    recommendations.push('Recommended minimum for banners is 150 DPI at final print size')
  } else if (dpi < 300) {
    recommendations.push(`${dpi} DPI is adequate for large format. For close-view prints (stickers, business cards) 300 DPI is preferred`)
  }
  // ≥ 300 DPI — good, no warning

  return { warnings, recommendations }
}

// ---------------------------------------------------------------------------
// Public: validateImage
// ---------------------------------------------------------------------------

export async function validateImage(buf: Buffer, mimeType: string): Promise<ValidationResult> {
  const sizeMB = parseFloat((buf.length / 1024 / 1024).toFixed(2))
  let width = 0
  let height = 0
  let dpi: number | null = null
  let format = 'unknown'
  const extraWarnings: string[] = []
  const extraRecs: string[] = []

  try {
    if (mimeType === 'image/png') {
      format = 'png'
      const m = parsePNG(buf)
      width = m.width
      height = m.height
      dpi = m.dpi
    } else if (mimeType === 'image/jpeg') {
      format = 'jpeg'
      const m = parseJPEG(buf)
      width = m.width
      height = m.height
      dpi = m.dpi
    } else if (mimeType === 'image/gif') {
      format = 'gif'
      const m = parseGIF(buf)
      width = m.width
      height = m.height
      extraWarnings.push('GIF format is not recommended for commercial printing')
      extraRecs.push('Convert to PNG (transparency) or PDF (print workflow) for best results')
    } else if (mimeType === 'image/webp') {
      format = 'webp'
      const m = parseWebP(buf)
      width = m.width
      height = m.height
      extraRecs.push('WebP does not carry DPI metadata — verify resolution in your design software')
    }
  } catch {
    // Parsing failed — return what we have; warnings will note missing data
  }

  if (width > 0 && height > 0 && width < 500 && height < 500) {
    extraWarnings.push(`Image is very small (${width}×${height} px) — likely not suitable for commercial print`)
  }

  if (sizeMB < 0.05) {
    extraWarnings.push('File is very small — ensure this is the full-resolution version')
  }

  if (format === 'png') {
    extraRecs.push('PNG is good for transparency. For print workflows PDF or TIFF are preferred.')
  }

  const { warnings, recommendations } = dpiWarnings(dpi)
  const ratio = computeRatio(width, height)

  return {
    width,
    height,
    dpi,
    format,
    sizeMB,
    ratio,
    warnings: [...warnings, ...extraWarnings],
    recommendations: [...recommendations, ...extraRecs],
  }
}

// ---------------------------------------------------------------------------
// Public: validatePdf
// ---------------------------------------------------------------------------

export async function validatePdf(buf: Buffer): Promise<ValidationResult> {
  const sizeMB = parseFloat((buf.length / 1024 / 1024).toFixed(2))
  const warnings: string[] = []
  const recommendations: string[] = []

  // Basic PDF header check
  if (!buf.slice(0, 5).toString('ascii').startsWith('%PDF')) {
    return {
      width: 0,
      height: 0,
      dpi: null,
      format: 'pdf',
      sizeMB,
      ratio: 'unknown',
      warnings: ['File does not appear to be a valid PDF'],
      recommendations: ['Please upload a valid PDF file with embedded fonts and images'],
    }
  }

  const pageSize = parsePDFPageSize(buf)
  let widthMm = 0
  let heightMm = 0

  if (pageSize) {
    // 1 point = 0.352778 mm
    widthMm = Math.round(pageSize.widthPt * 0.352778)
    heightMm = Math.round(pageSize.heightPt * 0.352778)

    // Flag if dimensions are round-number points (likely no bleed added)
    const noFractional = pageSize.widthPt === Math.round(pageSize.widthPt) &&
                         pageSize.heightPt === Math.round(pageSize.heightPt)
    if (noFractional) {
      recommendations.push('Add 3mm bleed on all sides if not already included — required for professional print')
    }

    recommendations.push(
      `Document size detected: ${widthMm}×${heightMm}mm — verify this matches your intended print size`
    )
  } else {
    warnings.push('Could not read PDF page dimensions — the file may be password-protected or malformed')
    recommendations.push('Open the file in Acrobat or Illustrator to verify page size and bleed')
  }

  // Estimate DPI category from file size (rough heuristic: large PDFs = higher embedded resolution)
  let dpi: number | null = null
  if (sizeMB > 5) dpi = 300
  else if (sizeMB > 1) dpi = 200
  else if (sizeMB > 0.3) dpi = 150
  else {
    warnings.push('PDF file is very small — embedded images may be low resolution')
    recommendations.push('Ensure all placed images are at least 150 DPI (large format) or 300 DPI (small prints) at final size')
  }

  recommendations.push('Ensure all fonts are embedded or outlined, and color mode is CMYK for print')

  const ratio = computeRatio(widthMm, heightMm)

  return {
    width: widthMm,
    height: heightMm,
    dpi,
    format: 'pdf',
    sizeMB,
    ratio,
    warnings,
    recommendations,
  }
}
