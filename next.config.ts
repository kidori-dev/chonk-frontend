import type { NextConfig } from "next";

// 백엔드(chonk-backend) 주소. Vercel 에서는 프로젝트 환경 변수로 넣는다
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 개발 중 화면 왼쪽 아래 Next.js Dev Tools 버튼 숨김 (에러 표시는 그대로 뜬다)
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // 브라우저는 같은 도메인의 /api/* 로만 요청하고, Next 가 백엔드로 넘긴다 (CORS 설정 불필요)
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
