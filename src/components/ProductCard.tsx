import Link from 'next/link'

interface ProductCardProps {
  id: string
  name: string
  category: string
}

export default function ProductCard({ id, name, category }: ProductCardProps) {
  return (
    <div className="rounded border border-gray-200 bg-white p-5 flex flex-col gap-3 hover:border-gray-400 transition-colors">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{category}</p>
        <h2 className="font-semibold">{name}</h2>
      </div>
      <Link href={`/configurator/${id}`} className="inline-flex items-center rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors w-fit">
        Configure →
      </Link>
    </div>
  )
}
