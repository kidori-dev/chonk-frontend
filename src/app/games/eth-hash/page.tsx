"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AccountMenu from "@/components/AccountMenu";
import BetAmountPicker from "@/components/BetAmountPicker";
import BetButton from "@/components/BetButton";
import PickModeToggle from "@/components/PickModeToggle";
import WalletCard from "@/components/WalletCard";
import type { Block } from "@/lib/api";
import { BET_AHEAD, MY_BETS_SHOWN, blockUrl } from "@/lib/betting";
import { profitOf, useBlockBetting, type BetRow } from "@/lib/useBlockBetting";

// 블록 해시의 마지막 글자(16진수)가 홀수면 동전 앞면, 짝수면 뒷면
type Side = "odd" | "even";

const SIDE = {
  odd: { label: "앞면", short: "앞", coin: "#e9823a", coinLight: "#f8b47a", coinDark: "#c4651f", coinDeep: "#9a4a12", digits: "1 3 5 7 9 b d f", text: "text-primary", bg: "bg-primary", soft: "bg-primary/10" },
  even: { label: "뒷면", short: "뒤", coin: "#8fb339", coinLight: "#bfdc72", coinDark: "#6f8f22", coinDeep: "#506a15", digits: "0 2 4 6 8 a c e", text: "text-accent", bg: "bg-accent", soft: "bg-accent/15" },
} as const;

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

/** 맞히면 건 금액의 2배를 돌려받는다 */
const PAYOUT = 2;

export default function EthHashGamePage() {
  const g = useBlockBetting({ game: "coin", picks: ["odd", "even"], revealMs: COIN_SPIN_MS });
  const { blocks, latest, history, betClosed, betRemain, mode, amount } = g;
  const pick = g.pick as Side | null;
  const remain = g.blockRemain;

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
          <AccountMenu />
        </div>
      </header>

      {/* 넓은 화면: 왼쪽 블록 / 오른쪽 배팅·자산. 좁은 화면: 블록 → 배팅·자산 → 기록 순으로 세로 */}
      {/* 모바일에서는 배팅 카드가 화면 아래에 떠 있으므로 그만큼 아래 여백을 둔다 */}
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-6 pb-88 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-6">
        {/* 최신 블록 */}
        <section className="overflow-hidden rounded-xl lg:col-start-1 border border-foreground/10 bg-white shadow-sm">
          {latest ? <LatestBlock key={latest.hash} block={latest} /> : <p className="py-24 text-center text-foreground/50">블록 불러오는 중...</p>}

          {/* 다음 블록까지 남은 시간 */}
          <div className="flex items-center justify-between border-t border-foreground/10 px-5 py-3 text-sm">
            <span className="text-foreground/60">
              다음 블록 <b className="text-foreground">{latest ? `#${(latest.number + 1).toLocaleString()}` : ""}</b>
            </span>
            <span className="rounded-full bg-eth/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-eth">
              {remain > 0 ? `${remain}초 뒤 생성` : "곧 나와요!"}
            </span>
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
                    onClick={() => g.choose(selected ? null : side)} // 한 번 더 누르면 선택 취소
                    disabled={betClosed || g.placedNow !== null}
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
            <BetAmountPicker
              amount={amount}
              times={PAYOUT}
              disabled={betClosed || g.placedNow !== null}
              onChange={g.setAmount}
            />
            <BetButton
              loggedIn={g.loggedIn}
              amount={amount}
              placed={g.placedNow}
              placing={g.placing}
              disabled={betClosed || !pick}
              onClick={() => g.place()}
            />
            {/* 다음 라운드 선택 방식 */}
            <PickModeToggle mode={mode} onChange={g.changeMode} />
            <p className="mt-3 text-center text-sm text-foreground/60">
              {g.message ? (
                <b className="text-red-500">{g.message}</b>
              ) : betClosed && latest ? (
                <>
                  배팅 마감! 다음 블록이 나오면 <b className="text-eth">#{(latest.number + BET_AHEAD + 1).toLocaleString()}</b> 배팅이 열려요
                </>
              ) : pick ? (
                <>
                  <b className={SIDE[pick].text}>{SIDE[pick].label}</b> 선택!{" "}
                  {mode === "fixed" && "매 라운드 같은 면으로 걸어요"}
                  {mode === "random" && "라운드마다 무작위로 골라요"}
                  {mode === "manual" && (g.placedNow ? "블록이 나오면 결과를 알려드려요" : "배팅하기를 누르면 걸려요")}
                </>
              ) : mode === "fixed" ? (
                "고정할 면을 골라 주세요"
              ) : (
                "앞면이나 뒷면을 골라 주세요"
              )}
            </p>
          </section>

          <MyBets rows={g.rows} refreshKey={g.pointsVersion} />
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

          {/* 지난 라운드 (서버가 확정한 결과) */}
          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">지난 라운드</h2>
              <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 bg-white">
                {history.map((b) => {
                  const side = sideOf(b.hash);
                  return (
                    <li key={b.hash} className="flex items-center gap-3 px-4 py-3">
                      {/* 블록 번호를 누르면 이더스캔에서 블록 정보를 연다 */}
                      <a
                        href={blockUrl(b.number)}
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

/** 내 자산 카드 안의 배팅 기록 줄들 (서버 배팅 기록) */
function MyBets({ rows, refreshKey }: { rows: BetRow[]; refreshKey: number }) {
  return (
    <WalletCard empty={rows.length === 0} refreshKey={refreshKey}>
      {rows.slice(0, MY_BETS_SHOWN).map((row) => {
        const { bet } = row;
        const pick = SIDE[bet.pick as Side];
        // 결과를 기다리는 배팅
        if (!row.revealed || !row.hash) {
          return (
            <li key={bet.id} className="animate-pop flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2.5 text-sm text-eth">
              <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">🔒 #{bet.targetBlockNumber?.toLocaleString()}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold text-white ${pick.bg}`}>{pick.short}</span>
              <span className="text-xs font-bold tabular-nums">{Number(bet.amount).toLocaleString()} 코인</span>
              <span className="ml-auto animate-pulse text-xs font-semibold">결과 기다리는 중</span>
            </li>
          );
        }
        const char = lastChar(row.hash);
        const win = sideOf(row.hash) === bet.pick;
        const profit = profitOf(row, win ? PAYOUT : 0);
        return (
          <li
            key={bet.id}
            className={`animate-pop flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${win ? "bg-sky-50" : "bg-foreground/[0.03]"}`}
          >
            <a
              href={blockUrl(bet.targetBlockNumber!)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-24 shrink-0 text-xs tabular-nums text-blue-600 hover:underline"
            >
              #{bet.targetBlockNumber!.toLocaleString()}
            </a>
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold text-white ${pick.bg}`}>{pick.short}</span>
            <span className="text-xs text-foreground/40">→</span>
            <span className={`font-mono font-black ${SIDE[sideOf(row.hash)].text}`}>{char}</span>
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
