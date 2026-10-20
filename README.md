# chonk-frontend

chonk-backend 의 프론트엔드. Next.js (App Router) + TypeScript + Tailwind CSS, Vercel 배포 기준.

- `/login` — 로그인 (`POST /api/auth/login`)
- `/` — 랜딩. 마켓 카드 목록 (지금은 `src/lib/markets.ts` 의 임시 데이터)
- `/me` — 내 정보, 포인트, 포인트 이력 (`/api/auth/me`, `/api/points`, `/api/points/history`)
- `/games/eth-hash` — 이더리움 블록 동전 던지기 게임 (해시 마지막 글자가 홀수면 앞면, 짝수면 뒷면). 지금 블록이 N 이면 N+2 블록에 걸고, 블록이 나오고 9초 동안만 배팅할 수 있고 마지막 3초는 마감, N+1 이 나오면 확정된다. 실제 포인트를 걸 때는 판정 블록 번호를 서버가 정해야 한다. 블록 데이터는 지금 임시(`src/lib/api.ts` 의 `getRecentBlocks`, `subscribeBlocks`), 나중에 웹소켓으로 바꾼다

## 실행

```bash
npm install
cp .env.example .env.local   # BACKEND_URL 확인
npm run dev                  # http://localhost:3001 (백엔드가 3000 을 쓰므로 3001)
```

## 백엔드 연결

브라우저는 같은 도메인의 `/api/*` 로만 요청하고, `next.config.ts` 의 `rewrites` 가 `BACKEND_URL` 로 넘긴다. 그래서 백엔드에 CORS 설정이 필요 없다.

- 토큰(access/refresh)은 `localStorage` 에 저장한다. 401 이 나면 `/api/auth/refresh` 로 한 번 재발급하고 다시 보낸다 (`src/lib/api.ts`).
- `BACKEND_URL` 은 **빌드할 때** rewrites 에 들어간다. 값을 바꾸면 다시 빌드(재배포)해야 한다.

## Vercel 배포

1. Vercel 에서 이 저장소를 Import (Framework: Next.js 자동 인식, 설정 변경 없음)
2. Environment Variables 에 `BACKEND_URL=https://<백엔드 주소>` 추가
3. Deploy

백엔드는 Vercel 서버를 거쳐 요청을 받으므로, 로그인 횟수 제한(IP 기준)이 실제 유저 IP 로 동작하려면 백엔드에 trust proxy 설정이 필요하다.
