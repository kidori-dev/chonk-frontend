"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { BLOCK_INTERVAL_MS, getPoints, getRecentBlocks, hasTokens, subscribeBlocks, type Block } from "@/lib/api";

// 블록 해시의 마지막 글자(16진수)가 홀수면 동전 앞면, 짝수면 뒷면
type Side = "odd" | "even";

const SIDE = {
  odd: { label: "앞면", short: "앞", coin: "#e9823a", coinLight: "#f8b47a", coinDark: "#c4651f", coinDeep: "#9a4a12", digits: "1 3 5 7 9 b d f", text: "text-primary", bg: "bg-primary", soft: "bg-primary/10" },
  even: { label: "뒷면", short: "뒤", coin: "#8fb339", coinLight: "#bfdc72", coinDark: "#6f8f22", coinDeep: "#506a15", digits: "0 2 4 6 8 a c e", text: "text-accent", bg: "bg-accent", soft: "bg-accent/15" },
} as const;

const HISTORY_SIZE = 12;

function lastChar(hash: string): string {
  return hash.slice(-1);
}

function sideOf(hash: string): Side {
  return parseInt(lastChar(hash), 16) % 2 === 0 ? "even" : "odd";
}

/** 0x1234…cdef 처럼 가운데를 줄인다 */
function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6, -1)}`;
}

/** 판정이 끝난 배팅. char 는 판정 블록 해시의 마지막 글자 */
type Result = { blockNumber: number; pick: Side; win: boolean; char: string };

const MY_BETS_SIZE = 50;

/** 배팅 기록 카드에 보여줄 줄 수 (결과 기다리는 줄 포함) */
const MY_BETS_SHOWN = 5;

/**
 * 라운드 규칙: 지금 블록이 N 이면 N+2 블록에 건다.
 * N+1 이 나오는 순간 N+2 배팅은 마감(locked)되고 N+3 배팅이 열린다.
 * 블록이 퍼지는 사이에 결과를 먼저 알고 거는 걸 막기 위해 한 블록 여유를 둔다.
 */
const BET_AHEAD = 2;

/** 블록이 나오고 9초 동안만 배팅할 수 있고, 다음 블록 전 마지막 3초는 마감 */
const BET_OPEN_MS = BLOCK_INTERVAL_MS - 3_000;

/** 마감되어 결과를 기다리는 배팅 */
type LockedBet = { side: Side; target: number };

/** 라운드가 끝난 뒤 다음 선택을 어떻게 할지. manual(기본): 비움, fixed: 같은 면 유지, random: 무작위로 자동 선택 */
type PickMode = "manual" | "fixed" | "random";

/** 켜고 끄는 자동 배팅 버튼. 둘 다 꺼져 있으면 매번 직접 고른다(manual) */
const PICK_MODES: { mode: PickMode; label: string }[] = [
  { mode: "random", label: "🎲 랜덤 자동배팅" },
  { mode: "fixed", label: "📌 고정 배팅" },
];

function randomSide(): Side {
  return Math.random() < 0.5 ? "odd" : "even";
}

export default function EthHashGamePage() {
  const [blocks, setBlocks] = useState<Block[]>([]); // 최신이 앞
  const [pick, setPick] = useState<Side | null>(null);
  // 내 배팅 기록(최신이 앞). 백엔드 배팅 API 가 생기기 전까지는 이 화면에 있는 동안만 쌓인다
  const [myBets, setMyBets] = useState<Result[]>([]);
  const [now, setNow] = useState(0);
  const [mode, setMode] = useState<PickMode>("manual");
  const [locked, setLocked] = useState<LockedBet | null>(null);
  // 새 블록 콜백에서 최신 선택/모드/마감 배팅을 읽기 위해 ref 로도 들고 있는다
  const pickRef = useRef<Side | null>(null);
  const modeRef = useRef<PickMode>("manual");
  const lockedRef = useRef<LockedBet | null>(null);

  function choose(side: Side | null) {
    pickRef.current = side;
    setPick(side);
  }

  function changeMode(next: PickMode) {
    modeRef.current = next;
    setMode(next);
    // 랜덤으로 바꾸면 이번 라운드도 바로 골라 준다 (배팅 마감 중이면 다음 라운드부터)
    if (next === "random" && !pickRef.current && !betClosed) choose(randomSide());
  }

  useEffect(() => {
    let cancelled = false;
    getRecentBlocks(HISTORY_SIZE).then((b) => !cancelled && setBlocks(b));

    const unsubscribe = subscribeBlocks((block) => {
      setBlocks((prev) => [block, ...prev].slice(0, HISTORY_SIZE));

      // 1) 마감된 배팅의 판정 블록이면 결과를 낸다
      const bet = lockedRef.current;
      if (bet && bet.target === block.number) {
        const r = { blockNumber: block.number, pick: bet.side, win: sideOf(block.hash) === bet.side, char: lastChar(block.hash) };
        setMyBets((prev) => [r, ...prev].slice(0, MY_BETS_SIZE));
      }

      // 2) 열려 있던 배팅(이번 블록 + 1 을 노리던 것)을 마감한다
      const p = pickRef.current;
      const nextLocked = p ? { side: p, target: block.number + 1 } : null;
      lockedRef.current = nextLocked;
      setLocked(nextLocked);

      // 3) 새 라운드(이번 블록 + 2) 선택
      const m = modeRef.current;
      choose(m === "fixed" ? p : m === "random" ? randomSide() : null);
    });

    // 다음 블록까지 남은 시간 표시용
    const timer = setInterval(() => setNow(Date.now()), 200);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const latest = blocks[0];
  const previous = blocks.slice(1);
  const elapsed = latest && now ? Math.max(0, now - latest.timestamp) : 0;
  const progress = Math.min(1, elapsed / BLOCK_INTERVAL_MS);
  const remain = Math.max(0, Math.ceil((BLOCK_INTERVAL_MS - elapsed) / 1000));
  // 지금 라운드 배팅 마감 여부. 블록 시각 기준이라, 실제 블록을 붙이면 블록을 받은 시각으로 계산해야 한다
  const betClosed = !latest || elapsed >= BET_OPEN_MS;
  const betRemain = Math.max(0, Math.ceil((BET_OPEN_MS - elapsed) / 1000));

  const oddCount = blocks.filter((b) => sideOf(b.hash) === "odd").length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">이더리움 블록 동전 던지기</h1>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE
          </span>
        </div>
      </header>

      {/* 넓은 화면: 왼쪽 블록 / 오른쪽 배팅·자산. 좁은 화면: 블록 → 배팅·자산 → 기록 순으로 세로 */}
      {/* 모바일에서는 배팅 카드가 화면 아래에 떠 있으므로 그만큼 아래 여백을 둔다 */}
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-6 pb-72 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-6">
        {/* 최신 블록 */}
        <section className="overflow-hidden rounded-xl lg:col-start-1 border border-foreground/10 bg-white shadow-sm">
          {latest ? <LatestBlock key={latest.hash} block={latest} /> : <p className="py-24 text-center text-foreground/50">블록 불러오는 중...</p>}

          {/* 다음 블록까지 진행 바 */}
          <div className="border-t border-foreground/10 px-6 py-5">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-foreground/60">
                다음 블록 <b className="text-foreground">{latest ? `#${(latest.number + 1).toLocaleString()}` : ""}</b>
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  remain > 0 ? "bg-eth/10 text-eth" : "animate-pulse bg-eth text-white"
                }`}
              >
                {remain > 0 ? `${remain}초` : "곧 나와요!"}
              </span>
            </div>
            {/* 줄무늬가 흘러가는 막대 + 끝에 동글한 손잡이 */}
            <div className="relative h-4 rounded-full bg-foreground/[0.07] shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)]">
              {/* 배팅 마감 구간(마지막 3초) */}
              <span
                className="absolute inset-y-0 right-0 rounded-r-full bg-red-400/20"
                style={{ width: `${(1 - BET_OPEN_MS / BLOCK_INTERVAL_MS) * 100}%` }}
              />
              <div
                className="progress-stripes relative h-full rounded-full bg-eth transition-[width] duration-200 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
              <span
                className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-eth bg-white shadow-md transition-[left] duration-200 ease-linear"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
            <div
              className="mt-2 grid text-[11px] text-foreground/40"
              style={{ gridTemplateColumns: `${BET_OPEN_MS}fr ${BLOCK_INTERVAL_MS - BET_OPEN_MS}fr` }}
            >
              <span>배팅 가능</span>
              <span className="text-right text-red-400">마감</span>
            </div>
          </div>
        </section>

        {/* 오른쪽: 배팅 + 내 자산(배팅 기록 포함) */}
        <aside className="lg:sticky lg:space-y-4 lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          {/* 배팅: 모바일은 화면 아래 고정, 넓은 화면은 오른쪽 카드 */}
          <section className="fixed inset-x-0 bottom-0 z-20 rounded-t-xl border-t border-foreground/10 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.08)] lg:static lg:rounded-xl lg:border lg:p-5 lg:shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">배팅</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  betClosed ? "bg-red-50 text-red-500" : "bg-eth/10 text-eth"
                }`}
              >
                {betClosed ? "🔒 배팅 마감" : `⏱ 마감까지 ${betRemain}초`}
              </span>
            </div>
            {/* 앞면/뒷면 선택. 지금 블록이 N 이면 N+2 블록에 건다 */}
            <p className="mt-1 mb-3 text-sm text-foreground/60 lg:mb-4">
              {latest && <b className="text-eth">#{(latest.number + BET_AHEAD).toLocaleString()}</b>} 블록 해시의{" "}
              <b className="text-foreground">마지막 글자</b>는?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["odd", "even"] as const).map((side) => {
                const s = SIDE[side];
                const selected = pick === side;
                return (
                  <button
                    key={side}
                    onClick={() => choose(selected ? null : side)} // 한 번 더 누르면 배팅 취소
                    disabled={betClosed}
                    className={`relative rounded-lg py-3 text-2xl font-black lg:py-5 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
                      selected ? `${s.bg} scale-[1.02] text-white shadow-lg` : `${s.soft} ${s.text} hover:scale-[1.02]`
                    }`}
                  >
                    {s.label}
                    <span className="mt-1 block text-xs font-medium opacity-80">{s.digits}</span>
                    {/* 선택 표시 */}
                    {selected && (
                      <span
                        className={`animate-pop absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black shadow-md ${s.text}`}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* 다음 라운드 선택 방식 */}
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-foreground/5 p-1 text-xs font-semibold">
              {PICK_MODES.map(({ mode: m, label }) => (
                <button
                  key={m}
                  onClick={() => changeMode(mode === m ? "manual" : m)} // 켜져 있으면 끈다
                  className={`rounded-md py-2 transition ${
                    mode === m ? "bg-white text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-sm text-foreground/60">
              {betClosed && latest ? (
                <>
                  배팅 마감! 다음 블록이 나오면 <b className="text-eth">#{(latest.number + BET_AHEAD + 1).toLocaleString()}</b> 배팅이 열려요
                </>
              ) : pick ? (
                <>
                  <b className={SIDE[pick].text}>{SIDE[pick].label}</b> 선택!{" "}
                  {mode === "fixed" && "매 라운드 같은 면으로 걸어요"}
                  {mode === "random" && "라운드마다 무작위로 골라요"}
                  {mode === "manual" && "블록이 나오면 결과를 알려드려요"}
                </>
              ) : mode === "fixed" ? (
                "고정할 면을 골라 주세요"
              ) : (
                "앞면이나 뒷면을 골라 주세요"
              )}
            </p>
          </section>

          <MyWallet bets={myBets} locked={locked} />
        </aside>

        {/* 블록 기록 */}
        <div className="min-w-0 space-y-6 lg:col-start-1">
          {/* 블록 체인: 새 블록이 왼쪽에서 밀고 들어온다 */}
          {blocks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">최근 블록</h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-primary">앞면 {oddCount}</span>
                  <span className="text-accent">뒷면 {blocks.length - oddCount}</span>
                </div>
              </div>
              <div className="overflow-hidden">
                <div key={latest?.hash} className="animate-chain flex gap-2">
                  {blocks.map((b, i) => {
                    const s = SIDE[sideOf(b.hash)];
                    return (
                      <div
                        key={b.hash}
                        className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border-2 ${
                          i === 0 ? "animate-pop border-current shadow-md" : "border-transparent"
                        } ${s.soft} ${s.text}`}
                      >
                        <span className="font-mono text-2xl font-black leading-none">{lastChar(b.hash)}</span>
                        <span className="mt-1 text-[10px] text-foreground/50">#{String(b.number).slice(-4)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 이전 블록 해시 */}
          {previous.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">이전 블록 해시</h2>
              <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 bg-white">
                {previous.map((b) => {
                  const side = sideOf(b.hash);
                  return (
                    <li key={b.hash} className="flex items-center gap-3 px-4 py-3">
                      {/* 블록 번호를 누르면 이더스캔에서 블록 정보를 연다 */}
                      <a
                        href={`https://etherscan.io/block/${b.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-24 shrink-0 text-xs tabular-nums text-blue-600 hover:underline"
                      >
                        #{b.number.toLocaleString()}
                      </a>
                      <span className="flex min-w-0 flex-1 items-baseline font-mono text-sm text-foreground/70" title={b.hash}>
                        <span className="hidden truncate sm:inline">{b.hash.slice(0, -1)}</span>
                        <span className="sm:hidden">{shortHash(b.hash)}</span>
                        <b className={`text-base ${SIDE[side].text}`}>{lastChar(b.hash)}</b>
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-white ${SIDE[side].bg}`}>
                        {SIDE[side].short}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다
const subscribeNothing = () => () => {};

/** 내 자산과 배팅 기록. 로그인했을 때만 보여준다 */
function MyWallet({ bets, locked }: { bets: Result[]; locked: LockedBet | null }) {
  const loggedIn = useSyncExternalStore(subscribeNothing, hasTokens, () => false);
  const [points, setPoints] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    getPoints()
      .then((p) => setPoints(p.points))
      .catch(() => setPoints(null));
  }, [loggedIn]);

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
          {!locked && bets.length === 0 ? (
            <p className="mt-3 text-center text-sm text-foreground/50">아직 배팅 기록이 없어요</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {/* 마감되어 결과를 기다리는 배팅 */}
              {locked && (
                <li
                  key={`locked-${locked.target}`}
                  className="animate-pop flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2.5 text-sm text-eth"
                >
                  <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">🔒 #{locked.target.toLocaleString()}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold text-white ${SIDE[locked.side].bg}`}>
                    {SIDE[locked.side].short}
                  </span>
                  <span className="ml-auto animate-pulse text-xs font-semibold">결과 기다리는 중</span>
                </li>
              )}
              {bets.slice(0, locked ? MY_BETS_SHOWN - 1 : MY_BETS_SHOWN).map((b) => {
                const result = SIDE[sideOf(b.char)];
                return (
                  <li
                    key={b.blockNumber}
                    className={`animate-pop flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
                      b.win ? "bg-sky-50" : "bg-foreground/[0.03]"
                    }`}
                  >
                    <a
                      href={`https://etherscan.io/block/${b.blockNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-24 shrink-0 text-xs tabular-nums text-blue-600 hover:underline"
                    >
                      #{b.blockNumber.toLocaleString()}
                    </a>
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold text-white ${SIDE[b.pick].bg}`}>
                      {SIDE[b.pick].short}
                    </span>
                    <span className="text-xs text-foreground/40">→</span>
                    <span className={`font-mono font-black ${result.text}`}>{b.char}</span>
                    <span className={`ml-auto text-xs font-bold ${b.win ? "text-sky-600" : "text-foreground/50"}`}>
                      {b.win ? "🎉 맞췄어요!" : "😿 아쉬워요"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** 최신 블록. 해시가 잠깐 뒤섞였다가 자리를 잡고, 마지막 글자가 크게 튀어나온다 */
function LatestBlock({ block }: { block: Block }) {
  const side = sideOf(block.hash);
  const s = SIDE[side];
  const body = block.hash.slice(0, -1);
  // 화면에 보이는 해시. 앞에서부터 몇 글자씩 확정되고 나머지는 무작위 글자로 돌아간다
  const [text, setText] = useState(body.slice(0, 2));

  useEffect(() => {
    let shown = 2; // "0x" 는 처음부터 확정
    const timer = setInterval(() => {
      shown = Math.min(body.length, shown + 3);
      setText(body.slice(0, shown) + randomHex(body.length - shown));
      if (shown === body.length) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [body]);

  const done = text === body;

  // 동전이 다 돌고 멈췄는지 (돌기 애니메이션 2.2초)
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLanded(true), COIN_SPIN_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
      <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
        블록 #{block.number.toLocaleString()}
      </span>

      {/* 해시. 마지막 글자만 진하게 */}
      <p className="mt-4 max-w-full font-mono text-xs leading-relaxed break-all text-foreground/50 sm:text-sm">
        {text}
        {done && <b className={`animate-pop text-base ${s.text}`}>{lastChar(block.hash)}</b>}
      </p>

      {/* 동전: 위로 튀어 오르며 여러 바퀴 돌다가 결과 면으로 떨어진다. 아래 그림자는 높이에 따라 줄었다 늘었다 한다 */}
      <div className="relative mt-16 flex h-44 w-40 flex-col items-center justify-end">
        <span className="animate-coin-shadow absolute bottom-0 h-3 w-28 rounded-full bg-foreground/20 blur-sm" />
        <div className="animate-coin-toss relative mb-5 h-36 w-36" style={{ perspective: 800 }}>
          <div
            className="animate-coin-spin relative h-full w-full"
            style={{ "--coin-end": side === "odd" ? "2160deg" : "2340deg" } as React.CSSProperties}
          >
            {/* 동전 두께: 원판 여러 장을 겹쳐 옆에서 볼 때 두께가 보이게 한다 (앞쪽 절반은 주황, 뒤쪽 절반은 초록) */}
            {Array.from({ length: COIN_THICKNESS }, (_, i) => (
              <span
                key={i}
                className="absolute inset-0 rounded-full"
                style={{
                  transform: `translateZ(${-i - 1}px)`,
                  background: i < COIN_THICKNESS / 2 ? SIDE.odd.coinDeep : SIDE.even.coinDeep,
                }}
              />
            ))}
            <CoinFace side="odd" char={landed && side === "odd" ? lastChar(block.hash) : null} />
            <CoinFace side="even" char={landed && side === "even" ? lastChar(block.hash) : null} />
          </div>
        </div>
      </div>
    </div>
  );
}

const COIN_THICKNESS = 12;

/** 동전 돌기 애니메이션 길이 (globals.css 의 animate-coin-spin 과 맞춘다) */
const COIN_SPIN_MS = 2200;

/** 동전 한 면. 앞면은 주황, 뒷면은 초록(두께만큼 뒤에 뒤집혀 붙어 있다). char 가 있으면 그 글자를, 없으면 "?" 를 새긴다 */
function CoinFace({ side, char }: { side: Side; char: string | null }) {
  const s = SIDE[side];
  // 도드라지게 새긴 글자: 아래는 진한 그림자, 위는 살짝 밝은 테두리
  const text = { textShadow: `0 -1px 0 rgb(255 255 255 / 0.35), 0 3px 0 ${s.coinDark}, 0 5px 8px rgb(0 0 0 / 0.25)` };

  return (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        backfaceVisibility: "hidden",
        transform: side === "even" ? `rotateY(180deg) translateZ(${COIN_THICKNESS + 1}px)` : undefined,
        // 테두리: 왼쪽 위는 밝고 오른쪽 아래는 어두워 볼록 솟은 느낌
        background: `linear-gradient(145deg, ${s.coinLight}, ${s.coinDark} 45%, ${s.coinDeep})`,
        boxShadow: "0 8px 18px rgb(0 0 0 / 0.22)",
      }}
    >
      <div
        className="absolute inset-[8px] flex items-center justify-center overflow-hidden rounded-full text-white"
        style={{
          // 가운데가 살짝 부푼 면
          background: `radial-gradient(circle at 35% 30%, ${s.coinLight}, ${s.coin} 55%, ${s.coinDark})`,
          // 테두리 안쪽으로 한 단 들어간 느낌
          boxShadow: `inset 0 3px 5px rgb(0 0 0 / 0.25), inset 0 -3px 4px rgb(255 255 255 / 0.25), 0 0 0 2px ${s.coinDeep}40`,
        }}
      >
        {/* 왼쪽 위 반들반들한 광택 */}
        <span className="absolute top-3 left-5 h-5 w-9 -rotate-[25deg] rounded-full bg-white/45 blur-[1px]" />
        {/* 도는 동안은 양면 모두 "?", 멈추면 결과 면에 해시 마지막 글자가 튀어나온다 */}
        <span
          key={char ?? "?"}
          className={`relative font-mono leading-none font-black ${char ? "animate-pop text-7xl" : "text-6xl"}`}
          style={text}
        >
          {char ?? "?"}
        </span>
        {/* 떨어진 뒤 표면을 스치는 빛 */}
        <span className="animate-coin-shine pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}

function randomHex(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += "0123456789abcdef"[Math.floor(Math.random() * 16)];
  return out;
}
