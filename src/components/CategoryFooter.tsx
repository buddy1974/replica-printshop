import Link from 'next/link'

export default function CategoryFooter() {
  return (
    <div className="mt-16 border-t border-gray-200 pt-10 pb-4">
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold mb-2">Did not find what you want to print?</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          We also produce many custom items, workwear, special prints, and custom jobs.
          Contact us and we will help you.
        </p>
        <Link
          href="/contact"
          className="btn-primary"
        >
          Contact us →
        </Link>
      </div>
    </div>
  )
}
