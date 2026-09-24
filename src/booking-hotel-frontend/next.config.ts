import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Cố định gốc tracing = thư mục frontend (tránh Next chọn nhầm lockfile ở thư mục cha).
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  poweredByHeader: false,
  // Lint chạy riêng (POC chưa cấu hình ESLint); không chặn build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
