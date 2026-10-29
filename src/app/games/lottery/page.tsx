"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AccountMenu from "@/components/AccountMenu";
import BetAmountPicker from "@/components/BetAmountPicker";
import BetButton from "@/components/BetButton";
import BetSheet from "@/components/BetSheet";
import PickModeToggle from "@/components/PickModeToggle";
import WalletCard from "@/components/WalletCard";
import type { Block } from "@/lib/api";
import { BET_AHEAD, MY_BETS_SHOWN, blockUrl } from "@/lib/betting";
import { profitOf, useBlockBetting, type BetRow } from "@/lib/useBlockBetting";

// 이더리움 블록 제비뽑기. 제비 16장(0~f) 중 해시 마지막 글자가 당첨. 맞히면 15배 (확률 1/16)
// 백엔드 chonk-backend/src/modules/games/rules.ts 의 judgeLottery 와 같은 규칙

/** 제비 16장 = 서버 pick 값 */
const CHARS = "0123456789abcdef".split("");

/** 맞히면 건 금액의 몇 배 (정산은 서버 값을 따른다) */
const PAYOUT = 15;

/** 제비 색: 4x4 로 깔았을 때 체크무늬로 주황/초록 */
const ORANGE = { color: "#e9823a", soft: "#fff1e4" };
const GREEN = { color: "#5f9b4c", soft: "#ebf5e4" };
const toneOf = (i: number) => ((Math.floor(i / 4) + i) % 2 === 0 ? ORANGE : GREEN);

/** 제비가 섞이는 시간 */
const SHUFFLE_MS = 2000;

/** 해시 마지막 글자 (소문자) */
const lastChar = (hash: string) => hash.slice(-1).toLowerCase();

export default function LotteryPage() {
  const g = useBlockBetting({ game: "lottery", picks: CHARS, revealMs: SHUFFLE_MS });
  const { latest, history, betClosed, betRemain, blockRemain, mode, amount } = g;
  const pick = g.pick;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">이더리움 블록 제비뽑기</h1>
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
        {/* 제비 판 */}
        <section className="overflow-hidden rounded-xl border border-foreground/10 bg-white shadow-sm lg:col-start-1">
          {latest ? (
            <LotteryBoard key={latest.hash} block={latest} pick={pick} />
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
          <BetSheet title="당첨 제비 맞히기" betClosed={betClosed} betRemain={betRemain}>
            <p className="mt-1 mb-3 text-sm text-foreground/60">
              {latest && <b className="text-eth">#{(latest.number + BET_AHEAD).toLocaleString()}</b>} 블록 해시의 마지막
              글자는?
            </p>

            <div className="grid grid-cols-8 gap-1.5">
              {CHARS.map((c, i) => {
                const selected = pick === c;
                const tone = toneOf(i);
                return (
                  <button
                    key={c}
                    onClick={() => g.choose(selected ? null : c)} // 한 번 더 누르면 선택 취소
                    disabled={betClosed || g.placedNow !== null}
                    className="rounded-md border-2 py-1.5 font-mono text-base font-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      color: selected ? "#fff" : tone.color,
                      borderColor: selected ? "#5b2e14" : "transparent",
                      background: selected ? tone.color : tone.soft,
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            <BetAmountPicker amount={amount} times={PAYOUT} disabled={betClosed || g.placedNow !== null} onChange={g.setAmount} />
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
                  <b className="font-mono text-primary">{pick}</b> 제비 선택!{" "}
                  {mode === "fixed" && "매 라운드 같은 제비에 걸어요"}
                  {mode === "random" && "라운드마다 무작위로 골라요"}
                  {mode === "manual" && (g.placedNow ? "제비를 뽑으면 알려드려요" : "배팅하기를 누르면 걸려요")}
                </>
              ) : mode === "fixed" ? (
                "고정할 제비를 골라 주세요"
              ) : (
                <>
                  16장 중 하나를 골라 주세요. 맞히면 <b className="text-primary">x{PAYOUT}</b>
                </>
              )}
            </p>
          </BetSheet>

          <MyBets rows={g.rows} refreshKey={g.pointsVersion} />
        </aside>

        {/* 지난 라운드 */}
        <div className="min-w-0 space-y-3 lg:col-start-1">
          <h2 className="font-semibold">지난 라운드</h2>
          <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 bg-white">
            {history.map((b) => {
              const c = lastChar(b.hash);
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
                  {/* 해시 전체, 당첨을 정한 마지막 글자만 강조 */}
                  <span className="min-w-0 flex-1 font-mono text-xs break-all text-foreground/50" title={b.hash}>
                    {b.hash.slice(0, -1)}
                    <b className="text-sm text-primary">{b.hash.slice(-1)}</b>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-foreground/60">
                    🎁 <CharChip char={c} />
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

/** 작은 제비 글자 칩 */
function CharChip({ char }: { char: string }) {
  const tone = toneOf(CHARS.indexOf(char));
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded border-2 border-[#5b2e14] font-mono text-xs font-black text-white"
      style={{ background: tone.color }}
    >
      {char}
    </span>
  );
}

/** 내 자산 카드 안의 배팅 기록 줄들 (서버 배팅 기록) */
function MyBets({ rows, refreshKey }: { rows: BetRow[]; refreshKey: number }) {
  return (
    <WalletCard empty={rows.length === 0} refreshKey={refreshKey}>
      {rows.slice(0, MY_BETS_SHOWN).map((row) => {
        const { bet } = row;
        if (!row.revealed || !row.hash) {
          return (
            <li key={bet.id} className="animate-pop flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2 text-sm text-eth">
              <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">🔒 #{bet.targetBlockNumber?.toLocaleString()}</span>
              <CharChip char={bet.pick!} />
              <span className="text-xs font-bold tabular-nums">{Number(bet.amount).toLocaleString()} 코인</span>
              <span className="ml-auto animate-pulse text-xs font-semibold">결과 기다리는 중</span>
            </li>
          );
        }
        const result = lastChar(row.hash);
        const win = result === bet.pick;
        const profit = profitOf(row, win ? PAYOUT : 0);
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
            <CharChip char={bet.pick!} />
            <span className="text-xs text-foreground/40">→ 🎁 {result}</span>
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

/** 제비 판. 블록이 나오면 16장이 들썩이며 섞이다가, 해시 마지막 글자 제비 하나가 펼쳐진다 */
function LotteryBoard({ block, pick }: { block: Block; pick: string | null }) {
  const winner = lastChar(block.hash);
  const [done, setDone] = useState(false);
  // 섞이는 동안 이리저리 옮겨 다니는 반짝임
  const [spot, setSpot] = useState<number | null>(null);

  useEffect(() => {
    const hop = setInterval(() => setSpot(Math.floor(Math.random() * CHARS.length)), 110);
    const stop = setTimeout(() => {
      clearInterval(hop);
      setSpot(null);
      setDone(true);
    }, SHUFFLE_MS);
    return () => {
      clearInterval(hop);
      clearTimeout(stop);
    };
  }, [block.hash]);

  return (
    <div className="px-5 pt-5 pb-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
          블록 #{block.number.toLocaleString()}
        </span>
        <span
          key={String(done)}
          className={`text-sm font-black ${done ? "animate-pop text-primary" : "animate-pulse text-foreground/50"}`}
        >
          {done ? `🎁 ${winner} 당첨!` : "제비 섞는 중..."}
        </span>
      </div>

      <div className="mx-auto grid max-w-sm grid-cols-4 gap-2.5 sm:gap-3">
        {CHARS.map((c, i) => (
          <Ticket
            key={c}
            char={c}
            index={i}
            state={done ? (c === winner ? "win" : "lose") : spot === i ? "spot" : "shuffle"}
            picked={pick === c}
          />
        ))}
      </div>

      <p className="mt-4 font-mono text-[11px] leading-relaxed break-all text-foreground/40 sm:text-xs">
        {block.hash.slice(0, -1)}
        <b className="text-sm text-primary">{done ? block.hash.slice(-1) : "?"}</b>
      </p>
      <p className="mt-1 text-[11px] text-foreground/40">해시 마지막 글자(0~f)와 같은 제비가 당첨이에요. 확률 1/16</p>
    </div>
  );
}

/** 제비 한 장. 접힌 쪽지 모양, 당첨이면 펼쳐지며 크게 보인다 */
function Ticket({
  char,
  index,
  state,
  picked,
}: {
  char: string;
  index: number;
  state: "shuffle" | "spot" | "win" | "lose";
  picked: boolean;
}) {
  const tone = toneOf(index);
  const win = state === "win";
  return (
    <div
      className={`relative ${state === "shuffle" || state === "spot" ? "animate-run" : win ? "animate-pop" : ""}`}
      // 제비마다 들썩이는 박자를 조금씩 어긋나게
      style={{ animationDelay: state === "shuffle" || state === "spot" ? `${(index % 5) * -60}ms` : undefined }}
    >
      <div
        className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border-[3px] border-[#5b2e14] transition-all duration-300"
        style={{
          background: win ? tone.color : tone.soft,
          opacity: state === "lose" ? 0.35 : 1,
          transform: win ? "scale(1.08)" : state === "spot" ? "translateY(-4px)" : undefined,
          boxShadow: win || state === "spot" ? `0 6px 0 ${tone.color}55` : undefined,
        }}
      >
        {/* 접힌 귀퉁이 */}
        <span
          className="absolute top-0 right-0 h-4 w-4 border-b-[3px] border-l-[3px] border-[#5b2e14] sm:h-5 sm:w-5"
          style={{ background: "#fff", borderBottomLeftRadius: 6 }}
        />
        <span className="font-mono text-2xl font-black sm:text-3xl" style={{ color: win ? "#fff" : tone.color }}>
          {char}
        </span>
        {win && <span className="absolute bottom-1 text-xs font-black text-white sm:text-sm">🎁 당첨</span>}
      </div>
      {picked && (
        <span className="animate-pop absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#5b2e14] bg-white text-xs font-black text-primary shadow">
          ✓
        </span>
      )}
    </div>
  );
}
