// Mail configuration — reads from environment variables.
// Use SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in your .env / Vercel settings.

export const mailConfig = {
  host: process.env.SMTP_HOST ?? '',
  port: Number(process.env.SMTP_PORT ?? 587),
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
  from: process.env.SMTP_FROM ?? 'noreply@printshop',
} as const

/** True when all required SMTP fields are present */
export const smtpConfigured = Boolean(
  mailConfig.host && mailConfig.user && mailConfig.pass
)
