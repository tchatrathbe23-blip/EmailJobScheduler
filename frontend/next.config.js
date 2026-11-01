/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL 
      ? (process.env.BACKEND_INTERNAL_URL.startsWith('http') ? process.env.BACKEND_INTERNAL_URL : `https://${process.env.BACKEND_INTERNAL_URL}`)
      : 'http://localhost:5000';

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
