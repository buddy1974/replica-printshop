/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
    localPatterns: [
      { pathname: '/mockups/**' },
      { pathname: '/storage/**' },
    ],
  },
}

export default nextConfig
