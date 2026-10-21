"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import CatHead from "@/components/CatHead";
import ChuruIcon from "@/components/ChuruIcon";
import SymbolArt from "@/components/MatchSymbols";
import { getPoints, hasTokens } from "@/lib/api";
import { MARKETS, type Market } from "@/lib/markets";

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다 (서버 렌더링 때는 비로그인으로 본다)
const subscribe = () => () => {};

export default function LandingPage() {
  const loggedIn = useSyncExternalStore(subscribe, hasTokens, () => false);
  const [query, setQuery] = useState("");
  // 카드 버튼을 눌렀을 때 띄우는 메시지 (null 이면 닫힘)
  const [message, setMessage] = useState<Dialog | null>(null);
  // 로그인했으면 상단 버튼에 내 포인트를 보여준다
  const [points, setPoints] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    getPoints()
      .then((p) => setPoints(p.points))
      .catch(() => setPoints(null));
  }, [loggedIn]);

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
            className="min-w-0 flex-1 rounded-md bg-foreground/5 px-4 py-2 text-sm outline-primary sm:max-w-md"
          />
          <Link
            href={loggedIn ? "/me" : "/login"}
            className="ml-auto shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            {!loggedIn ? "로그인" : points === null ? "내 포인트" : `${formatPoints(points)} P`}
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
          </div>
        )}
      </main>

      {/* 메인 캐릭터는 창 오른쪽 아래에 항상 떠 있다 */}
      <CornerCat />

      <footer className="mt-auto border-t border-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:pr-44">
          <span className="font-bold text-foreground">Chonk</span>
          <span>© 2026 Chonk. All rights reserved.</span>
        </div>
      </footer>

      {message && <MessageModal dialog={message} onClose={() => setMessage(null)} />}
    </div>
  );
}

// 브라우저 기본 alert 대신 쓰는 메시지 창. 바깥을 누르거나 Esc 로도 닫힌다
function MessageModal({ dialog, onClose }: { dialog: Dialog; onClose: () => void }) {
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
        className="animate-pop w-full max-w-xs rounded-lg bg-white p-6 text-center shadow-xl"
      >
        {dialog.image ? (
          <Image src={dialog.image} alt="" width={512} height={539} className="mx-auto h-28 w-auto" />
        ) : (
          <Image src="/images/main.png" alt="" width={1131} height={1237} className="mx-auto h-24 w-auto brightness-110" />
        )}
        <p className="mt-4 text-lg font-bold whitespace-pre-line">{dialog.message}</p>
        {dialog.onConfirm ? (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              className="rounded-md bg-foreground/5 py-2.5 text-sm font-medium text-foreground/70 hover:bg-foreground/10"
            >
              취소
            </button>
            <button
              autoFocus
              onClick={dialog.onConfirm}
              className="rounded-md bg-primary py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              확인
            </button>
          </div>
        ) : (
          <button
            autoFocus
            onClick={onClose}
            className="mt-6 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            확인
          </button>
        )}
      </div>
    </div>
  );
}

/** 창 오른쪽 아래에 떠 있는 심술냥이 */
function CornerCat() {
  return (
    <Image
      src="/images/cat-grumpy.png"
      alt="Chonk"
      width={512}
      height={539}
      className="pointer-events-none fixed right-3 bottom-3 z-10 h-24 w-auto sm:right-6 sm:bottom-4 sm:h-36"
    />
  );
}

// 이더리움 코인 (public/images/coin-eth.svg)
function EthIcon() {
  return <Image src="/images/coin-eth.svg" alt="" width={32} height={32} unoptimized className="h-8 w-8" />;
}

/** "10000" → "10,000". 숫자가 아니면 그대로 */
function formatPoints(points: string): string {
  const n = Number(points);
  return Number.isFinite(n) ? n.toLocaleString() : points;
}

/** 준비 중인 게임 카드 */
function SoonCard() {
  return (
    <article className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-foreground/15 bg-white/60 p-4">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-4xl font-black text-primary">
        ?
      </span>
      <span className="rounded-sm bg-foreground/5 px-3 py-1 text-xs font-bold tracking-widest text-foreground/50">
        COMING SOON
      </span>
    </article>
  );
}

function marketText(m: Market): string {
  if (m.kind === "match") return `${m.teams[0].name} ${m.teams[1].name} ${m.league}`;
  return m.title;
}

/** 메시지 창 내용. onConfirm 이 있으면 확인/취소 두 버튼을 보여준다. image 가 없으면 메인 캐릭터 */
type Dialog = { message: string; image?: string; onConfirm?: () => void };

function MarketCard({ market: m, onMessage }: { market: Market; onMessage: (dialog: Dialog) => void }) {
  if (m.kind === "soon") return <SoonCard />;

  const live = "live" in m && m.live;
  const isNew = "isNew" in m && m.isNew;

  return (
    <article className="flex min-h-48 flex-col rounded-lg border border-foreground/10 bg-white p-4 shadow-sm transition hover:shadow-md">
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
            {m.icon === "eth" ? <EthIcon /> : m.icon === "churu" ? <ChuruIcon /> : m.icon === "cat" ? <CatHead cat="orange" className="h-8 w-8" /> : m.icon === "mouse" ? <SymbolArt symbol="mouse" className="h-8 w-8" /> : m.icon}
          </span>
          <div>
            <h3 className="font-semibold leading-snug">{m.title}</h3>
            {m.kind === "game" && <p className="mt-1 text-sm text-foreground/60">{m.description}</p>}
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        {m.kind === "game" ? (
          <Link
            href={m.href}
            className="block w-full rounded-md bg-primary py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
          >
            입장하기
          </Link>
        ) : m.kind === "buy" ? (
          <button
            onClick={() =>
              onMessage({
                message: `츄르는 ${m.price} 코인이에요.
Chonk 한테 사 줄까요?`,
                onConfirm: () => onMessage({ message: m.thanks, image: "/images/cat-happy.png" }),
              })
            }
            className="w-full rounded-md bg-accent/15 py-2.5 text-sm font-medium text-accent hover:bg-accent/25"
          >
            {m.button}
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
                  className="truncate rounded-md py-2.5 text-sm font-medium hover:opacity-80"
                  style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                >
                  {t.name}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => m.alerts && onMessage({ message: m.alerts[0] })}
                  className="rounded-md bg-accent/15 py-2.5 text-sm font-medium text-accent hover:bg-accent/25"
                >
                  {m.sides[0]}
                </button>
                <button
                  onClick={() => m.alerts && onMessage({ message: m.alerts[1] })}
                  className="rounded-md bg-red-500/10 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/20"
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
