"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import BetAmountPicker from "@/components/BetAmountPicker";
import SymbolArt, { type MatchSymbol } from "@/components/MatchSymbols";
import WalletCard from "@/components/WalletCard";
import { BLOCK_INTERVAL_MS, getRecentBlocks, subscribeBlocks, type Block } from "@/lib/api";
import { BET_AHEAD, BET_AMOUNTS, BET_OPEN_MS, MY_BETS_SHOWN, MY_BETS_SIZE } from "@/lib/betting";

// 이더리움 블록 그림 맞추기. 블록 해시 마지막 3글자가 릴 3개의 그림이 된다
// 0~3 츄르, 4~7 생선, 8~b 고양이, c~f 쥐. 해시만 있으면 누구나 결과를 다시 계산할 수 있다

const REEL_SYMBOLS: MatchSymbol[] = ["churu", "fish", "cat", "mouse"];
const SYMBOL_NAME: Record<string, string> = { churu: "츄르", fish: "생선", cat: "고양이", mouse: "쥐" };

const HISTORY_SIZE = 12;
/** 릴이 왼쪽부터 차례로 멈추는 시각(ms). 마지막 릴이 멈추면 결과를 보여준다 */
const STOP_AT = [900, 1400, 1900];
const REVEAL_MS = STOP_AT[STOP_AT.length - 1];

/**
 * 배당표 (건 금액의 몇 배를 돌려받는지). 확률: 츄르 3개 1/64, 같은 그림 3개 3/64,
 * 츄르 2개 9/64, 같은 그림 2개 27/64, 모두 다름 24/64
 */
const PAYOUTS = [
  { key: "churu3", label: "츄르 3개", times: 12, example: ["churu", "churu", "churu"] },
  { key: "same3", label: "같은 그림 3개", times: 6, example: ["cat", "cat", "cat"] },
  { key: "churu2", label: "츄르 2개", times: 1.5, example: ["churu", "churu", "fish"] },
  { key: "same2", label: "같은 그림 2개", times: 0.5, example: ["mouse", "mouse", "cat"] },
] as const;

type Spin = { chars: string[]; symbols: MatchSymbol[]; times: number; label: string };

function spinOf(hash: string): Spin {
  const chars = hash.slice(-3).split("");
  const symbols = chars.map((c) => REEL_SYMBOLS[Math.floor(parseInt(c, 16) / 4)]);
  const churu = symbols.filter((s) => s === "churu").length;
  const kinds = new Set(symbols).size;
  const pick = (key: (typeof PAYOUTS)[number]["key"]) => PAYOUTS.find((p) => p.key === key)!;
  const hit =
    churu === 3 ? pick("churu3") : kinds === 1 ? pick("same3") : churu === 2 ? pick("churu2") : kinds === 2 ? pick("same2") : null;
  return { chars, symbols, times: hit?.times ?? 0, label: hit?.label ?? "꽝" };
}

type LockedBet = { amount: number; target: number };
type Result = { blockNumber: number; amount: number; spin: Spin };

export default function BlockMatchPage() {
  const [blocks, setBlocks] = useState<Block[]>([]); // 최신이 앞
  const [joined, setJoined] = useState(false); // 이번 라운드 참여 여부
  const [auto, setAuto] = useState(false); // 매 라운드 자동 참여
  const [amount, setAmount] = useState(BET_AMOUNTS[0]);
  const [locked, setLocked] = useState<LockedBet | null>(null);
  // 내 배팅 기록(최신이 앞). 백엔드 배팅 API 가 생기기 전까지는 이 화면에 있는 동안만 쌓인다
  const [results, setResults] = useState<Result[]>([]);
  const [now, setNow] = useState(0);
  // 새 블록 콜백에서 최신 값을 읽기 위한 ref
  const joinedRef = useRef(false);
  const autoRef = useRef(false);
  const amountRef = useRef(BET_AMOUNTS[0]);
  const lockedRef = useRef<LockedBet | null>(null);

  function join(next: boolean) {
    joinedRef.current = next;
    setJoined(next);
  }

  function toggleAuto() {
    const next = !autoRef.current;
    autoRef.current = next;
    setAuto(next);
    // 자동 참여를 켜면 이번 라운드도 바로 참여 (배팅 마감 중이면 다음 라운드부터)
    if (next && !betClosed) join(true);
  }

  useEffect(() => {
    let cancelled = false;
    getRecentBlocks(HISTORY_SIZE).then((b) => !cancelled && setBlocks(b));
    const timers: ReturnType<typeof setTimeout>[] = [];

    const unsubscribe = subscribeBlocks((block) => {
      setBlocks((prev) => [block, ...prev].slice(0, HISTORY_SIZE));

      // 1) 마감된 배팅의 판정 블록이면, 릴이 다 멈춘 뒤 결과를 낸다
      const bet = lockedRef.current;
      if (bet && bet.target === block.number) {
        const r = { blockNumber: block.number, amount: bet.amount, spin: spinOf(block.hash) };
        timers.push(setTimeout(() => setResults((prev) => [r, ...prev].slice(0, MY_BETS_SIZE)), REVEAL_MS));
      }

      // 2) 이번 라운드 참여를 마감하고 3) 자동 참여면 다음 라운드도 참여
      const next = joinedRef.current ? { amount: amountRef.current, target: block.number + 1 } : null;
      lockedRef.current = next;
      setLocked(next);
      join(autoRef.current);
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

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">이더리움 블록 그림 맞추기</h1>
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
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-6 pb-80 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-6">
        {/* 릴 */}
        <section className="overflow-hidden rounded-xl border border-foreground/10 bg-white shadow-sm lg:col-start-1">
          {latest ? (
            <Reels key={latest.hash} block={latest} />
          ) : (
            <p className="py-24 text-center text-foreground/50">블록 불러오는 중...</p>
          )}
          <div className="flex items-center justify-between border-t border-foreground/10 px-5 py-3 text-sm">
            <span className="text-foreground/60">
              다음 블록 <b className="text-foreground">{latest ? `#${(latest.number + 1).toLocaleString()}` : ""}</b>
            </span>
            <span className="rounded-full bg-eth/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-eth">
              {blockRemain > 0 ? `${blockRemain}초 뒤 생성` : "곧 나와요!"}
            </span>
          </div>
        </section>

        {/* 오른쪽: 배팅(모바일은 화면 아래 고정) + 내 자산 */}
        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:space-y-4 lg:self-start">
          <section className="fixed inset-x-0 bottom-0 z-20 rounded-t-xl border-t border-foreground/10 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.08)] lg:static lg:rounded-xl lg:border lg:p-5 lg:shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">그림 맞추기 참여</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  betClosed ? "bg-red-50 text-red-500" : "bg-eth/10 text-eth"
                }`}
              >
                {betClosed ? "🔒 배팅 마감" : `⏱ 마감까지 ${betRemain}초`}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/60">
              {latest && <b className="text-eth">#{(latest.number + BET_AHEAD).toLocaleString()}</b>} 블록 해시 마지막
              3글자로 그림이 정해져요
            </p>

            <BetAmountPicker
              amount={amount}
              times={PAYOUTS[0].times}
              timesLabel="최대"
              disabled={betClosed}
              onChange={(a) => {
                amountRef.current = a;
                setAmount(a);
              }}
            />

            <button
              onClick={() => join(!joined)} // 한 번 더 누르면 취소
              disabled={betClosed}
              className={`mt-3 w-full rounded-md py-3 text-base font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                joined ? "bg-primary text-white shadow-md" : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {joined ? `✓ ${amount} 코인 참여 중 (누르면 취소)` : `${amount} 코인으로 참여하기`}
            </button>
            <button
              onClick={toggleAuto}
              className={`mt-2 w-full rounded-md py-2 text-xs font-semibold transition ${
                auto ? "bg-eth text-white" : "bg-foreground/5 text-foreground/60 hover:text-foreground"
              }`}
            >
              {auto ? "🔁 자동 참여 끄기" : "🔁 매 라운드 자동 참여"}
            </button>

            <p className="mt-3 text-center text-sm text-foreground/60">
              {betClosed && latest ? (
                <>
                  배팅 마감! 다음 블록이 나오면 <b className="text-eth">#{(latest.number + BET_AHEAD + 1).toLocaleString()}</b> 배팅이 열려요
                </>
              ) : joined ? (
                "참여 완료! 블록이 나오면 릴이 돌아가요"
              ) : (
                "금액을 고르고 참여해 주세요"
              )}
            </p>
          </section>

          <MyBets bets={results} locked={locked} />
        </aside>

        {/* 배당표 + 지난 블록 */}
        <div className="min-w-0 space-y-6 lg:col-start-1">
          <section className="space-y-3">
            <h2 className="font-semibold">배당표</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYOUTS.map((p) => (
                <li key={p.key} className="rounded-lg border border-foreground/10 bg-white p-3 text-center">
                  <div className="flex justify-center gap-0.5">
                    {p.example.map((s, i) => (
                      <SymbolArt key={i} symbol={s} className="h-7 w-7" />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-foreground/60">{p.label}</p>
                  <p className="text-lg font-black text-primary">x{p.times}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-foreground/50">
              해시 글자 → 그림: 0~3 츄르 · 4~7 생선 · 8~b 고양이 · c~f 쥐. 그 밖의 경우는 꽝이에요.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">지난 블록</h2>
            <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 bg-white">
              {previous.map((b) => {
                const spin = spinOf(b.hash);
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
                    <span className="flex gap-0.5">
                      {spin.symbols.map((s, i) => (
                        <SymbolArt key={i} symbol={s} className="h-6 w-6" />
                      ))}
                    </span>
                    <span className="font-mono text-xs text-foreground/40">…{spin.chars.join("")}</span>
                    <span
                      className={`ml-auto text-xs font-bold ${spin.times >= 1 ? "text-primary" : "text-foreground/40"}`}
                    >
                      {spin.times > 0 ? `${spin.label} x${spin.times}` : "꽝"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

/** 얻거나 잃은 코인 (+150 / -50 / 0) */
function profitOf(r: Result): number {
  return Math.round(r.amount * r.spin.times) - r.amount;
}

/** 내 자산 카드 안의 배팅 기록 줄들 */
function MyBets({ bets, locked }: { bets: Result[]; locked: LockedBet | null }) {
  return (
    <WalletCard empty={!locked && bets.length === 0}>
      {locked && (
        <li
          key={`locked-${locked.target}`}
          className="animate-pop flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2 text-sm text-eth"
        >
          <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">🔒 #{locked.target.toLocaleString()}</span>
          <span className="text-xs font-bold tabular-nums">{locked.amount} 코인</span>
          <span className="ml-auto animate-pulse text-xs font-semibold">결과 기다리는 중</span>
        </li>
      )}
      {bets.slice(0, locked ? MY_BETS_SHOWN - 1 : MY_BETS_SHOWN).map((r) => {
        const profit = profitOf(r);
        return (
          <li
            key={r.blockNumber}
            className={`animate-pop flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              profit > 0 ? "bg-sky-50" : "bg-foreground/[0.03]"
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
            <span className="flex gap-0.5">
              {r.spin.symbols.map((s, i) => (
                <SymbolArt key={i} symbol={s} className="h-5 w-5" />
              ))}
            </span>
            <span
              className={`ml-auto text-xs font-bold tabular-nums ${profit > 0 ? "text-sky-600" : "text-foreground/50"}`}
            >
              {profit > 0 ? `🎉 +${profit}` : profit === 0 ? "본전" : `😿 ${profit}`} 코인
            </span>
          </li>
        );
      })}
    </WalletCard>
  );
}

/** 릴 3개. 블록이 나오면 그림이 빠르게 바뀌다가 왼쪽부터 해시 글자에 맞는 그림으로 멈춘다 */
function Reels({ block }: { block: Block }) {
  const spin = spinOf(block.hash);
  const [shown, setShown] = useState<MatchSymbol[]>(spin.symbols);
  const [stopped, setStopped] = useState([false, false, false]);

  useEffect(() => {
    const final = spinOf(block.hash).symbols;
    const done = [false, false, false];
    const roll = setInterval(
      () =>
        setShown((prev) =>
          prev.map((s, i) => (done[i] ? s : REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)])),
        ),
      70,
    );
    const timers = STOP_AT.map((ms, i) =>
      setTimeout(() => {
        done[i] = true;
        setShown((prev) => prev.map((s, j) => (j === i ? final[i] : s)));
        setStopped((prev) => prev.map((s, j) => (j === i ? true : s)));
        if (i === STOP_AT.length - 1) clearInterval(roll);
      }, ms),
    );
    return () => {
      clearInterval(roll);
      timers.forEach(clearTimeout);
    };
  }, [block.hash]);

  const finished = stopped.every(Boolean);
  const body = block.hash.slice(0, -3);

  return (
    <div className="px-5 pt-5 pb-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
          블록 #{block.number.toLocaleString()}
        </span>
        <span
          key={String(finished)}
          className={`text-sm font-black ${finished ? "animate-pop" : "animate-pulse text-foreground/50"} ${
            finished && spin.times >= 1 ? "text-primary" : finished ? "text-foreground/50" : ""
          }`}
        >
          {!finished
            ? "돌아가는 중..."
            : spin.times >= 1
              ? `🎉 ${spin.label}! x${spin.times}`
              : spin.times > 0
                ? `😐 ${spin.label}, 절반만 돌려받아요`
                : "😿 꽝"}
        </span>
      </div>

      {/* 릴 3개 + 아래에 그 릴을 정한 해시 글자 */}
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-foreground/5 p-3">
        {shown.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className={`flex h-28 w-full items-center justify-center rounded-md border-2 bg-white transition sm:h-32 ${
                stopped[i] ? "border-primary/40" : "border-transparent"
              }`}
            >
              <span key={stopped[i] ? "stop" : "spin"} className={stopped[i] ? "animate-pop" : "opacity-60 blur-[1px]"}>
                <SymbolArt symbol={s} className="h-20 w-20 sm:h-24 sm:w-24" />
              </span>
            </div>
            <span
              className={`font-mono text-lg font-black ${stopped[i] ? "text-foreground" : "text-foreground/20"}`}
              title={stopped[i] ? SYMBOL_NAME[spin.symbols[i]] : undefined}
            >
              {stopped[i] ? spin.chars[i] : "?"}
            </span>
          </div>
        ))}
      </div>

      {/* 해시: 마지막 3글자가 릴이 된다 */}
      <p className="mt-4 font-mono text-[11px] leading-relaxed break-all text-foreground/40 sm:text-xs">
        {body}
        <b className="text-primary">{finished ? spin.chars.join("") : "???"}</b>
      </p>
    </div>
  );
}
