import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import type { ValidationResult } from '@/lib/fileValidation'
import { matchProduct, type MatchResult } from '@/lib/productMatcher'
import { evaluatePrepress, buildPrepressSection } from '@/lib/prepressRules'
import { getSetting } from '@/lib/settings/settingsService'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getProductCatalog(): Promise<string> {
  try {
    const categories = await db.productCategory.findMany({
      select: { name: true, slug: true, description: true },
      orderBy: { sortOrder: 'asc' },
    })
    if (!categories.length) return '(Product catalog loading)'
    return categories
      .map((c) => `- ${c.name} → /shop/${c.slug}${c.description ? ` — ${c.description.slice(0, 100)}` : ''}`)
      .join('\n')
  } catch {
    return '(Product catalog temporarily unavailable)'
  }
}

async function getActiveProducts(): Promise<{ name: string; slug: string }[]> {
  try {
    return await db.product.findMany({
      select: { name: true, slug: true },
      where: { active: true },
      orderBy: { slug: 'asc' },
    })
  } catch {
    return []
  }
}

function buildSystemPrompt(catalog: string, language: string, match: MatchResult | null, prepressSection: string, override = ''): string {
  const langName = language === 'de' ? 'German' : language === 'fr' ? 'French' : 'English'
  const overridePrefix = override.trim() ? `${override.trim()}\n\n` : ''

  return `${overridePrefix}You are Print Expert, the AI assistant for Printshop (printshop.maxpromo.digital).

You are a senior print technician, prepress expert, and sales advisor. You help customers choose the right product, check their files, advise on materials, and guide them through ordering.

## Language
Always respond in ${langName}. Do not switch languages.

## Products in shop
${catalog}

## Print file requirements by product type
- Textile / DTF transfers: min 150 DPI at final size, transparent PNG or PDF preferred, RGB or CMYK
- Banners / Large format (over 50cm): 100–150 DPI at final size, CMYK, add 3cm bleed on all sides
- Stickers / Small prints (under 50cm): 300 DPI, CMYK preferred, vector PDF ideal
- Sublimation mugs: 150 DPI, RGB
- Vehicle graphics / vinyl: vector preferred (AI, EPS, PDF); if raster: 300 DPI for small panels, 150 DPI for large
- Roll-up / display: 150 DPI at final size, CMYK, 3–5cm bleed

## What we offer (only these — do not suggest others)
Textile: DTF transfer, Flex, Flock, Embroidery, Patches — NO DTG, NO screen print, NO textile sublimation
Sublimation: ONLY for mugs and hard goods, never for garments
Vehicle & signage: vehicle graphics (vinyl, window foil, Milchglasfolie, Lochfolie, Lightbox, Plexiglass signs, boat lettering, truck banners, event/wedding graphics, company signs)
Wide format: banners, roll-ups, posters, mesh banners
Stickers & labels, large format print, display systems

## Website navigation
- Shop: /shop  |  Category pages: /shop/[category-slug]
- Account + orders + invoices: /account
- Cart: visible in site header
- Contact: /contact
- Upload file for an order: /upload/[productId]
- Online design editor: /editor/[productId]

## Sales advisory
1. Always suggest the RIGHT product for the customer's use case
2. For outdoor long-term → cast vinyl, weatherproof lamination
3. For short events → economical PVC or mesh
4. For textile → explain DTF vs Flex vs Embroidery differences
5. Upsell lamination for outdoor applications; mention express option for urgent orders

## Response rules
1. Be concise, expert, practical — like a real print technician
2. When recommending a product, include a markdown link: [Product Name](/shop/slug)
3. For file questions: give specific technical feedback (DPI, format, color mode, dimensions)
4. If customer uploads a file/image, analyze it exactly as a prepress technician would — check resolution, color mode, apparent quality, bleed, text size
5. If truly unsure: say "I'll connect you with our technician — please use [Contact](/contact)"
6. NEVER say DTG, screen print, or textile sublimation — they are not offered
7. ALWAYS say "vehicle graphics" — never "car wrap" or "vehicle wrap" or "full wrap"
8. Keep responses focused; use short paragraphs or bullet points${match ? `

## Product recommendation (pre-matched for this request)
Based on the customer message and/or uploaded file, the system identified this product as the best fit:
- **[${match.productName}](${match.link})** — ${match.reason}

Lead your answer toward this product. Include the markdown link in your response. If the customer's actual need turns out to be different, recommend the correct product instead.` : ''}${prepressSection}`
}

type Lang = 'user' | 'assistant'
interface ChatMessage { role: Lang; content: string }
interface FileData {
  name: string
  type: string
  size: number
  base64?: string
  validation?: ValidationResult
}

function buildValidationContext(file: FileData): string {
  const v = file.validation
  if (!v) return ''

  const lines: string[] = [
    `[Technical file report: ${file.name}]`,
    `Format: ${v.format.toUpperCase()}  |  Size: ${v.sizeMB} MB`,
  ]

  if (v.width > 0 && v.height > 0) {
    const unit = v.format === 'pdf' ? 'mm' : 'px'
    lines.push(`Dimensions: ${v.width}×${v.height} ${unit}  |  Ratio: ${v.ratio}`)
  }

  if (v.dpi !== null) {
    lines.push(`Resolution: ${v.dpi} DPI`)
  } else {
    lines.push('Resolution: unknown (no DPI metadata in file)')
  }

  if (v.warnings.length > 0) {
    lines.push('Issues: ' + v.warnings.join('; '))
  }

  if (v.recommendations.length > 0) {
    lines.push('Notes: ' + v.recommendations.join('; '))
  }

  lines.push('Use this data to give precise, expert print advice about this specific file.')

  return '\n\n' + lines.join('\n')
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('AI not configured — add ANTHROPIC_API_KEY to environment variables', { status: 503 })
  }

  if (!checkRateLimit(getClientIp(req), 20, 60_000)) {
    return new Response('Too many requests', { status: 429 })
  }

  let body: { messages: ChatMessage[]; language?: string; file?: FileData }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const { messages, language = 'en', file } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('messages[] required', { status: 400 })
  }

  // Keep last 20 messages to limit context size
  const history = messages.slice(-20)

  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''

  const [catalog, products, promptOverride] = await Promise.all([
    getProductCatalog(), getActiveProducts(), getSetting('ai.systemPrompt'),
  ])
  const match = matchProduct(file?.validation ?? null, lastUserMsg, products)
  const prepress = evaluatePrepress(file?.validation ?? null, match, lastUserMsg)
  const prepressSection = buildPrepressSection(prepress)
  const systemPrompt = buildSystemPrompt(catalog, language, match, prepressSection, promptOverride)

  // Build Anthropic message params
  const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

  const anthropicMessages: Anthropic.MessageParam[] = history.map((msg, idx) => {
    const isLastUser = idx === history.length - 1 && msg.role === 'user'

    if (isLastUser && file?.base64 && IMAGE_TYPES.includes(file.type)) {
      const mediaType = file.type as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
      const validationCtx = buildValidationContext(file)
      const baseText =
        msg.content ||
        `I've attached a file: ${file.name} (${Math.round(file.size / 1024)}KB). Please analyze it as a prepress technician — check resolution, color mode, quality, bleed, and print suitability.`
      return {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: file.base64 } },
          { type: 'text', text: baseText + validationCtx },
        ],
      }
    }

    if (isLastUser && file && !file.base64) {
      // Non-image file (PDF, SVG, AI, PSD) — provide validation context in text
      const validationCtx = buildValidationContext(file)
      const fallback = `[Attached: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)]`
      return {
        role: 'user',
        content: (msg.content ? msg.content + '\n\n' : '') + (validationCtx || fallback),
      }
    }

    return { role: msg.role, content: msg.content }
  })

  try {
    const stream = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    console.error('[chat] Claude API error:', e)
    return new Response('AI unavailable', { status: 503 })
  }
}
