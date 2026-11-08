"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getMyBets, getPoints, hasTokens, type Bet, type GameId } from "@/lib/api";
import { clearNotice, getAutoBets, getServerAutoBets, stopAuto, subscribeAutoBets } from "@/lib/autoBet";
import { MY_BETS_SHOWN, blockUrl } from "@/lib/betting";
import { GAME_INFO, pickLabel, resultLabel } from "@/lib/games";
import { subscribeBlocks } from "@/lib/socket";

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다
const subscribeNothing = () => () => {};

/**
 * 내 자산 카드. 모든 게임이 같이 쓴다 (게임 화면 오른쪽 + 모든 페이지에 떠 있는 '내 배팅' 패널).
 * 보유 포인트, 켜 둔 자동배팅(여기서 끌 수 있다), 모든 게임의 최근 배팅 기록을 보여준다.
 * 새 블록이 나올 때(정산 반영)와 배팅이 새로 걸릴 때 다시 불러온다.
 * fill: 부모 높이를 꽉 채우고 배팅 기록이 남는 높이만큼 늘어난다 (마켓 오른쪽 칸). 아니면 기록은 8줄 높이까지
 */
export default function WalletCard({ className = "", fill = false }: { className?: string; fill?: boolean }) {
  const loggedIn = useSyncExternalStore(subscribeNothing, hasTokens, () => false);
  const { autos, notices, version } = useSyncExternalStore(subscribeAutoBets, getAutoBets, getServerAutoBets);
  const [points, setPoints] = useState<string | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    if (!loggedIn) return;
    const load = () => {
      getPoints()
        .then((p) => setPoints(p.points))
        .catch(() => {});
      getMyBets(undefined, MY_BETS_SHOWN)
        .then(({ items }) => setBets(items))
        .catch(() => {});
    };
    load();
    return subscribeBlocks(load);
  }, [loggedIn, version]);

  const autoList = Object.values(autos);
  const noticeList = Object.entries(notices) as [GameId, string][];

  return (
    <section className={`rounded-xl border border-foreground/10 bg-white p-5 shadow-sm ${fill ? "flex h-full flex-col" : ""} ${className}`}>
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

          {/* 켜 둔 자동배팅 (어느 페이지에서든 끌 수 있다) */}
          {(autoList.length > 0 || noticeList.length > 0) && (
            <>
              <h3 className="mt-5 border-t border-foreground/10 pt-4 text-sm font-semibold">자동배팅</h3>
              <ul className="mt-2 space-y-1.5">
                {autoList.map((a) => (
                  <li key={a.game} className="flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2 text-xs">
                    <Link href={GAME_INFO[a.game].href} className="min-w-0 flex-1 truncate">
                      <b>{GAME_INFO[a.game].title}</b>
                      <span className="ml-1.5 text-foreground/60">
                        {a.mode === "random" ? "🎲 랜덤" : "📌 고정"}
                        {a.mode === "fixed" && a.pick !== null && ` · ${pickLabel(a.game, a.pick)}`}
                        {a.mode === "fixed" && a.picks && a.pick === null && " · 고를 값 없음"} · {a.amount.toLocaleString()} 코인
                      </span>
                    </Link>
                    <button
                      onClick={() => stopAuto(a.game)}
                      className="shrink-0 rounded-md bg-white px-2 py-1 font-bold text-red-500 shadow-sm hover:bg-red-50"
                    >
                      끄기
                    </button>
                  </li>
                ))}
                {noticeList.map(([game, notice]) => (
                  <li key={game} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    <span className="min-w-0 flex-1">
                      <b>{GAME_INFO[game].title}</b> {notice}
                    </span>
                    <button onClick={() => clearNotice(game)} aria-label="알림 지우기" className="shrink-0 px-1 text-red-400 hover:text-red-600">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="mt-5 border-t border-foreground/10 pt-4 text-sm font-semibold">배팅 기록</h3>
          {bets.length === 0 ? (
            <p className="mt-3 text-center text-sm text-foreground/50">아직 배팅 기록이 없어요</p>
          ) : (
            // 넘치면 카드 안에서 스크롤 (fill 이 아니면 8줄 정도 높이까지)
            <ul className={`-mr-2 mt-2 space-y-1.5 overflow-y-auto pr-2 scroll-pretty ${fill ? "min-h-0 flex-1" : "max-h-[23rem]"}`}>
              {bets.map((bet) => (
                <BetLine key={bet.id} bet={bet} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** 배팅 기록 한 줄: 블록 번호 · 게임 · 고른 값 → 결과 · 얻거나 잃은 코인 */
function BetLine({ bet }: { bet: Bet }) {
  const info = GAME_INFO[bet.game];
  const amount = Number(bet.amount);
  const pick = pickLabel(bet.game, bet.pick);

  const block =
    bet.targetBlockNumber === null ? (
      <span className="w-20 shrink-0 text-xs text-foreground/40">바로 결과</span>
    ) : (
      <a
        href={blockUrl(bet.targetBlockNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-20 shrink-0 text-xs tabular-nums text-blue-600 hover:underline"
      >
        #{bet.targetBlockNumber.toLocaleString()}
      </a>
    );
  const what = (
    // 좁으면 게임 이름만 줄이고 고른 값은 그대로 보인다
    <Link href={info.href} className="flex min-w-0 items-center gap-1 text-xs hover:underline">
      <b className="truncate">{info.title}</b>
      {pick && <span className="shrink-0 rounded bg-primary px-1 py-0.5 text-[11px] font-bold text-white">{pick}</span>}
    </Link>
  );

  // 결과 기다리는 배팅 (판정 블록 + 2 블록 뒤 서버가 정산한다)
  if (bet.status !== "settled") {
    return (
      <li className="animate-pop flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2 text-eth">
        {block}
        {what}
        <span className="ml-auto shrink-0 animate-pulse text-xs font-semibold" title="결과 기다리는 중">
          ⏳ {amount.toLocaleString()}
        </span>
      </li>
    );
  }

  const profit = Math.round((Number(bet.payout ?? 0) - amount) * 1e6) / 1e6;
  const win = profit > 0;
  const result = resultLabel(bet.game, bet.result);
  return (
    <li className={`animate-pop flex items-center gap-2 rounded-lg px-3 py-2 ${win ? "bg-sky-50" : "bg-foreground/[0.03]"}`}>
      {block}
      {what}
      {result && <span className="shrink-0 text-xs text-foreground/50">→ {result}</span>}
      <span className={`ml-auto shrink-0 text-xs font-bold tabular-nums ${win ? "text-sky-600" : "text-foreground/50"}`}>
        {win ? `🎉 +${profit.toLocaleString()}` : profit === 0 ? "본전" : `😿 ${profit.toLocaleString()}`}
      </span>
    </li>
  );
}
