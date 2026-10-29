"use client";

import { useState } from "react";

/**
 * 게임 배팅 카드. 모바일에서는 화면 아래에 떠 있고 접었다 펼 수 있다 (접으면 제목 줄만 남는다).
 * 넓은 화면에서는 오른쪽 카드로 항상 펼쳐져 있다
 */
export default function BetSheet({
  title,
  betClosed,
  betRemain,
  children,
}: {
  title: string;
  betClosed: boolean;
  betRemain: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="fixed inset-x-0 bottom-0 z-20 rounded-t-xl border-t border-foreground/10 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.08)] lg:static lg:rounded-xl lg:border lg:p-5 lg:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
            betClosed ? "bg-red-50 text-red-500" : "bg-eth/10 text-eth"
          }`}
        >
          {betClosed ? "🔒 배팅 마감" : `⏱ 마감까지 ${betRemain}초`}
        </span>
        {/* 접기/펴기 (모바일에서만) */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "배팅 화면 접기" : "배팅 화면 펼치기"}
          aria-expanded={open}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground/5 text-foreground/60 hover:text-foreground lg:hidden"
        >
          <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>
      </div>
      {/* 접혀 있으면 모바일에서만 숨긴다 */}
      <div className={open ? "" : "hidden lg:block"}>{children}</div>
    </section>
  );
}
