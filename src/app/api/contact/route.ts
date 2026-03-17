import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/mail'
import { COMPANY } from '@/config/company'
import { isSameOrigin } from '@/lib/csrf'
import { logError } from '@/lib/log'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || COMPANY.email

export async function POST(req: NextRequest) {
  // CSRF: reject cross-origin submissions
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json() as {
      name?: string
      email?: string
      subject?: string
      message?: string
    }

    const name    = body.name?.trim()    ?? ''
    const email   = body.email?.trim()   ?? ''
    const subject = body.subject?.trim() ?? 'Contact form'
    const message = body.message?.trim() ?? ''

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 })
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long.' }, { status: 400 })
    }

    // Send to company
    await sendMail(
      ADMIN_EMAIL,
      `Contact: ${subject} — ${name}`,
      `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
<p><strong>Subject:</strong> ${subject}</p>
<hr />
<p style="white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
    )

    // Auto-reply to sender
    await sendMail(
      email,
      `We received your message — ${COMPANY.brand}`,
      `<p>Hi ${name},</p>
<p>Thank you for contacting <strong>${COMPANY.brand}</strong>. We have received your message and will reply within 1 business day.</p>
<blockquote style="border-left:3px solid #e0e0e0;padding-left:12px;color:#555">
  ${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />')}
</blockquote>
<p style="color:#888;font-size:13px">${COMPANY.brand} · ${COMPANY.email} · ${COMPANY.phone}</p>`,
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/contact' })
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 })
  }
}
