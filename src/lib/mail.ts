import nodemailer from 'nodemailer'
import { getSetting } from '@/lib/settings/settingsService'

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env

// If no SMTP config, log only — never crash (step 179)
const configured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

const transporter = configured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT ?? 587) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null

export interface MailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: MailAttachment[],
): Promise<void> {
  // Build from address from settings (with SMTP_FROM env as override)
  let fromAddr = SMTP_FROM ?? ''
  try {
    const senderName  = await getSetting('email.senderName')
    const senderEmail = await getSetting('email.senderEmail')
    const addr = SMTP_FROM || senderEmail || 'no-reply@printshop.com'
    fromAddr = senderName ? `"${senderName}" <${addr}>` : addr
  } catch {
    fromAddr = SMTP_FROM ?? 'no-reply@printshop.com'
  }

  if (!transporter) {
    console.log(`[mail] ${subject} → ${to}${attachments?.length ? ` (+${attachments.length} attachment)` : ''}\n(SMTP not configured — log only)`)
    return
  }
  await transporter.sendMail({
    from: fromAddr,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  })
}
