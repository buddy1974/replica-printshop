// Static fallback company config — used in server components that cannot
// do async DB calls (e.g. settings page header, email template defaults).
// Configure real values via /admin/settings/business (stored in DB Setting table).

export const COMPANY = {
  name:    'PRINTSHOP',
  brand:   'PRINTSHOP',
  phone:   '+000000000',
  email:   'info@printshop.com',
  country: 'Country',
  domain:  'printshop.com',
} as const
