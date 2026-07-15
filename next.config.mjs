/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static — no API routes, no next/image, no server features in use — so the
  // same build works both on Vercel and bundled into the Capacitor iOS shell below.
  output: 'export'
};

export default nextConfig;
