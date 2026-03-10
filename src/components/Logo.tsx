import Link from 'next/link'
import { BRANDING } from '@/config/branding'

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      {/* Mark */}
      <div className="w-8 h-8 rounded-lg bg-red-600 flex flex-col items-center justify-center gap-[3px] shrink-0">
        <div className="w-4 h-0.5 bg-white rounded-full" />
        <div className="w-4 h-0.5 bg-white rounded-full" />
        <div className="w-3 h-0.5 bg-white rounded-full" />
      </div>
      {/* Text */}
      <span className="text-base font-extrabold tracking-tight text-gray-900 leading-none">
        {BRANDING.logoText}
      </span>
    </Link>
  )
}
