import { type Metadata } from 'next'
import Link from 'next/link'
import Container from '@/components/Container'
import { BRANDING } from '@/config/branding'

export const metadata: Metadata = {
  title: 'About',
  description: 'In-house print production: large format, DTF, textile, foil, sublimation and graphic installation.',
  alternates: { canonical: '/about' },
}

const CAPABILITIES = [
  {
    title: 'Large format print',
    text: 'Banners, PVC flex, mesh, adhesive foil, window film, construction banners up to any width. We print on our own wide-format machines in-house.',
  },
  {
    title: 'DTF gang sheet',
    text: 'Direct-to-Film printing for textile transfers. High resolution, full color, suitable for cotton, polyester and mixed fabrics.',
  },
  {
    title: 'Textile print',
    text: 'T-shirts, hoodies, polos, bags and more. Sublimation, DTF and foil press. Small runs from 1 piece, no minimum.',
  },
  {
    title: 'Foil & vinyl cut',
    text: 'Adhesive lettering, logo cut, reflective vinyl, car graphics, window stickers. Plotted in-house for precision and fast turnaround.',
  },
  {
    title: 'Sublimation print',
    text: 'Mugs, bottles, caps, bags and any sublimatable surface. Photo quality, full color, permanent print.',
  },
  {
    title: 'Graphic installation',
    text: 'We mount what we produce. Vehicle wrapping, building signage, window graphics and wall print installation. Professional mounting team.',
  },
]

export default function AboutPage() {
  return (
    <Container>
      <div className="max-w-3xl">

        <h1 className="text-3xl font-bold text-gray-900 mb-2">About us</h1>
        <p className="text-gray-500 mb-10 leading-relaxed">
          {BRANDING.name} is an in-house print production facility. We design, print and install.
          No middlemen — everything is produced in our own workshop.
        </p>

        {/* Capability cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900 text-sm mb-1.5">{c.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>

        {/* Mission block */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Our approach</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            We believe print should be fast, honest and accessible. Order online, upload your file and we handle
            the rest — production, quality check, packaging and delivery or pickup. No hidden fees,
            no minimum quantities on most products.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/shop"
            className="btn-primary"
          >
            Browse products →
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
          >
            Contact us
          </Link>
        </div>

      </div>
    </Container>
  )
}
