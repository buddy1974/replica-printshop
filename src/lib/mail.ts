import nodemailer from 'nodemailer'

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = 'noreply@replica.printshop',
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

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.log(`[mail] ${subject} → ${to}\n(SMTP not configured — log only)`)
    return
  }
  await transporter.sendMail({ from: SMTP_FROM, to, subject, html })
}
