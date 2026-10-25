"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AccountMenu from "@/components/AccountMenu";
import BetAmountPicker from "@/components/BetAmountPicker";
import BetButton from "@/components/BetButton";
import Die from "@/components/Die";
import PickModeToggle from "@/components/PickModeToggle";
import WalletCard from "@/components/WalletCard";
import type { Block } from "@/lib/api";
import { BET_AHEAD, MY_BETS_SHOWN, blockUrl } from "@/lib/betting";
import { profitOf, useBlockBetting, type BetRow } from "@/lib/useBlockBetting";

// 이더리움 블록 주사위. 블록 해시로 주사위 2개를 굴려 두 눈의 합에 건다
// 해시 끝에서부터 1바이트(2글자)씩 읽어 252 이상은 건너뛰고 6으로 나눈 나머지 + 1 → 1~6 이 똑같은 확률로 나온다

/**
 * 고를 수 있는 것과 배당 (건 금액의 몇 배를 돌려받는지)
 * 확률: 소(2~6) 15/36, 럭키7 6/36, 대(8~12) 15/36
 */
const PICKS = [
  { key: "low", label: "소", range: "2 ~ 6", times: 2.2, color: "#5d97c0", soft: "#eef5fa", test: (s: number) => s <= 6 },
  { key: "seven", label: "럭키 7", range: "7", times: 5, color: "#e9823a", soft: "#fff1e4", test: (s: number) => s === 7 },
  { key: "high", label: "대", range: "8 ~ 12", times: 2.2, color: "#b4622a", soft: "#fbf0e6", test: (s: number) => s >= 8 },
] as const;

/** 주사위가 구르는 시간 */
const ROLL_MS = 1600;

type Roll = { dice: [number, number]; sum: number; pick: number };

function rollOf(hash: string): Roll {
  const hex = hash.slice(2);
  const dice: number[] = [];
  for (let i = hex.length - 2; i >= 0 && dice.length < 2; i -= 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (byte < 252) dice.push((byte % 6) + 1); // 252 = 6의 배수 중 256 이하 최댓값. 넘는 값은 버려야 치우침이 없다
  }
  const sum = dice[0] + dice[1];
  return { dice: [dice[0], dice[1]], sum, pick: PICKS.findIndex((p) => p.test(sum)) };
}

/** 서버 pick 값 (PICKS 순서) */
const DICE_PICKS: string[] = PICKS.map((p) => p.key);

export default function DicePage() {
  const g = useBlockBetting({ game: "dice", picks: DICE_PICKS, revealMs: ROLL_MS });
  const { latest, history, betClosed, betRemain, blockRemain, mode, amount } = g;
  // 고른 것 (PICKS 의 순서)
  const pick = g.pick === null ? null : DICE_PICKS.indexOf(g.pick);

  // 최근 블록에서 소/7/대 가 나온 횟수
  const counts = [0, 0, 0];
  history.forEach((b) => counts[rollOf(b.hash).pick]++);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">이더리움 블록 주사위</h1>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE
          </span>
          <AccountMenu />
        </div>
      </header>

      {/* 모바일에서는 배팅 카드가 화면 아래에 떠 있으므로 그만큼 아래 여백을 둔다 */}
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-6 pb-96 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-6">
        {/* 주사위 */}
        <section className="overflow-hidden rounded-xl border border-foreground/10 bg-white shadow-sm lg:col-start-1">
          {latest ? (
            <DiceTable key={latest.hash} block={latest} />
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
              <h2 className="font-semibold">주사위 합 맞히기</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  betClosed ? "bg-red-50 text-red-500" : "bg-eth/10 text-eth"
                }`}
              >
                {betClosed ? "🔒 배팅 마감" : `⏱ 마감까지 ${betRemain}초`}
              </span>
            </div>
            <p className="mt-1 mb-3 text-sm text-foreground/60">
              {latest && <b className="text-eth">#{(latest.number + BET_AHEAD).toLocaleString()}</b>} 블록 주사위 2개의
              합은?
            </p>

            <div className="grid grid-cols-3 gap-2">
              {PICKS.map((p, i) => {
                const selected = pick === i;
                return (
                  <button
                    key={p.key}
                    onClick={() => g.choose(selected ? null : p.key)} // 한 번 더 누르면 선택 취소
                    disabled={betClosed || g.placedNow !== null}
                    className="relative flex flex-col items-center rounded-lg border-2 py-3 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ borderColor: selected ? p.color : "transparent", background: selected ? `${p.color}26` : p.soft }}
                  >
                    <span className="text-lg font-black" style={{ color: p.color }}>
                      {p.label}
                    </span>
                    <span className="text-[11px] text-foreground/50">{p.range}</span>
                    <span className="mt-0.5 text-xs font-bold" style={{ color: p.color }}>
                      x{p.times}
                    </span>
                    {selected && (
                      <span
                        className="animate-pop absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black shadow-md"
                        style={{ color: p.color }}
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
              times={pick === null ? PICKS[0].times : PICKS[pick].times}
              disabled={betClosed || g.placedNow !== null}
              onChange={g.setAmount}
            />
            <BetButton
              loggedIn={g.loggedIn}
              amount={amount}
              placed={g.placedNow}
              placing={g.placing}
              disabled={betClosed || pick === null}
              onClick={() => g.place()}
            />
            <PickModeToggle mode={mode} onChange={g.changeMode} />

            <p className="mt-3 text-center text-sm text-foreground/60">
              {g.message ? (
                <b className="text-red-500">{g.message}</b>
              ) : betClosed && latest ? (
                <>
                  배팅 마감! 다음 블록이 나오면 <b className="text-eth">#{(latest.number + BET_AHEAD + 1).toLocaleString()}</b> 배팅이 열려요
                </>
              ) : pick !== null ? (
                <>
                  <b style={{ color: PICKS[pick].color }}>{PICKS[pick].label}</b> 선택!{" "}
                  {mode === "fixed" && "매 라운드 같은 쪽에 걸어요"}
                  {mode === "random" && "라운드마다 무작위로 골라요"}
                  {mode === "manual" && (g.placedNow ? "주사위가 구르면 알려드려요" : "배팅하기를 누르면 걸려요")}
                </>
              ) : mode === "fixed" ? (
                "고정할 쪽을 골라 주세요"
              ) : (
                "소, 럭키 7, 대 중에 골라 주세요"
              )}
            </p>
          </section>

          <MyBets rows={g.rows} refreshKey={g.pointsVersion} />
        </aside>

        {/* 지난 블록 */}
        <div className="min-w-0 space-y-3 lg:col-start-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">지난 라운드</h2>
            <div className="flex items-center gap-3 text-xs font-semibold">
              {PICKS.map((p, i) => (
                <span key={p.key} style={{ color: p.color }}>
                  {p.label} {counts[i]}
                </span>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 bg-white">
            {history.map((b) => {
              const roll = rollOf(b.hash);
              const p = PICKS[roll.pick];
              return (
                <li key={b.hash} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <a
                    href={blockUrl(b.number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-24 shrink-0 text-xs tabular-nums text-blue-600 hover:underline"
                  >
                    #{b.number.toLocaleString()}
                  </a>
                  <span className="flex gap-1">
                    <Die value={roll.dice[0]} className="h-6 w-6" />
                    <Die value={roll.dice[1]} className="h-6 w-6" />
                  </span>
                  <span className="text-xs tabular-nums text-foreground/50">합 {roll.sum}</span>
                  <span className="ml-auto text-xs font-bold" style={{ color: p.color }}>
                    {p.label}
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

/** 내 자산 카드 안의 배팅 기록 줄들 (서버 배팅 기록) */
function MyBets({ rows, refreshKey }: { rows: BetRow[]; refreshKey: number }) {
  return (
    <WalletCard empty={rows.length === 0} refreshKey={refreshKey}>
      {rows.slice(0, MY_BETS_SHOWN).map((row) => {
        const { bet } = row;
        const pick = PICKS[DICE_PICKS.indexOf(bet.pick!)];
        if (!row.revealed || !row.hash) {
          return (
            <li key={bet.id} className="animate-pop flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2 text-sm text-eth">
              <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">🔒 #{bet.targetBlockNumber?.toLocaleString()}</span>
              <span className="text-xs font-bold" style={{ color: pick.color }}>
                {pick.label}
              </span>
              <span className="text-xs font-bold tabular-nums">{Number(bet.amount).toLocaleString()} 코인</span>
              <span className="ml-auto animate-pulse text-xs font-semibold">결과 기다리는 중</span>
            </li>
          );
        }
        const roll = rollOf(row.hash);
        const win = PICKS[roll.pick].key === bet.pick;
        const profit = profitOf(row, win ? pick.times : 0);
        return (
          <li
            key={bet.id}
            className={`animate-pop flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${win ? "bg-sky-50" : "bg-foreground/[0.03]"}`}
          >
            <a
              href={blockUrl(bet.targetBlockNumber!)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-24 shrink-0 text-xs tabular-nums text-blue-600 hover:underline"
            >
              #{bet.targetBlockNumber!.toLocaleString()}
            </a>
            <span className="text-xs font-bold" style={{ color: pick.color }}>
              {pick.label}
            </span>
            <span className="text-xs text-foreground/40">→ {roll.sum}</span>
            <span className={`ml-auto text-xs font-bold tabular-nums ${win ? "text-sky-600" : "text-foreground/50"}`}>
              {win ? `🎉 +${profit.toLocaleString()}` : `😿 ${profit.toLocaleString()}`} 코인
              {!row.settled && <span className="ml-1 font-medium text-foreground/40">정산 중</span>}
            </span>
          </li>
        );
      })}
    </WalletCard>
  );
}

/** 주사위 판. 블록이 나오면 주사위 2개가 데굴데굴 구르다가 해시로 정해진 눈에서 멈춘다 */
function DiceTable({ block }: { block: Block }) {
  const roll = rollOf(block.hash);
  const [faces, setFaces] = useState<[number, number]>(roll.dice);
  const [tilt, setTilt] = useState<[number, number]>([0, 0]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const final = rollOf(block.hash).dice;
    const spin = setInterval(() => {
      setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      setTilt([Math.random() * 60 - 30, Math.random() * 60 - 30]);
    }, 90);
    const stop = setTimeout(() => {
      clearInterval(spin);
      setFaces(final);
      setTilt([0, 0]);
      setDone(true);
    }, ROLL_MS);
    return () => {
      clearInterval(spin);
      clearTimeout(stop);
    };
  }, [block.hash]);

  const p = PICKS[roll.pick];
  const tail = block.hash.slice(-4);

  return (
    <div className="px-5 pt-5 pb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
          블록 #{block.number.toLocaleString()}
        </span>
        <span
          key={String(done)}
          className={`text-sm font-black ${done ? "animate-pop" : "animate-pulse text-foreground/50"}`}
          style={done ? { color: p.color } : undefined}
        >
          {done ? `합 ${roll.sum} · ${p.label}!` : "데굴데굴..."}
        </span>
      </div>

      {/* 주사위 2개 */}
      <div className="flex items-center justify-center gap-6 py-8 sm:gap-10">
        {faces.map((v, i) => (
          <span key={`${i}-${done}`} className={`inline-block ${done ? "animate-pop" : "animate-run"}`}>
            <span className="inline-block transition-transform duration-75" style={{ transform: `rotate(${tilt[i]}deg)` }}>
              <Die value={v} className="h-24 w-24 drop-shadow-md sm:h-28 sm:w-28" />
            </span>
          </span>
        ))}
        {done && (
          <span
            className="animate-pop flex h-16 w-16 items-center justify-center rounded-full text-3xl font-black text-white shadow-md"
            style={{ background: p.color }}
          >
            {roll.sum}
          </span>
        )}
      </div>

      {/* 해시: 끝에서부터 2글자씩 읽어 주사위 눈을 정한다 */}
      <p className="font-mono text-[11px] leading-relaxed break-all text-foreground/40 sm:text-xs">
        {block.hash.slice(0, -4)}
        <b className="text-primary">{done ? tail : "????"}</b>
      </p>
      <p className="mt-1 text-[11px] text-foreground/40">
        해시 끝에서부터 두 글자씩 읽어 주사위 눈을 정해요 (00~fb 를 6으로 나눈 나머지 + 1)
      </p>
    </div>
  );
}
