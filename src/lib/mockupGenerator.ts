import { createCanvas, loadImage } from 'canvas'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { getAbsPath } from '@/lib/storage'

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'mockups', 'generated')
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export async function generateMockup(orderItemId: string, uploadPath: string): Promise<string> {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d')

  // 1. Load OrderItem
  const orderItem = await db.orderItem.findUnique({ where: { id: orderItemId } })
  if (!orderItem) throw new Error(`OrderItem not found: ${orderItemId}`)

  // 2. Load Product
  const product = await db.product.findFirst({
    where: { name: orderItem.productName },
    select: { id: true },
  })

  // 3. Load MockupTemplate
  const template = product
    ? await db.mockupTemplate.findFirst({ where: { productId: product.id } })
    : null

  // 4. Draw template background
  if (template?.imageUrl) {
    try {
      const templateImage = await loadImage(template.imageUrl)
      ctx.drawImage(templateImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    } catch {
      // Template image not loadable — draw neutral background
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }
  } else {
    // No template — draw neutral background
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  // 5. Determine print area (from template or full canvas)
  const printX = template?.printAreaX ?? 0
  const printY = template?.printAreaY ?? 0
  const printW = template?.printAreaWidth ?? CANVAS_WIDTH
  const printH = template?.printAreaHeight ?? CANVAS_HEIGHT

  // 6. Draw uploaded image inside print area
  const absUploadPath = path.isAbsolute(uploadPath)
    ? uploadPath
    : getAbsPath(uploadPath)

  if (fs.existsSync(absUploadPath)) {
    try {
      const uploadImage = await loadImage(absUploadPath)
      ctx.drawImage(uploadImage, printX, printY, printW, printH)
    } catch {
      // Uploaded file not a valid image — draw placeholder
      drawPlaceholder(ctx, printX, printY, printW, printH)
    }
  } else {
    // File not on disk (e.g. not a real upload yet) — draw placeholder
    drawPlaceholder(ctx, printX, printY, printW, printH)
  }

  // 7. Draw print area border
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1
  ctx.strokeRect(printX, printY, printW, printH)

  // 8. Save PNG
  const outPath = path.join(OUTPUT_DIR, `${orderItemId}.png`)
  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(outPath, buffer)

  // 9. Return public URL
  return `/mockups/generated/${orderItemId}.png`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawPlaceholder(ctx: any, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#e5e7eb'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#9ca3af'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Your artwork', x + w / 2, y + h / 2)
}
