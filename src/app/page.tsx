"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { hasTokens } from "@/lib/api";
import { MARKETS, type Market } from "@/lib/markets";

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다 (서버 렌더링 때는 비로그인으로 본다)
const subscribe = () => () => {};

export default function LandingPage() {
  const loggedIn = useSyncExternalStore(subscribe, hasTokens, () => false);
  const [query, setQuery] = useState("");
  // 카드 버튼을 눌렀을 때 띄우는 메시지 (null 이면 닫힘)
  const [message, setMessage] = useState<string | null>(null);

  const markets = MARKETS.filter((m) => marketText(m).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="shrink-0 text-xl font-bold">
            Chonk
          </Link>
          <input
            type="search"
            placeholder="마켓 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-foreground/5 px-4 py-2 text-sm outline-primary sm:max-w-md"
          />
          <Link
            href={loggedIn ? "/me" : "/login"}
            className="ml-auto shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            {loggedIn ? "내 포인트" : "로그인"}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        {markets.length === 0 ? (
          <p className="py-20 text-center text-sm text-foreground/60">검색 결과가 없습니다</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {markets.map((m) => (
              <MarketCard key={m.id} market={m} onMessage={setMessage} />
            ))}
            {/* 마지막 칸은 메인 캐릭터. 검색 중에는 숨긴다 */}
            {!query.trim() && <CatCell />}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold text-foreground">Chonk</span>
          <span>© 2026 Chonk. All rights reserved.</span>
        </div>
      </footer>

      {message && <MessageModal message={message} onClose={() => setMessage(null)} />}
    </div>
  );
}

// 브라우저 기본 alert 대신 쓰는 메시지 창. 바깥을 누르거나 Esc 로도 닫힌다
function MessageModal({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="animate-pop w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl"
      >
        <Image src="/images/main.png" alt="" width={1131} height={1237} className="mx-auto h-24 w-auto brightness-110" />
        <p className="mt-4 text-lg font-bold whitespace-pre-line">{message}</p>
        <button
          autoFocus
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          확인
        </button>
      </div>
    </div>
  );
}

function CatCell() {
  return (
    <div className="flex min-h-48 items-center justify-center">
      <Image src="/images/main.png" alt="Chonk" width={1131} height={1237} className="h-40 w-auto brightness-110" />
    </div>
  );
}

// 츄르 (비스듬히 놓인 스틱형 간식 봉지)
function ChuruIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7">
      <g transform="rotate(-35 12 12)">
        <rect x="8.5" y="1.5" width="7" height="21" rx="1.5" fill="#e9823a" stroke="#5b2e14" strokeWidth={1} />
        {/* 뜯는 선 */}
        <path d="M8.5 5.5h7" stroke="#5b2e14" strokeWidth={0.8} strokeDasharray="1 0.8" />
        {/* 라벨과 물고기 */}
        <rect x="9.3" y="9" width="5.4" height="7.5" rx="0.6" fill="#fff6e0" />
        <path d="M10.2 12.75q1.6-1.8 3.2 0q-1.6 1.8-3.2 0zM13.4 12.75l1-1v2z" fill="#e9823a" />
      </g>
    </svg>
  );
}

// 이더리움 로고 (회색 다이아몬드)
function EthIcon() {
  return (
    <svg viewBox="0 0 256 417" className="h-6 w-auto">
      <path fill="#343434" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" />
      <path fill="#8C8C8C" d="M127.962 0L0 212.32l127.962 75.639V154.158z" />
      <path fill="#3C3C3B" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" />
      <path fill="#8C8C8C" d="M127.962 416.905v-104.72L0 236.585z" />
      <path fill="#141414" d="M127.961 287.958l127.96-75.637-127.96-58.162z" />
      <path fill="#393939" d="M0 212.32l127.96 75.638v-133.8z" />
    </svg>
  );
}

function marketText(m: Market): string {
  if (m.kind === "match") return `${m.teams[0].name} ${m.teams[1].name} ${m.league}`;
  return m.title;
}

function MarketCard({ market: m, onMessage }: { market: Market; onMessage: (message: string) => void }) {
  const live = "live" in m && m.live;
  const isNew = "isNew" in m && m.isNew;

  return (
    <article className="flex min-h-48 flex-col rounded-xl border border-foreground/10 bg-white p-4 shadow-sm transition hover:shadow-md">
      {m.kind === "match" ? (
        <div className="space-y-3">
          {m.teams.map((t) => (
            <div key={t.short} className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.short}
              </span>
              <span className="font-semibold">{t.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xl">
            {m.kind === "game" ? <EthIcon /> : m.icon === "churu" ? <ChuruIcon /> : m.icon}
          </span>
          <div>
            <h3 className="font-semibold leading-snug">{m.title}</h3>
            {m.kind === "game" && <p className="mt-1 text-sm text-foreground/60">{m.description}</p>}
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        {m.kind === "game" ? (
          <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:opacity-90">
            입장하기
          </button>
        ) : m.kind === "multi" ? (
          <ul className="space-y-2">
            {m.options.map((o) => (
              <li key={o} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{o}</span>
                <button className="rounded-md bg-accent/15 px-3 py-1 text-sm font-medium text-accent hover:bg-accent/25">
                  Yes
                </button>
                <button className="rounded-md bg-red-500/10 px-3 py-1 text-sm font-medium text-red-500 hover:bg-red-500/20">
                  No
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {m.kind === "match" ? (
              m.teams.map((t) => (
                <button
                  key={t.short}
                  className="truncate rounded-lg py-2.5 text-sm font-medium hover:opacity-80"
                  style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                >
                  {t.name}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => m.alerts && onMessage(m.alerts[0])}
                  className="rounded-lg bg-accent/15 py-2.5 text-sm font-medium text-accent hover:bg-accent/25"
                >
                  {m.sides[0]}
                </button>
                <button
                  onClick={() => m.alerts && onMessage(m.alerts[1])}
                  className="rounded-lg bg-red-500/10 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/20"
                >
                  {m.sides[1]}
                </button>
              </>
            )}
          </div>
        )}

        {(live || isNew) && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            {live && (
              <span className="flex items-center gap-1 font-semibold text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                LIVE
              </span>
            )}
            {isNew && <span className="font-semibold text-primary">✦ NEW</span>}
          </div>
        )}
      </div>
    </article>
  );
}
