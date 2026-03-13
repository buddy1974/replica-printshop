import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const rates = await db.taxRate.findMany({ orderBy: { country: 'asc' } })
    return NextResponse.json(rates)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json()
    const { country, rate, label } = body

    if (!country || rate == null) {
      return NextResponse.json({ error: 'country and rate are required' }, { status: 400 })
    }
    const countryKey = String(country).toUpperCase()
    const rateNum = parseFloat(String(rate))
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      return NextResponse.json({ error: 'rate must be 0–100' }, { status: 400 })
    }

    // Upsert — create or update existing entry for this country
    const existing = await db.taxRate.findUnique({ where: { country: countryKey } })
    let row
    if (existing) {
      row = await db.taxRate.update({
        where: { country: countryKey },
        data: { rate: rateNum, label: label ?? existing.label },
      })
    } else {
      row = await db.taxRate.create({
        data: { country: countryKey, rate: rateNum, label: label ?? null },
      })
    }
    return NextResponse.json(row, { status: existing ? 200 : 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { id } = await req.json()
    await db.taxRate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
