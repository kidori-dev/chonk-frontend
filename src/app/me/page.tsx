"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ApiError,
  getMe,
  getPointHistory,
  getPoints,
  hasTokens,
  logout,
  type PointHistoryItem,
  type User,
} from "@/lib/api";

const PAGE_SIZE = 20;

const TYPE_LABEL: Record<PointHistoryItem["type"], string> = { deposit: "입금", withdraw: "출금" };

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<string | null>(null);
  const [history, setHistory] = useState<PointHistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인이 풀렸으면(401) 로그인 페이지로 보낸다
  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) router.replace("/login");
    else setError(err instanceof Error ? err.message : "불러오지 못했습니다");
  }

  async function loadHistory(offset: number) {
    const { items } = await getPointHistory(PAGE_SIZE, offset);
    setHistory((prev) => (offset === 0 ? items : [...prev, ...items]));
    setHasMore(items.length === PAGE_SIZE);
  }

  useEffect(() => {
    if (!hasTokens()) {
      router.replace("/login");
      return;
    }
    // 첫 요청에서 토큰 재발급이 겹치지 않도록 me 를 먼저 받고 나머지를 부른다
    getMe()
      .then((me) => {
        setUser(me);
        return Promise.all([getPoints().then((p) => setPoints(p.points)), loadHistory(0)]);
      })
      .catch(handleError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  if (!user) {
    return <main className="flex flex-1 items-center justify-center">{error ?? "불러오는 중..."}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-foreground/60">
            ← 마켓
          </Link>
          <h1 className="text-xl font-bold">{user.name ?? user.email}</h1>
          <p className="text-sm text-foreground/60">{user.email}</p>
        </div>
        <button onClick={onLogout} className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm">
          로그아웃
        </button>
      </header>

      <section className="flex items-center justify-between gap-4 rounded-md border border-accent/40 p-6">
        <div>
          <p className="text-sm text-foreground/60">내 포인트</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-primary">{points ?? "-"}</p>
        </div>
        {/* 웃는 고양이 */}
        <Image
          src="/images/cat-happy.png"
          alt="Chonk"
          width={512}
          height={539}
          className="h-auto w-28 shrink-0"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">포인트 이력</h2>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {history.length === 0 ? (
          <p className="text-sm text-foreground/60">아직 이력이 없습니다</p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/15">
            {history.map((h, i) => (
              <li key={`${h.type}-${h.targetId ?? i}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {TYPE_LABEL[h.type] ?? h.type}
                    {h.symbol && (
                      <span className="ml-2 text-foreground/60">
                        {h.tokenAmount} {h.symbol}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-foreground/50">
                    {new Date(h.createdAt).toLocaleString("ko-KR")}
                    {h.txHash && <span className="ml-2 font-mono">{h.txHash}</span>}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <p className={h.points.startsWith("-") ? "text-red-500" : "text-accent"}>
                    {h.points.startsWith("-") ? h.points : `+${h.points}`}
                  </p>
                  <p className="text-xs text-foreground/50">{h.pointsAfter}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <button
            onClick={() => loadHistory(history.length).catch(handleError)}
            className="w-full rounded-md border border-foreground/20 py-2 text-sm"
          >
            더 보기
          </button>
        )}
      </section>
    </main>
  );
}
