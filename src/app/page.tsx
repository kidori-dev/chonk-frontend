"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import AccountMenu from "@/components/AccountMenu";
import CatHead from "@/components/CatHead";
import ChuruIcon from "@/components/ChuruIcon";
import Die from "@/components/Die";
import SymbolArt from "@/components/MatchSymbols";
import { ApiError, feedChuru, getPoints, hasTokens } from "@/lib/api";
import { MARKETS, type Market } from "@/lib/markets";

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다 (서버 렌더링 때는 비로그인으로 본다)
const subscribe = () => () => {};

type BuyMarket = Extract<Market, { kind: "buy" }>;

export default function LandingPage() {
  const router = useRouter();
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

  /** 츄르 사 주기: 로그인·포인트를 확인하고, 확인을 누르면 서버에서 포인트를 뺀다 */
  function buy(m: BuyMarket) {
    if (!loggedIn) {
      setMessage({ message: "로그인하면 Chonk 한테\n츄르를 사 줄 수 있어요", onConfirm: () => router.push("/login") });
      return;
    }
    const short = () =>
      setMessage({
        message: `포인트가 모자라요 😿\n츄르는 ${m.price} P 예요`,
        image: "/images/cat-grumpy.png",
      });
    if (points !== null && Number(points) < m.price) return short();

    setMessage({
      message: `츄르는 ${m.price} 포인트예요.\nChonk 한테 사 줄까요?`,
      onConfirm: async () => {
        setMessage({ message: "츄르 사는 중..." });
        try {
          const { points: after } = await feedChuru();
          setPoints(after);
          setMessage({ message: `${m.thanks}\n남은 포인트 ${formatPoints(after)} P`, image: "/images/cat-happy.png" });
        } catch (err) {
          if (err instanceof ApiError && err.status === 400) short();
          else if (err instanceof ApiError && err.status === 401) router.push("/login");
          else setMessage({ message: err instanceof Error ? err.message : "츄르를 사지 못했어요" });
        }
      },
    });
  }

  const markets = MARKETS.filter((m) => marketText(m).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="shrink-0" aria-label="Chonk 홈">
            {/* 로고 (public/images/logo-chonk.svg, 가로 35 : 세로 8) */}
            <Image src="/images/logo-chonk.svg" alt="CHONK" width={140} height={32} unoptimized priority className="h-6 w-auto" />
          </Link>
          <input
            type="search"
            placeholder="마켓 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-md bg-foreground/5 px-4 py-2 text-sm outline-primary sm:max-w-md"
          />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {loggedIn && (
              <Link href="/me" className="hidden rounded-md bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary sm:block">
                {points === null ? "내 포인트" : `${formatPoints(points)} P`}
              </Link>
            )}
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        {markets.length === 0 ? (
          <p className="py-20 text-center text-sm text-foreground/60">검색 결과가 없습니다</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {markets.map((m) => (
              <MarketCard key={m.id} market={m} onMessage={setMessage} onBuy={buy} />
            ))}
          </div>
        )}
      </main>

      {/* 메인 캐릭터는 창 오른쪽 아래에 항상 떠 있다 */}
      <CornerCat />

      <footer className="mt-auto border-t border-foreground/10">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-foreground/60">© 2026 Chonk. All rights reserved.</div>
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

// 사다리 (게임 카드 아이콘)
function LadderIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="#5b2e14" strokeWidth={2.5} strokeLinecap="round">
      <path d="M8 4v24M16 4v24M24 4v24" />
      <path d="M8 10h8M16 17h8M8 23h8" stroke="#e9823a" />
    </svg>
  );
}

/** 제비 (접힌 쪽지 두 장, 앞의 것에 당첨 별) */
function LotteryIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" stroke="#5b2e14" strokeWidth={2} strokeLinejoin="round">
      <rect x="5" y="6" width="13" height="20" rx="2" fill="#d8ecc8" transform="rotate(-12 11 16)" />
      <rect x="14" y="6" width="13" height="20" rx="2" fill="#ffd9b0" transform="rotate(8 20 16)" />
      <path d="M20.5 11.5l1.3 2.6 2.8.4-2 2 .5 2.8-2.6-1.4-2.5 1.4.5-2.8-2-2 2.8-.4z" fill="#e9823a" strokeWidth={1.2} />
    </svg>
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

function MarketCard({
  market: m,
  onMessage,
  onBuy,
}: {
  market: Market;
  onMessage: (dialog: Dialog) => void;
  onBuy: (m: BuyMarket) => void;
}) {
  if (m.kind === "soon") return <SoonCard />;

  const live = "live" in m && m.live;
  const isNew = "isNew" in m && m.isNew;
  const best = "best" in m && m.best;
  const tag = "tag" in m ? m.tag : undefined;

  return (
    <article
      className={`relative flex min-h-48 flex-col rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md ${
        best ? "border-primary/50 ring-2 ring-primary/15" : "border-foreground/10"
      }`}
    >
      {/* 추천 게임: 오른쪽 위 모서리에 작은 왕관 */}
      {best && (
        <span
          title="추천 게임"
          className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-sm shadow-md"
        >
          👑
        </span>
      )}
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
            {m.icon === "eth" ? <EthIcon /> : m.icon === "churu" ? <ChuruIcon /> : m.icon === "cat" ? <CatHead cat="orange" className="h-8 w-8" /> : m.icon === "mouse" ? <SymbolArt symbol="mouse" className="h-8 w-8" /> : m.icon === "dice" ? <Die value={5} className="h-8 w-8" /> : m.icon === "ladder" ? <LadderIcon /> : m.icon === "lottery" ? <LotteryIcon /> : m.icon}
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
            onClick={() => onBuy(m)}
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

        {(live || isNew || tag) && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            {live && (
              <span className="flex items-center gap-1 font-semibold text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                LIVE
              </span>
            )}
            {tag && <span className="rounded-full bg-foreground/5 px-2 py-0.5 font-semibold text-foreground/60">{tag}</span>}
            {isNew && <span className="font-semibold text-primary">✦ NEW</span>}
          </div>
        )}
      </div>
    </article>
  );
}
