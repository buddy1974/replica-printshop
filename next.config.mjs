/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bridge: Vercel has STRIPE_PUBLIC_KEY; code expects NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
  // next.config env runs at build time, so this aliases the correct value into the bundle.
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      process.env.STRIPE_PUBLIC_KEY ||
      '',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    localPatterns: [
      { pathname: '/**' },
    ],
  },
}

export default nextConfig
