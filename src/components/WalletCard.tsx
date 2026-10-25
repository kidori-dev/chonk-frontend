"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getPoints, hasTokens } from "@/lib/api";

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다
const subscribeNothing = () => () => {};

/**
 * 내 자산과 배팅 기록. 로그인했을 때만 보여준다.
 * 배팅 기록 줄(li)은 게임마다 모양이 달라서 children 으로 받는다. refreshKey 가 바뀌면 포인트를 다시 불러온다
 */
export default function WalletCard({
  empty,
  refreshKey = 0,
  children,
}: {
  empty: boolean;
  refreshKey?: number;
  children: React.ReactNode;
}) {
  const loggedIn = useSyncExternalStore(subscribeNothing, hasTokens, () => false);
  const [points, setPoints] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    getPoints()
      .then((p) => setPoints(p.points))
      .catch(() => setPoints(null));
  }, [loggedIn, refreshKey]);

  return (
    <section className="rounded-xl border border-foreground/10 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">내 자산</h2>
      {!loggedIn ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-foreground/60">로그인하면 내 포인트와 배팅 기록을 볼 수 있어요</p>
          <Link href="/login" className="block rounded-md bg-primary py-2.5 text-center text-sm font-medium text-white hover:opacity-90">
            로그인
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-sm text-foreground/60">보유 포인트</span>
            <span className="text-2xl font-black tabular-nums text-primary">{points ?? "-"}</span>
          </div>

          <h3 className="mt-5 border-t border-foreground/10 pt-4 text-sm font-semibold">배팅 기록</h3>
          {empty ? (
            <p className="mt-3 text-center text-sm text-foreground/50">아직 배팅 기록이 없어요</p>
          ) : (
            <ul className="mt-2 space-y-1.5">{children}</ul>
          )}
        </>
      )}
    </section>
  );
}
