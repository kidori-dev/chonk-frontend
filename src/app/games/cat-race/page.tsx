"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import CatHead, { type CatKind } from "@/components/CatHead";
import BetAmountPicker from "@/components/BetAmountPicker";
import PickModeToggle from "@/components/PickModeToggle";
import WalletCard from "@/components/WalletCard";
import { BLOCK_INTERVAL_MS, getRecentBlocks, subscribeBlocks, type Block } from "@/lib/api";
import { BET_AHEAD, BET_AMOUNTS, BET_OPEN_MS, MY_BETS_SHOWN, MY_BETS_SIZE, type PickMode } from "@/lib/betting";

// 고양이 경주. 블록 해시 64글자를 앞에서부터 읽으며 글자마다 해당 고양이가 한 칸씩 달린다
// 0~3 치즈, 4~7 까망, 8~b 삼색이, c~f 하양. 가장 많이 달린 고양이가 우승 (동점이면 먼저 그 칸에 도착한 고양이)

const CATS: {
  kind: CatKind;
  name: string;
  range: string;
  color: string;
  lane: string;
}[] = [
  {
    kind: "orange",
    name: "치즈",
    range: "0~3",
    color: "#e9823a",
    lane: "#fff1e4",
  },
  {
    kind: "black",
    name: "까망",
    range: "4~7",
    color: "#3d3434",
    lane: "#efebea",
  },
  {
    kind: "calico",
    name: "삼색이",
    range: "8~b",
    color: "#b4622a",
    lane: "#fbf0e6",
  },
  {
    kind: "white",
    name: "하양",
    range: "c~f",
    color: "#5d97c0",
    lane: "#eef5fa",
  },
];

const HISTORY_SIZE = 12;
/** 해시 한 글자를 읽는 시간. 64글자 경주가 약 3.5초 */
const STEP_MS = 55;
const RACE_MS = STEP_MS * 64;

/** tied: 최고 점수가 같은 고양이들 (2마리 이상이면 사진 판정) */
type Race = { steps: number[]; counts: number[]; max: number; winner: number; tied: number[] };

function runRace(hash: string): Race {
  const steps = hash
    .slice(2)
    .split("")
    .map((c) => Math.floor(parseInt(c, 16) / 4));
  const counts = [0, 0, 0, 0];
  steps.forEach((s) => counts[s]++);
  const max = Math.max(...counts);
  // 동점이면 먼저 max 칸에 도착한 고양이가 우승
  const running = [0, 0, 0, 0];
  let winner = 0;
  for (const s of steps) {
    running[s]++;
    if (running[s] === max) {
      winner = s;
      break;
    }
  }
  const tied = counts.flatMap((c, i) => (c === max ? [i] : []));
  return { steps, counts, max, winner, tied };
}

type LockedBet = { cat: number; amount: number; target: number };

/** 4마리 중 1등을 맞히면 건 금액의 4배를 돌려받는다 */
const PAYOUT = 4;

function randomCat(): number {
  return Math.floor(Math.random() * CATS.length);
}
type Result = {
  blockNumber: number;
  pick: number;
  amount: number;
  winner: number;
  win: boolean;
};

export default function CatRacePage() {
  const [blocks, setBlocks] = useState<Block[]>([]); // 최신이 앞
  const [pick, setPick] = useState<number | null>(null);
  const [locked, setLocked] = useState<LockedBet | null>(null);
  // 내 배팅 기록(최신이 앞). 백엔드 배팅 API 가 생기기 전까지는 이 화면에 있는 동안만 쌓인다
  const [results, setResults] = useState<Result[]>([]);
  const [now, setNow] = useState(0);
  const [mode, setMode] = useState<PickMode>("manual");
  const [amount, setAmount] = useState(BET_AMOUNTS[0]);
  const amountRef = useRef(BET_AMOUNTS[0]);
  // 새 블록 콜백에서 최신 값을 읽기 위한 ref
  const pickRef = useRef<number | null>(null);
  const lockedRef = useRef<LockedBet | null>(null);
  const modeRef = useRef<PickMode>("manual");

  function choose(cat: number | null) {
    pickRef.current = cat;
    setPick(cat);
  }

  function changeMode(next: PickMode) {
    modeRef.current = next;
    setMode(next);
    // 랜덤으로 바꾸면 이번 라운드도 바로 골라 준다 (배팅 마감 중이면 다음 라운드부터)
    if (next === "random" && pickRef.current === null && !betClosed) choose(randomCat());
  }

  useEffect(() => {
    let cancelled = false;
    getRecentBlocks(HISTORY_SIZE).then((b) => !cancelled && setBlocks(b));
    const timers: ReturnType<typeof setTimeout>[] = [];

    const unsubscribe = subscribeBlocks((block) => {
      setBlocks((prev) => [block, ...prev].slice(0, HISTORY_SIZE));

      // 1) 마감된 배팅의 경주 블록이면, 경주 애니메이션이 끝난 뒤 결과를 낸다
      const bet = lockedRef.current;
      if (bet && bet.target === block.number) {
        const { winner } = runRace(block.hash);
        const r = {
          blockNumber: block.number,
          pick: bet.cat,
          amount: bet.amount,
          winner,
          win: winner === bet.cat,
        };
        timers.push(setTimeout(() => setResults((prev) => [r, ...prev].slice(0, MY_BETS_SIZE)), RACE_MS));
      }

      // 2) 열려 있던 배팅을 마감한다
      const p = pickRef.current;
      const next = p === null ? null : { cat: p, amount: amountRef.current, target: block.number + 1 };
      lockedRef.current = next;
      setLocked(next);

      // 3) 새 라운드 선택 (고정이면 같은 고양이, 랜덤이면 무작위)
      const m = modeRef.current;
      choose(m === "fixed" ? p : m === "random" ? randomCat() : null);
    });

    const tick = setInterval(() => setNow(Date.now()), 200);
    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
  }, []);

  const latest = blocks[0];
  const previous = blocks.slice(1);
  const elapsed = latest && now ? Math.max(0, now - latest.timestamp) : 0;
  const betClosed = !latest || elapsed >= BET_OPEN_MS;
  const betRemain = Math.max(0, Math.ceil((BET_OPEN_MS - elapsed) / 1000));
  const blockRemain = Math.max(0, Math.ceil((BLOCK_INTERVAL_MS - elapsed) / 1000));

  // 최근 경주 우승 횟수
  const wins = [0, 0, 0, 0];
  blocks.forEach((b) => wins[runRace(b.hash).winner]++);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">고양이 경주</h1>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE
          </span>
        </div>
      </header>

      {/* 모바일에서는 배팅 카드가 화면 아래에 떠 있으므로 그만큼 아래 여백을 둔다 */}
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-6 pb-96 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-6">
        {/* 경주 트랙 */}
        <section className="overflow-hidden rounded-xl border border-foreground/10 bg-white shadow-sm lg:col-start-1">
          {latest ? (
            <RaceTrack key={latest.hash} block={latest} />
          ) : (
            <p className="py-24 text-center text-foreground/50">블록 불러오는 중...</p>
          )}
          <div className="flex items-center justify-between border-t border-foreground/10 px-5 py-3 text-sm">
            <span className="text-foreground/60">
              다음 경주 <b className="text-foreground">{latest ? `#${(latest.number + 1).toLocaleString()}` : ""}</b>
            </span>
            <span className="rounded-full bg-eth/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-eth">
              {blockRemain > 0 ? `${blockRemain}초 뒤 출발` : "곧 출발!"}
            </span>
          </div>
        </section>

        {/* 오른쪽: 배팅(모바일은 화면 아래 고정) + 내 자산 */}
        <aside className="lg:sticky lg:space-y-4 lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <section className="fixed inset-x-0 bottom-0 z-20 rounded-t-xl border-t border-foreground/10 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.08)] lg:static lg:rounded-xl lg:border lg:p-5 lg:shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">우승 고양이 맞히기</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  betClosed ? "bg-red-50 text-red-500" : "bg-eth/10 text-eth"
                }`}
              >
                {betClosed ? "🔒 배팅 마감" : `⏱ 마감까지 ${betRemain}초`}
              </span>
            </div>
            <p className="mt-1 mb-3 text-sm text-foreground/60">
              {latest && <b className="text-eth">#{(latest.number + BET_AHEAD).toLocaleString()}</b>} 블록 경주 1등은?
            </p>

            <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
              {CATS.map((cat, i) => {
                const selected = pick === i;
                return (
                  <button
                    key={cat.kind}
                    onClick={() => choose(selected ? null : i)} // 한 번 더 누르면 취소
                    disabled={betClosed}
                    className="relative flex flex-col items-center rounded-lg border-2 py-2 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 lg:py-3"
                    style={{
                      borderColor: selected ? cat.color : "transparent",
                      background: selected ? `${cat.color}26` : cat.lane,
                    }}
                  >
                    <CatHead cat={cat.kind} className="h-10 w-10 lg:h-12 lg:w-12" />
                    <span className="mt-1 text-sm font-black" style={{ color: cat.color }}>
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-foreground/50">{cat.range}</span>
                    {selected && (
                      <span
                        className="animate-pop absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black shadow-md"
                        style={{ color: cat.color }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <BetAmountPicker
              amount={amount}
              times={PAYOUT}
              disabled={betClosed}
              onChange={(a) => {
                amountRef.current = a;
                setAmount(a);
              }}
            />
            <PickModeToggle mode={mode} onChange={changeMode} />

            <p className="mt-3 text-center text-sm text-foreground/60">
              {betClosed && latest ? (
                <>
                  배팅 마감! 다음 블록이 나오면{" "}
                  <b className="text-eth">#{(latest.number + BET_AHEAD + 1).toLocaleString()}</b> 배팅이 열려요
                </>
              ) : pick !== null ? (
                <>
                  <b style={{ color: CATS[pick].color }}>{CATS[pick].name}</b> 응원 중!{" "}
                  {mode === "fixed" && "매 라운드 같은 고양이에 걸어요"}
                  {mode === "random" && "라운드마다 무작위로 골라요"}
                  {mode === "manual" && "경주가 끝나면 알려드려요"}
                </>
              ) : mode === "fixed" ? (
                "고정할 고양이를 골라 주세요"
              ) : (
                "1등 할 고양이를 골라 주세요"
              )}
            </p>

          </section>

          <MyBets bets={results} locked={locked} />
        </aside>

        {/* 지난 경주 */}
        <div className="min-w-0 space-y-3 lg:col-start-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">지난 경주</h2>
            <div className="flex items-center gap-2 text-xs">
              {CATS.map((cat, i) => (
                <span key={cat.kind} className="flex items-center gap-0.5 font-semibold" style={{ color: cat.color }}>
                  <CatHead cat={cat.kind} className="h-4 w-4" />
                  {wins[i]}승
                </span>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 bg-white">
            {previous.map((b) => {
              const race = runRace(b.hash);
              return (
                <li key={b.hash} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <a
                    href={`https://etherscan.io/block/${b.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-24 shrink-0 text-xs tabular-nums text-blue-600 hover:underline"
                  >
                    #{b.number.toLocaleString()}
                  </a>
                  <span className="flex items-center gap-1 font-bold" style={{ color: CATS[race.winner].color }}>
                    🏆
                    <CatHead cat={CATS[race.winner].kind} className="h-6 w-6" />
                    {CATS[race.winner].name}
                    {race.tied.length > 1 && (
                      <span className="text-xs font-semibold text-foreground/50" title="동점, 먼저 도착">
                        📸
                      </span>
                    )}
                  </span>
                  <span className="ml-auto flex gap-2 text-xs tabular-nums text-foreground/50">
                    {race.counts.map((c, i) => (
                      <span key={i} style={i === race.winner ? { color: CATS[i].color, fontWeight: 700 } : undefined}>
                        {c}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}

/** 내 자산 카드 안의 배팅 기록 줄들 */
function MyBets({ bets, locked }: { bets: Result[]; locked: LockedBet | null }) {
  return (
    <WalletCard empty={!locked && bets.length === 0}>
      {/* 마감되어 경주를 기다리는 배팅 */}
      {locked && (
        <li
          key={`locked-${locked.target}`}
          className="animate-pop flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2 text-sm text-eth"
        >
          <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">🔒 #{locked.target.toLocaleString()}</span>
          <CatHead cat={CATS[locked.cat].kind} className="h-6 w-6" />
          <span className="text-xs font-bold tabular-nums">{locked.amount} 코인</span>
          <span className="ml-auto animate-pulse text-xs font-semibold">경주 기다리는 중</span>
        </li>
      )}
      {bets.slice(0, locked ? MY_BETS_SHOWN - 1 : MY_BETS_SHOWN).map((r) => (
        <li
          key={r.blockNumber}
          className={`animate-pop flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            r.win ? "bg-sky-50" : "bg-foreground/[0.03]"
          }`}
        >
          <a
            href={`https://etherscan.io/block/${r.blockNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-24 shrink-0 text-xs tabular-nums text-blue-600 hover:underline"
          >
            #{r.blockNumber.toLocaleString()}
          </a>
          <CatHead cat={CATS[r.pick].kind} className="h-6 w-6" />
          <span className="text-xs text-foreground/40">→ 🏆</span>
          <CatHead cat={CATS[r.winner].kind} className="h-6 w-6" />
          <span className={`ml-auto text-xs font-bold tabular-nums ${r.win ? "text-sky-600" : "text-foreground/50"}`}>
            {r.win ? `🎉 +${(r.amount * (PAYOUT - 1)).toLocaleString()}` : `😿 -${r.amount.toLocaleString()}`} 코인
          </span>
        </li>
      ))}
    </WalletCard>
  );
}

/** 경주 트랙. 해시 글자를 하나씩 읽으며 고양이를 움직이고, 다 읽으면 우승 고양이에 왕관을 씌운다 */
function RaceTrack({ block }: { block: Block }) {
  const race = useMemo(() => runRace(block.hash), [block.hash]);
  const [step, setStep] = useState(0); // 지금까지 읽은 글자 수

  useEffect(() => {
    const timer = setInterval(() => setStep((n) => (n >= race.steps.length ? n : n + 1)), STEP_MS);
    return () => clearInterval(timer);
  }, [race.steps.length]);

  const finished = step >= race.steps.length;
  const counts = [0, 0, 0, 0];
  race.steps.slice(0, step).forEach((s) => counts[s]++);
  const chars = block.hash.slice(2).split("");
  const winner = CATS[race.winner];

  return (
    <div className="px-5 pt-5 pb-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
          블록 #{block.number.toLocaleString()} 경주
        </span>
        <span className="flex items-center gap-2">
          {/* 동점이면 먼저 도착한 고양이가 우승했다고 알려준다 */}
          {finished && race.tied.length > 1 && (
            <span className="animate-pop rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs font-bold text-foreground/70">
              📸 사진 판정 · {race.tied.map((i) => CATS[i].name).join("·")} 동점
            </span>
          )}
          <span
            key={String(finished)}
            className={`text-sm font-black ${finished ? "animate-pop" : "animate-pulse text-foreground/50"}`}
            style={finished ? { color: winner.color } : undefined}
          >
            {finished ? `🏆 ${winner.name} 우승!` : "달리는 중..."}
          </span>
        </span>
      </div>

      {/* 레인 4개 */}
      <div className="space-y-2">
        {CATS.map((cat, i) => {
          const isWinner = finished && i === race.winner;
          const progress = counts[i] / race.max;
          return (
            <div key={cat.kind} className="flex items-center gap-2">
              <div
                className="relative h-14 flex-1 rounded-md transition"
                style={{
                  background: cat.lane,
                  boxShadow: isWinner ? `inset 0 0 0 2px ${cat.color}` : undefined,
                }}
              >
                {/* 가운데 점선 */}
                <span className="absolute inset-x-3 top-1/2 border-t-2 border-dashed border-foreground/10" />
                {/* 결승선 체크무늬 */}
                <span
                  className="absolute inset-y-0 right-0 w-3 rounded-r-md opacity-60"
                  style={{
                    background: "repeating-conic-gradient(#5b2e14 0 25%, #fff 0 50%) 0 0 / 6px 6px",
                  }}
                />
                {/* 고양이 */}
                <div
                  className="absolute top-1/2 z-10 -translate-y-1/2 transition-[left] duration-100 ease-linear"
                  style={{
                    left: `calc(${progress} * (100% - 4.25rem) + 0.25rem)`,
                  }}
                >
                  <div className={`relative ${finished ? "" : "animate-run"}`}>
                    {isWinner && (
                      <span className="animate-pop absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👑</span>
                    )}
                    <CatHead cat={cat.kind} className="h-12 w-12 drop-shadow-sm" />
                  </div>
                </div>
              </div>
              {/* 달린 칸 수 */}
              <span className="w-6 text-right text-sm font-black tabular-nums" style={{ color: cat.color }}>
                {counts[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* 해시를 읽는 모습: 읽은 글자는 그 고양이 색, 지금 글자는 강조 */}
      <p className="mt-4 font-mono text-[11px] leading-relaxed break-all text-foreground/30 sm:text-xs">
        0x
        {chars.map((c, i) => (
          <span
            key={i}
            className={
              i === step - 1 && !finished ? "rounded-sm bg-foreground/10 font-black" : i < step ? "font-bold" : ""
            }
            style={i < step ? { color: CATS[race.steps[i]].color } : undefined}
          >
            {c}
          </span>
        ))}
      </p>
    </div>
  );
}
