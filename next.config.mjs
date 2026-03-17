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

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Prevent the site from being embedded in iframes (clickjacking)
          { key: 'X-Frame-Options',          value: 'DENY' },
          // Prevent browsers from MIME-sniffing the content type
          { key: 'X-Content-Type-Options',   value: 'nosniff' },
          // Limit referer information sent to third parties
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          // Enable DNS prefetch for performance
          { key: 'X-DNS-Prefetch-Control',   value: 'on' },
          // Restrict access to browser APIs not needed by a printshop
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
        ],
      },
    ]
  },
}

export default nextConfig
