// Shared branded email base — used by all templates
// Palette: red #cc0000, black #111, white, light-gray #f5f5f5

const BRAND_RED = '#cc0000'
const BRAND_NAME = 'Printshop'

/** Wrap body content in the shared branded shell */
export function emailWrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px">

        <!-- Header -->
        <tr><td style="background:${BRAND_RED};padding:18px 32px;border-radius:8px 8px 0 0">
          <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;text-transform:uppercase">${BRAND_NAME}</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;color:#111111;font-size:15px;line-height:1.65;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f7f7f7;padding:18px 32px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;font-size:12px;color:#999;line-height:1.6">
          <p style="margin:0;font-weight:600;color:#666">${BRAND_NAME}</p>
          <p style="margin:4px 0 0">Questions? Reply to this email and we will get back to you.</p>
          <p style="margin:4px 0 0">This is an automated message — please do not reply directly.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Prominent CTA button */
export function ctaButton(href: string, label: string, color = BRAND_RED): string {
  return `<p style="margin:24px 0">
    <a href="${href}" style="display:inline-block;padding:12px 24px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:0.2px">
      ${label}
    </a>
  </p>
  <p style="font-size:12px;color:#aaa;margin:-12px 0 0">Or copy: <a href="${href}" style="color:#aaa">${href}</a></p>`
}

/** Order reference pill */
export function orderRef(orderId: string): string {
  return `<span style="font-family:monospace;background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:13px;color:#555">#${orderId.slice(0, 8).toUpperCase()}</span>`
}

/** Section heading */
export function sectionHeading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#111;line-height:1.2">${text}</h1>`
}

/** Info box (for messages, file names, etc.) */
export function infoBox(content: string, color: 'gray' | 'red' | 'orange' | 'green' = 'gray'): string {
  const palette: Record<string, { bg: string; border: string; text: string }> = {
    gray:   { bg: '#f5f5f5', border: '#ccc',    text: '#444' },
    red:    { bg: '#fff3f3', border: '#e00',    text: '#800' },
    orange: { bg: '#fff8e6', border: '#f59e0b', text: '#92400e' },
    green:  { bg: '#f0faf0', border: '#22c55e', text: '#166534' },
  }
  const p = palette[color]
  return `<div style="margin:16px 0;padding:12px 16px;background:${p.bg};border-left:4px solid ${p.border};border-radius:2px;font-size:14px;color:${p.text}">
    ${content}
  </div>`
}

/** Simple divider */
export const divider = `<hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>`
