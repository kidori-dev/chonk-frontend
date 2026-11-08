"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import AccountMenu from "@/components/AccountMenu";
import SymbolArt, { MATCH_SYMBOLS, type MatchSymbol } from "@/components/MatchSymbols";
import { getPoints, hasTokens, subscribeAuth, placeBet } from "@/lib/api";
import {
  clearNotice,
  getAutoBets,
  getServerAutoBets,
  notifyBetsChanged,
  onChuruRound,
  startAuto,
  stopAuto,
  subscribeAutoBets,
} from "@/lib/autoBet";
import { BetAmountInput } from "@/components/BetAmountPicker";
import { DEFAULT_BET, isValidBet } from "@/lib/betting";

// 츄르 그림 맞추기. 그림은 서버가 난수로 정하고(POST /api/games/churu-match/bets) 포인트도 서버에서 바로 정산된다.
// 화면은 서버가 알려준 그림으로 릴을 멈추기만 한다

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

/** 결과에 따른 배수와 메시지 (서버 chonk-backend/src/modules/games/rules.ts 의 CHURU_PAYOUTS 와 같다) */
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
  const loggedIn = useSyncExternalStore(subscribeAuth, hasTokens, () => false);
  // 내 포인트 (서버). 불러오기 전이면 null
  const [coins, setCoins] = useState<number | null>(null);
  const [bet, setBet] = useState(DEFAULT_BET);
  const [reels, setReels] = useState<MatchSymbol[]>(["churu", "fish", "cat"]);
  const [stopped, setStopped] = useState([true, true, true]);
  const [result, setResult] = useState<{ win: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0); // 멈출 때 애니메이션을 다시 걸기 위한 번호
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 자동 돌리기는 전역(lib/autoBet)에서 돌아서 다른 페이지로 가도 계속 돌고, 내 자산 카드에서도 끌 수 있다
  const { autos, notices } = useSyncExternalStore(subscribeAutoBets, getAutoBets, getServerAutoBets);
  const autoBet = autos["churu-match"];
  const auto = !!autoBet;
  const amount = autoBet?.amount ?? bet;
  const spinning = stopped.some((s) => !s);
  const enough = isValidBet(amount) && coins !== null && coins >= amount;

  useEffect(() => {
    if (!loggedIn) return;
    getPoints()
      .then((p) => setCoins(Number(p.points)))
      .catch(() => setCoins(null));
  }, [loggedIn]);

  // 화면을 떠나면 돌던 타이머 정리
  // (다시 돌아왔을 때 릴이 도는 중으로 멈춰 있지 않게 멈춘 상태로 둔다)
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      setStopped([true, true, true]);
    },
    [],
  );

  function toggleAuto() {
    if (auto) stopAuto("churu-match");
    else startAuto({ game: "churu-match", mode: "fixed", pick: null, picks: null, amount: bet });
  }

  function spin() {
    if (spinning || !enough) return;
    const round = placeBet("churu-match", { amount: bet });
    round.then(notifyBetsChanged, () => {}); // 내 자산 카드(모든 페이지 공유)가 기록을 다시 불러온다
    animate(round, bet);
  }

  /** 서버 결과(round)가 올 때까지 릴을 돌리다가 왼쪽부터 결과 그림으로 멈춘다 */
  async function animate(round: ReturnType<typeof placeBet>, cost: number) {
    timers.current.forEach(clearTimeout);
    const done = [false, false, false];

    setCoins((c) => (c === null ? c : c - cost));
    setResult(null);
    setError(null);
    setStopped([false, false, false]);
    setRound((r) => r + 1);

    // 서버 결과를 기다리는 동안에도 릴은 빠르게 돈다
    const roll = setInterval(() => setReels((prev) => prev.map((s, i) => (done[i] ? s : randomSymbol()))), 70);
    timers.current = [roll];

    let res: Awaited<typeof round>;
    try {
      res = await round;
    } catch (err) {
      clearInterval(roll);
      setStopped([true, true, true]);
      setError(err instanceof Error ? err.message : "돌리지 못했어요");
      getPoints()
        .then((p) => setCoins(Number(p.points)))
        .catch(() => {});
      return;
    }

    const final = res.bet.result!.split(",") as MatchSymbol[];
    timers.current.push(
      ...STOP_AT.map((ms, i) =>
        setTimeout(() => {
          done[i] = true;
          setReels((prev) => prev.map((s, j) => (j === i ? final[i] : s)));
          setStopped((prev) => prev.map((s, j) => (j === i ? true : s)));
          if (i === STOP_AT.length - 1) {
            clearInterval(roll);
            setCoins(Number(res.points));
            setResult({ win: Number(res.bet.payout), message: judge(final).message });
          }
        }, ms),
      ),
    );
  }

  // 자동 돌리기가 한 판 돌릴 때마다 릴을 돌린다 (화면을 보고 있을 때만)
  useEffect(() => onChuruRound((round) => animate(round, autos["churu-match"]?.amount ?? 0)));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">랜덤 츄르 그림 맞추기</h1>
          <div className="ml-auto">
            <AccountMenu />
          </div>
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
              {spinning
                ? "두근두근..."
                : error
                  ? error
                  : result
                    ? `${result.message}${result.win > 0 ? ` +${result.win.toLocaleString()}` : ""}`
                    : "그림 3개를 맞춰 보세요!"}
            </p>

            {/* 배팅 금액 */}
            <div className="mt-4">
              <BetAmountInput amount={amount} disabled={spinning || auto} onChange={setBet} />
            </div>

            {loggedIn ? (
              <>
                <button
                  onClick={spin}
                  disabled={spinning || auto || !enough}
                  className="mt-3 w-full rounded-md bg-primary py-3.5 text-lg font-black text-white shadow-md transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {auto ? "자동으로 돌리는 중..." : spinning ? "돌아가는 중..." : `${bet} 코인으로 돌리기`}
                </button>

                {/* 자동 돌리기: 켜 두면 같은 금액으로 계속 돌린다 */}
                <button
                  onClick={toggleAuto}
                  disabled={!auto && !enough}
                  className={`mt-2 w-full rounded-md py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    auto ? "bg-eth text-white" : "bg-foreground/5 text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {auto ? "🔁 자동 돌리기 끄기" : "🔁 자동 돌리기"}
                </button>
                {notices["churu-match"] && (
                  <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-red-500">
                    {notices["churu-match"]}
                    <button onClick={() => clearNotice("churu-match")} aria-label="알림 지우기" className="px-1">
                      ✕
                    </button>
                  </p>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="mt-3 block w-full rounded-md bg-primary py-3.5 text-center text-lg font-black text-white shadow-md hover:opacity-90"
              >
                로그인하고 돌리기
              </Link>
            )}
          </div>
        </section>

        {/* 내 포인트 */}
        <section className="flex items-center justify-between rounded-xl border border-foreground/10 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm text-foreground/60">보유 포인트</p>
            <p className="text-xs text-foreground/40">
              {loggedIn ? "돌릴 때마다 서버에서 바로 정산돼요" : "로그인하면 포인트로 할 수 있어요"}
            </p>
          </div>
          <span className="text-2xl font-black tabular-nums text-primary">
            {coins === null ? "-" : coins.toLocaleString()}
          </span>
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
