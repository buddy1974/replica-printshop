import Link from 'next/link'
import { COMPANY } from '@/config/company'

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
      <div className="flex flex-col leading-none">
        <span className="text-base font-black tracking-tighter uppercase text-gray-950">
          {COMPANY.brand}
        </span>
        <span className="text-[8px] font-semibold tracking-widest uppercase text-gray-400">
          by {COMPANY.name}
        </span>
      </div>
    </Link>
  )
}
