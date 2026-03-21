import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getSetting, setSetting } from '@/lib/settings/settingsService'
import { AppError } from '@/lib/errors'
import { FILE_RULE_DEFAULTS, type FileRule } from '@/lib/prepressRules'

function parseRules(raw: string): FileRule[] {
  if (!raw) return FILE_RULE_DEFAULTS
  const parsed = JSON.parse(raw) as FileRule[]
  if (!Array.isArray(parsed) || parsed.length === 0) return FILE_RULE_DEFAULTS
  return parsed
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const raw = await getSetting('ai.fileRules')
    const rules = parseRules(raw)
    return NextResponse.json(rules)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json() as unknown

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected an array of rules' }, { status: 400 })
    }

    const rules: FileRule[] = (body as FileRule[]).map((r) => ({
      slug: String(r.slug ?? '').slice(0, 100),
      label: String(r.label ?? '').slice(0, 100),
      minDpi: Math.max(1, Math.min(1200, Math.round(Number(r.minDpi) || 1))),
      bleedMm: Math.max(0, Math.min(100, Math.round(Number(r.bleedMm) || 0))),
    })).filter((r) => r.slug.length > 0)

    if (rules.length === 0) {
      return NextResponse.json({ error: 'Rules array is empty after validation' }, { status: 400 })
    }

    await setSetting('ai.fileRules', JSON.stringify(rules))
    return NextResponse.json(rules)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
