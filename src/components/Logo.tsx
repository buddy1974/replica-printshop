'use client'

import Link from 'next/link'
import { useBranding } from '@/context/BrandingContext'

export default function Logo() {
  const { companyName, logoUrl } = useBranding()

  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={companyName} className="h-8 w-auto object-contain" />
      ) : (
        <>
          {/* Mark */}
          <div className="w-8 h-8 rounded-lg bg-red-600 flex flex-col items-center justify-center gap-[3px] shrink-0">
            <div className="w-4 h-0.5 bg-white rounded-full" />
            <div className="w-4 h-0.5 bg-white rounded-full" />
            <div className="w-3 h-0.5 bg-white rounded-full" />
          </div>
          {/* Text */}
          <div className="flex flex-col leading-none">
            <span className="text-base font-black tracking-tighter uppercase text-gray-950">
              {companyName}
            </span>
          </div>
        </>
      )}
    </Link>
  )
}
