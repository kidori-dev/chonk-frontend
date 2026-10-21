"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import SymbolArt, { MATCH_SYMBOLS, type MatchSymbol } from "@/components/MatchSymbols";

// 츄르 그림 맞추기. 지금은 화면 안에서만 도는 체험용 게임이고 코인도 이 화면에서만 쓰인다


const START_COINS = 1000;
const BETS = [10, 50, 100];
/** 자동 돌리기에서 결과를 보여준 뒤 다음 판까지 쉬는 시간(ms) */
const AUTO_PAUSE_MS = 1000;
/** 릴이 왼쪽부터 차례로 멈추는 시각(ms) */
const STOP_AT = [900, 1400, 1900];

const PAYOUTS: { label: React.ReactNode; times: number }[] = [
  { label: <Combo symbols={["churu", "churu", "churu"]} />, times: 20 },
  { label: "같은 그림 3개", times: 5 },
  { label: <Combo symbols={["churu", "churu"]} />, times: 2 },
  { label: "같은 그림 2개", times: 1 },
];

function randomSymbol(): MatchSymbol {
  return MATCH_SYMBOLS[Math.floor(Math.random() * MATCH_SYMBOLS.length)];
}

/** 결과에 따른 배수와 메시지 */
function judge(reels: MatchSymbol[]): { times: number; message: string } {
  const churu = reels.filter((r) => r === "churu").length;
  const allSame = reels.every((r) => r === reels[0]);
  const hasPair = new Set(reels).size < reels.length;

  if (allSame && churu === 3) return { times: 20, message: "🎉 츄르 잭팟! Chonk 가 기절했어요" };
  if (allSame) return { times: 5, message: "✨ 같은 그림 3개!" };
  if (churu === 2) return { times: 2, message: "😻 츄르 2개!" };
  if (hasPair) return { times: 1, message: "같은 그림 2개, 본전!" };
  return { times: 0, message: "😿 꽝! 츄르는 다음 기회에" };
}

export default function ChuruMatchPage() {
  const [coins, setCoins] = useState(START_COINS);
  const [bet, setBet] = useState(BETS[0]);
  const [reels, setReels] = useState<MatchSymbol[]>(["churu", "fish", "cat"]);
  const [stopped, setStopped] = useState([true, true, true]);
  const [result, setResult] = useState<{ win: number; message: string } | null>(null);
  const [round, setRound] = useState(0); // 멈출 때 애니메이션을 다시 걸기 위한 번호
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [auto, setAuto] = useState(false);
  const spinning = stopped.some((s) => !s);
  // 자동 돌리기가 켜져 있어도 코인이 모자라면 멈춘다
  const autoBlocked = auto && !spinning && coins < bet;

  // 화면을 떠나면 돌던 타이머 정리
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!auto || spinning || coins < bet) return;
    const timer = setTimeout(spin, AUTO_PAUSE_MS);
    return () => clearTimeout(timer);
  });

  function spin() {
    if (spinning || coins < bet) return;
    const final = [randomSymbol(), randomSymbol(), randomSymbol()];
    const done = [false, false, false];

    setCoins((c) => c - bet);
    setResult(null);
    setStopped([false, false, false]);
    setRound((r) => r + 1);

    // 도는 동안은 릴마다 그림이 빠르게 바뀐다
    const roll = setInterval(() => setReels((prev) => prev.map((s, i) => (done[i] ? s : randomSymbol()))), 70);

    timers.current = STOP_AT.map((ms, i) =>
      setTimeout(() => {
        done[i] = true;
        setReels((prev) => prev.map((s, j) => (j === i ? final[i] : s)));
        setStopped((prev) => prev.map((s, j) => (j === i ? true : s)));
        if (i === STOP_AT.length - 1) {
          clearInterval(roll);
          const { times, message } = judge(final);
          setCoins((c) => c + bet * times);
          setResult({ win: bet * times, message });
        }
      }, ms),
    );
    timers.current.push(roll);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">랜덤 츄르 그림 맞추기</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
        {/* 그림 맞추기 판 */}
        <section className="overflow-hidden rounded-xl border border-foreground/10 bg-white shadow-sm">
          <div className="bg-primary px-5 py-3 text-center text-lg font-black tracking-widest text-white">
            랜덤 츄르 그림 맞추기
          </div>

          <div className="px-5 pt-6 pb-5">
            {/* 릴 3개 */}
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-foreground/5 p-3">
              {reels.map((symbol, i) => (
                <div
                  key={i}
                  className={`flex h-28 items-center justify-center rounded-md border-2 bg-white transition ${
                    stopped[i] ? "border-primary/30" : "border-transparent"
                  }`}
                >
                  <span
                    key={stopped[i] ? `stop-${round}` : "spin"}
                    className={stopped[i] ? "animate-pop" : "opacity-60 blur-[1px]"}
                  >
                    <SymbolView symbol={symbol} size="lg" />
                  </span>
                </div>
              ))}
            </div>

            {/* 결과 */}
            <p
              key={result ? round : "none"}
              className={`mt-4 h-7 text-center font-bold ${result ? "animate-pop" : ""} ${
                result && result.win > 0 ? "text-primary" : "text-foreground/60"
              }`}
            >
              {spinning ? "두근두근..." : result ? `${result.message}${result.win > 0 ? ` +${result.win}` : ""}` : "그림 3개를 맞춰 보세요!"}
            </p>

            {/* 배팅 금액 */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {BETS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBet(b)}
                  disabled={spinning || auto}
                  className={`rounded-md py-2 text-sm font-bold transition disabled:cursor-not-allowed ${
                    bet === b ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {b} 코인
                </button>
              ))}
            </div>

            <button
              onClick={spin}
              disabled={spinning || auto || coins < bet}
              className="mt-3 w-full rounded-md bg-primary py-3.5 text-lg font-black text-white shadow-md transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {auto ? "자동으로 돌리는 중..." : spinning ? "돌아가는 중..." : "그림 돌리기"}
            </button>

            {/* 자동 돌리기: 켜 두면 같은 금액으로 계속 돌린다 */}
            <button
              onClick={() => setAuto((a) => !a)}
              className={`mt-2 w-full rounded-md py-2.5 text-sm font-bold transition ${
                auto ? "bg-eth text-white" : "bg-foreground/5 text-foreground/60 hover:text-foreground"
              }`}
            >
              {auto ? "🔁 자동 돌리기 끄기" : "🔁 자동 돌리기"}
            </button>
            {autoBlocked && (
              <p className="mt-2 text-center text-xs text-red-500">코인이 모자라서 자동 돌리기를 멈췄어요</p>
            )}
          </div>
        </section>

        {/* 내 코인 */}
        <section className="flex items-center justify-between rounded-xl border border-foreground/10 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm text-foreground/60">보유 코인</p>
            <p className="text-xs text-foreground/40">체험용 코인이에요</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tabular-nums text-primary">{coins.toLocaleString()}</span>
            {coins < BETS[0] && !spinning && (
              <button
                onClick={() => setCoins(START_COINS)}
                className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20"
              >
                다시 받기
              </button>
            )}
          </div>
        </section>

        {/* 배당표 */}
        <section className="rounded-xl border border-foreground/10 bg-white px-5 py-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold">배당표</h2>
          <ul className="divide-y divide-foreground/10 text-sm">
            {PAYOUTS.map(({ label, times }) => (
              <li key={times} className="flex items-center justify-between py-2">
                <span className="text-foreground/70">{label}</span>
                <span className="font-bold text-primary">x{times}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

/** 릴 그림 */
function SymbolView({ symbol, size }: { symbol: MatchSymbol; size: "lg" | "sm" }) {
  return <SymbolArt symbol={symbol} className={size === "lg" ? "h-20 w-20" : "h-6 w-6"} />;
}

/** 배당표에 쓰는 그림 묶음 */
function Combo({ symbols }: { symbols: MatchSymbol[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {symbols.map((s, i) => (
        <SymbolView key={i} symbol={s} size="sm" />
      ))}
    </span>
  );
}
