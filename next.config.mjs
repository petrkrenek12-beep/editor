/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @imgly/background-removal načítá onnxruntime až v prohlížeči
  webpack: (config) => {
    config.resolve.fallback = { ...(config.resolve.fallback || {}), fs: false, path: false, crypto: false };
    return config;
  },
};
export default nextConfig;
