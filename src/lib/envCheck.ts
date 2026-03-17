// Startup environment variable check.
// Logs warnings for missing critical vars — never throws, never crashes.
// Called once at module load from middleware.

const CHECKS: Array<{ key: string; feature: string; required: boolean }> = [
  { key: 'DATABASE_URL',          feature: 'Database',          required: true  },
  { key: 'STRIPE_SECRET_KEY',     feature: 'Stripe payments',   required: true  },
  { key: 'GOOGLE_CLIENT_ID',      feature: 'Google OAuth',      required: true  },
  { key: 'GOOGLE_CLIENT_SECRET',  feature: 'Google OAuth',      required: true  },
  { key: 'NEXT_PUBLIC_APP_URL',   feature: 'App URL / CORS',    required: true  },
  { key: 'SMTP_HOST',             feature: 'Email (SMTP)',       required: false },
  { key: 'ADMIN_EMAIL',           feature: 'Admin notifications',required: false },
]

let checked = false

export function checkEnv(): void {
  if (checked) return
  checked = true

  const missing = CHECKS.filter(({ key }) => !process.env[key])
  if (missing.length === 0) return

  const required = missing.filter((c) => c.required)
  const optional = missing.filter((c) => !c.required)

  if (required.length > 0) {
    console.error(
      `[env] CRITICAL — missing required env vars: ${required.map((c) => c.key).join(', ')}. ` +
      `These features will NOT work: ${required.map((c) => c.feature).join(', ')}.`
    )
  }
  if (optional.length > 0) {
    console.warn(
      `[env] Optional env vars not set: ${optional.map((c) => c.key).join(', ')}. ` +
      `These features may be disabled: ${optional.map((c) => c.feature).join(', ')}.`
    )
  }
}
