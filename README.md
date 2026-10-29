# chonk-frontend

chonk-backend 의 프론트엔드. Next.js (App Router) + TypeScript + Tailwind CSS, Vercel 배포 기준.

- `/login` — 로그인 (`POST /api/auth/login`)
- `/signup` — 회원가입 (`POST /api/auth/register`). 가입하면 바로 로그인되고 입금 페이지로 간다
- `/deposit` — 입금. 내 입금 주소(처음 열면 서버가 발급), 받는 토큰, 최근 입금 (`GET /api/deposit-address`)
- 모든 화면 오른쪽 위 `AccountMenu`: 로그인했으면 내 이메일(누르면 내 포인트 / 입금하기 / 로그아웃), 아니면 로그인 / 회원가입
- `/` — 랜딩. 마켓 카드 목록 (지금은 `src/lib/markets.ts` 의 임시 데이터)
- `/me` — 내 정보, 포인트, 포인트 이력 (`/api/auth/me`, `/api/points`, `/api/points/history`)
- `/games/eth-hash` — 이더리움 블록 동전 던지기 게임 (해시 마지막 글자가 홀수면 앞면, 짝수면 뒷면). 지금 블록이 N 이면 N+2 블록에 걸고, 블록이 나오고 9초 동안만 배팅할 수 있고 마지막 3초는 마감, N+1 이 나오면 확정된다
- `/games/cat-race` — 이더리움 블록 고양이 경주. 해시 64글자를 읽으며 글자마다 고양이가 한 칸씩 달린다(0~3 치즈, 4~7 까망, 8~b 삼색이, c~f 하양). 동전 던지기와 같은 N+2 배팅 규칙
- `/games/block-match` — 이더리움 블록 그림 맞추기. 해시 마지막 3글자가 릴 3개(0~3 츄르, 4~7 생선, 8~b 고양이, c~f 쥐). 동전 던지기와 같은 N+2 배팅 규칙
- `/games/dice` — 이더리움 블록 주사위. 해시 끝에서부터 1바이트씩 읽어(252 이상은 건너뜀) 주사위 2개를 정하고, 합이 소(2~6)/럭키 7/대(8~12) 중 무엇일지 건다. 동전 던지기와 같은 N+2 배팅 규칙
- `/games/ladder` — 이더리움 블록 사다리 (4줄 중 하나 당첨, 규칙은 `src/lib/ladder.ts`). 해시 마지막 글자로 당첨 고양이(0~3=1번 … c~f=4번)를 정하고 사다리는 연출. 배당 3.8배
- `/games/lottery` — 이더리움 블록 제비뽑기. 제비 16장(0~f) 중 해시 마지막 글자를 맞히면 15배 (확률 1/16). 같은 N+2 배팅 규칙
- `/games/churu-match` — 랜덤 츄르 그림 맞추기 (그림 3개 맞추기). 그림은 서버가 난수로 정하고 그 자리에서 정산된다

### 게임 배팅

- 모든 게임은 로그인해야 걸 수 있고, 실제 포인트가 빠지고 들어온다 (`POST /api/games/:game/bets`). 결과는 서버가 정하고 화면은 같은 규칙으로 애니메이션만 보여준다
- 블록 게임 공통 흐름은 `src/lib/useBlockBetting.ts`: 블록과 지금 라운드(판정 블록, 마감 시각)는 소켓(`src/lib/socket.ts`)으로 받는다
- 게임 화면의 "지난 라운드"는 서버가 확정한 라운드 결과(소켓 `rounds`)다. 판정 블록 뒤로 2블록이 더 나오면 추가된다
- 고르고 **배팅하기**를 누르면 바로 포인트가 빠지고 취소할 수 없다. 자동(고정/랜덤) 모드는 새 라운드가 열리면 알아서 건다 (포인트가 모자라면 꺼진다)
- 판정 블록이 나오면 결과를 바로 보여주고("정산 중"), 서버가 정산하면(판정 블록 뒤로 2블록, 약 24초) 포인트가 들어온다
- 데모 로그인은 배팅할 수 없다

## 실행

```bash
npm install
cp .env.example .env.local   # BACKEND_URL 확인
npm run dev                  # http://localhost:3001 (백엔드가 3000 을 쓰므로 3001)
```

## 백엔드 연결

브라우저는 같은 도메인의 `/api/*` 로만 요청하고, `next.config.ts` 의 `rewrites` 가 `BACKEND_URL` 로 넘긴다. 그래서 API 에는 CORS 설정이 필요 없다.

게임 소켓(Socket.IO)만 브라우저가 `NEXT_PUBLIC_SOCKET_URL`(백엔드 주소)로 직접 붙는다. Vercel rewrites 는 웹소켓을 넘기지 못하기 때문이다.
백엔드 `.env` 의 `SOCKET_CORS_ORIGINS` 에 프론트 주소(예: `https://<프론트>.vercel.app`)를 넣어야 한다.

- 토큰(access/refresh)은 `localStorage` 에 저장한다. 401 이 나면 `/api/auth/refresh` 로 한 번 재발급하고 다시 보낸다 (`src/lib/api.ts`).
- `BACKEND_URL` 은 **빌드할 때** rewrites 에 들어간다. 값을 바꾸면 다시 빌드(재배포)해야 한다.

## Vercel 배포

1. Vercel 에서 이 저장소를 Import (Framework: Next.js 자동 인식, 설정 변경 없음)
2. Environment Variables 에 `BACKEND_URL=https://<백엔드 주소>`, `NEXT_PUBLIC_SOCKET_URL=https://<백엔드 주소>` 추가
3. Deploy

백엔드는 Vercel 서버를 거쳐 요청을 받으므로, 로그인 횟수 제한(IP 기준)이 실제 유저 IP 로 동작하려면 백엔드에 trust proxy 설정이 필요하다.
