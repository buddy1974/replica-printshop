import Link from 'next/link'

export default function Logo() {
  return (
    <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: 2, textTransform: 'uppercase' }}>
        printshop
      </span>
    </Link>
  )
}
