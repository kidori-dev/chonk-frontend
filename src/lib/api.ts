// 백엔드 API 호출. 요청은 /api/* 로 보내고 next.config.ts 의 rewrites 가 백엔드로 넘긴다

export type User = { id: string; email: string; name: string | null };

type Tokens = { accessToken: string; refreshToken: string };

export type PointHistoryItem = {
  type: "deposit" | "withdraw" | "bet" | "bet_payout" | "churu";
  points: string;
  pointsBefore: string;
  pointsAfter: string;
  targetId: string | null;
  symbol: string | null;
  tokenAmount: string | null;
  txHash: string | null;
  /** 배팅 이력(bet / bet_payout)의 게임 */
  game: GameId | null;
  createdAt: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// 토큰은 localStorage 에 둔다
const TOKENS_KEY = "chonk.tokens";

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: Tokens | null): void {
  if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  else localStorage.removeItem(TOKENS_KEY);
}

// ---- 데모 로그인 ----
// 백엔드 없이 둘러볼 수 있게 "demo" 유저로 로그인한 것처럼 보이게 한다. 실제 API 는 부르지 않는다
const DEMO_KEY = "chonk.demo";
const DEMO_USER: User = { id: "demo", email: "demo@chonk", name: "demo" };
const DEMO_POINTS = "10000";

function isDemo(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

export function loginDemo(): User {
  saveTokens(null);
  localStorage.setItem(DEMO_KEY, "1");
  return DEMO_USER;
}

/** 로그인 상태인지 (데모 포함) */
export function hasTokens(): boolean {
  return isDemo() || loadTokens() !== null;
}

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new ApiError(res.status, message ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// 리프레시 토큰은 1회용이라, 동시에 여러 요청이 401 을 받아도 재발급은 한 번만 한다
let refreshing: Promise<Tokens> | null = null;

function refreshTokens(refreshToken: string): Promise<Tokens> {
  refreshing ??= request<Tokens>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  })
    .then((tokens) => {
      saveTokens(tokens);
      return tokens;
    })
    .catch((err) => {
      saveTokens(null);
      throw err;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** 로그인이 필요한 API. 액세스 토큰이 만료(401)면 재발급 후 한 번 더 보낸다 */
async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = loadTokens();
  if (!tokens) throw new ApiError(401, "로그인이 필요합니다");
  try {
    return await request<T>(path, init, tokens.accessToken);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    const next = await refreshTokens(tokens.refreshToken);
    return request<T>(path, init, next.accessToken);
  }
}

export async function login(email: string, password: string): Promise<User> {
  const res = await request<Tokens & { user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.removeItem(DEMO_KEY);
  saveTokens(res);
  return res.user;
}

/** 회원가입. 성공하면 바로 로그인된다 */
export async function register(email: string, password: string, name?: string): Promise<User> {
  const res = await request<Tokens & { user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(name ? { name } : {}) }),
  });
  localStorage.removeItem(DEMO_KEY);
  saveTokens(res);
  return res.user;
}

export async function logout(): Promise<void> {
  localStorage.removeItem(DEMO_KEY);
  const tokens = loadTokens();
  saveTokens(null);
  if (tokens) {
    await request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }).catch(() => {});
  }
}

export const getMe = () => (isDemo() ? Promise.resolve(DEMO_USER) : authRequest<User>("/auth/me"));

export const getPoints = () =>
  isDemo() ? Promise.resolve({ points: DEMO_POINTS }) : authRequest<{ points: string }>("/points");

/** Chonk 고양이에게 츄르 주기. 서버가 포인트를 빼고(10 P) 반영 후 포인트를 돌려준다. 포인트가 모자라면 400 */
export function feedChuru(): Promise<{ points: string }> {
  if (isDemo()) return Promise.reject(new ApiError(403, "데모 계정은 츄르를 사 줄 수 없어요. 로그인해 주세요"));
  return authRequest("/points/churu", { method: "POST" });
}

export const getPointHistory = (limit: number, offset: number) =>
  isDemo()
    ? Promise.resolve({ items: [] as PointHistoryItem[] })
    : authRequest<{ items: PointHistoryItem[] }>(`/points/history?limit=${limit}&offset=${offset}`);

// ---- 이더리움 블록 (블록 게임) ----
// 블록과 라운드 결과는 소켓(src/lib/socket.ts)으로 받는다

export type Block = { number: number; hash: string; timestamp: number };

/** 이더리움 블록 생성 간격(약 12초) */
export const BLOCK_INTERVAL_MS = 12_000;

/** 블록 게임 라운드 결과 (판정 블록 뒤로 2블록이 더 나와 확정된 것) */
export type Round = {
  blockNumber: number;
  blockHash: string;
  /** 예) coin "f", cat-race "orange", block-match "churu,fish,cat", dice "3,4" */
  result: string;
  createdAt: string;
};

// ---- 게임 배팅 ----

export type GameId = "coin" | "cat-race" | "block-match" | "dice" | "ladder" | "lottery" | "churu-match";

/** 배팅 1건. status 가 pending 이면 결과 대기, settled 면 payout 까지 반영됨 */
export type Bet = {
  id: string;
  game: GameId;
  /** 판정 블록 번호 (churu-match 는 null) */
  targetBlockNumber: number | null;
  pick: string | null;
  amount: string;
  status: "pending" | "settled";
  blockHash: string | null;
  /** 결과 값. 예) coin "f", cat-race "orange", 그림 맞추기 "churu,fish,cat", dice "3,4" */
  result: string | null;
  multiplier: string | null;
  payout: string | null;
  createdAt: string;
  settledAt: string | null;
};

/**
 * 배팅. 블록 게임은 targetBlockNumber(최신 블록 + 2)에 건다.
 * churu-match 는 바로 결과가 나온다 (status = settled). points = 반영 후 내 포인트
 */
export function placeBet(
  game: GameId,
  body: { targetBlockNumber?: number; pick?: string; amount: number },
): Promise<{ bet: Bet; points: string }> {
  if (isDemo()) return Promise.reject(new ApiError(403, "데모 계정은 배팅할 수 없어요. 로그인해 주세요"));
  return authRequest(`/games/${game}/bets`, { method: "POST", body: JSON.stringify(body) });
}

/** 내 배팅 기록 (최근 것부터) */
export const getMyBets = (game: GameId, limit = 20) =>
  isDemo()
    ? Promise.resolve({ items: [] as Bet[] })
    : authRequest<{ items: Bet[] }>(`/games/bets?game=${game}&limit=${limit}`);

// ---- 입금 ----

export type DepositInfo = {
  /** 내 입금 주소. 아래 토큰을 보내면 포인트가 적립된다 */
  address: string;
  chainId: number;
  currencies: { symbol: string; address: string; decimals: number; pointRatio: string }[];
};

/** 내 입금 주소 (처음 부르면 서버가 발급한다) */
export const getDepositInfo = () =>
  isDemo()
    ? Promise.reject(new ApiError(403, "데모 계정은 입금 주소가 없어요. 로그인해 주세요"))
    : authRequest<DepositInfo>("/deposit-address");
