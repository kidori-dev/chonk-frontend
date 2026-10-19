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

export function hasTokens(): boolean {
  return loadTokens() !== null;
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
  saveTokens(res);
  return res.user;
}

export async function logout(): Promise<void> {
  const tokens = loadTokens();
  saveTokens(null);
  if (tokens) {
    await request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }).catch(() => {});
  }
}

export const getMe = () => authRequest<User>("/auth/me");

export const getPoints = () => authRequest<{ points: string }>("/points");

export const getPointHistory = (limit: number, offset: number) =>
  authRequest<{ items: PointHistoryItem[] }>(`/points/history?limit=${limit}&offset=${offset}`);
