// 백엔드 API 호출. 요청은 /api/* 로 보내고 next.config.ts 의 rewrites 가 백엔드로 넘긴다

export type User = { id: string; email: string; name: string | null };

type Tokens = { accessToken: string; refreshToken: string };

export type PointHistoryItem = {
  type: "deposit" | "withdraw";
  points: string;
  pointsBefore: string;
  pointsAfter: string;
  targetId: string | null;
  symbol: string | null;
  tokenAmount: string | null;
  txHash: string | null;
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

export const getPointHistory = (limit: number, offset: number) =>
  isDemo()
    ? Promise.resolve({ items: [] as PointHistoryItem[] })
    : authRequest<{ items: PointHistoryItem[] }>(`/points/history?limit=${limit}&offset=${offset}`);

// ---- 이더리움 블록 (동전 던지기 게임) ----
// 지금은 임시 데이터. 백엔드가 준비되면 getRecentBlocks 는 REST, subscribeBlocks 는 웹소켓으로 바꾼다

export type Block = { number: number; hash: string; timestamp: number };

/** 이더리움 블록 생성 간격(약 12초) */
export const BLOCK_INTERVAL_MS = 12_000;

let mockNumber = 21_034_560;

function mockBlock(timestamp: number): Block {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hash = "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return { number: ++mockNumber, hash, timestamp };
}

/** 최근 블록 목록 (최신이 앞) */
export async function getRecentBlocks(limit: number): Promise<Block[]> {
  const now = Date.now();
  const blocks = Array.from({ length: limit }, (_, i) => mockBlock(now - (limit - 1 - i) * BLOCK_INTERVAL_MS));
  return blocks.reverse();
}

/** 새 블록이 생기면 onBlock 을 부른다. 반환값을 부르면 구독 해제 */
export function subscribeBlocks(onBlock: (block: Block) => void): () => void {
  const timer = setInterval(() => onBlock(mockBlock(Date.now())), BLOCK_INTERVAL_MS);
  return () => clearInterval(timer);
}
