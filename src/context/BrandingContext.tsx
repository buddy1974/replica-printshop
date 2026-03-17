'use client'

import { createContext, useContext } from 'react'

export interface BrandingData {
  companyName:  string
  logoUrl:      string
  faviconUrl:   string
  footerText:   string
  primaryColor: string
}

const DEFAULT: BrandingData = {
  companyName:  'PRINTSHOP',
  logoUrl:      '',
  faviconUrl:   '',
  footerText:   '© PRINTSHOP. All rights reserved.',
  primaryColor: '#dc2626',
}

const BrandingContext = createContext<BrandingData>(DEFAULT)

export function BrandingProvider({
  children,
  initial,
}: {
  children: React.ReactNode
  initial: BrandingData
}) {
  return (
    <BrandingContext.Provider value={initial}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding(): BrandingData {
  return useContext(BrandingContext)
}
