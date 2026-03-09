import Link from 'next/link'

interface ProductCardProps {
  id: string
  slug: string
  name: string
  category: string
  shortDescription?: string | null
  imageUrl?: string | null
}

export default function ProductCard({ slug, name, category, shortDescription, imageUrl }: ProductCardProps) {
  return (
    <Link
      href={`/product/${slug}`}
      className="group rounded border border-gray-200 bg-white overflow-hidden flex flex-col hover:border-gray-400 hover:shadow-sm transition-all"
    >
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-300 w-full h-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{category}</p>
          <h2 className="font-semibold text-sm leading-tight">{name}</h2>
          {shortDescription && (
            <p className="text-xs text-gray-500 leading-snug mt-1 line-clamp-2">{shortDescription}</p>
          )}
        </div>
        <span className="inline-flex items-center rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white group-hover:bg-gray-700 transition-colors w-fit">
          Configure →
        </span>
      </div>
    </Link>
  )
}
