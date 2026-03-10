import Link from 'next/link'

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
      {/* Mark — three print lines in indigo square */}
      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex flex-col items-center justify-center gap-[3px] shrink-0">
        <div className="w-4 h-0.5 bg-white rounded-full" />
        <div className="w-4 h-0.5 bg-white rounded-full" />
        <div className="w-3 h-0.5 bg-white rounded-full" />
      </div>
      {/* Text */}
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold text-gray-900 tracking-tight">replica</span>
        <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mt-0.5">printshop</span>
      </div>
    </Link>
  )
}
