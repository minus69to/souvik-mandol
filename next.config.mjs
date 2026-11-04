/** @type {import('next').NextConfig} */
// The repo name is the base path on GitHub Pages. Change it here only.
const basePath = "/souvik-mandol";

const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
