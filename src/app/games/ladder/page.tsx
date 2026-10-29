"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AccountMenu from "@/components/AccountMenu";
import BetAmountPicker from "@/components/BetAmountPicker";
import BetButton from "@/components/BetButton";
import BetSheet from "@/components/BetSheet";
import CatHead, { type CatKind } from "@/components/CatHead";
import PickModeToggle from "@/components/PickModeToggle";
import WalletCard from "@/components/WalletCard";
import type { Block } from "@/lib/api";
import { BET_AHEAD, MY_BETS_SHOWN, blockUrl } from "@/lib/betting";
import { LADDER_COLS, LADDER_ROWS, ladderOf, pathOf } from "@/lib/ladder";
import { profitOf, useBlockBetting, type BetRow } from "@/lib/useBlockBetting";

// 이더리움 블록 사다리. 4줄 중 하나만 당첨. 규칙은 src/lib/ladder.ts (백엔드 rules.ts 와 같아야 한다)

/** chars = 해시 마지막 글자가 이 범위면 당첨 */
const CATS: { kind: CatKind; name: string; color: string; chars: string }[] = [
  { kind: "orange", name: "치즈", color: "#e9823a", chars: "0~3" },
  { kind: "black", name: "까망", color: "#3d3434", chars: "4~7" },
  { kind: "calico", name: "삼색이", color: "#b4622a", chars: "8~b" },
  { kind: "white", name: "하양", color: "#5d97c0", chars: "c~f" },
];

/** 맞히면 건 금액의 몇 배 (정산은 서버 값을 따른다) */
const PAYOUT = 3.8;

/** 가로줄이 하나씩 나타나는 간격, 그 뒤 길을 그리는 시간 */
const RUNG_STEP_MS = 80;
const DRAW_MS = 3000;

/** 새 블록 애니메이션이 끝나는 시간 (가로줄 + 길 그리기) */
const REVEAL_MS = (LADDER_ROWS + 1) * RUNG_STEP_MS + DRAW_MS;

/** 서버 pick 값 = 출발 칸 번호 (CATS 순서) */
const LADDER_PICKS = CATS.map((_, i) => String(i));

export default function LadderPage() {
  const g = useBlockBetting({ game: "ladder", picks: LADDER_PICKS, revealMs: REVEAL_MS });
  const { latest, history, betClosed, betRemain, blockRemain, mode, amount } = g;
  // 고른 출발 칸 (CATS 의 순서)
  const pick = g.pick === null ? null : Number(g.pick);

  // 지난 라운드에서 출발 칸별 당첨 횟수
  const wins = [0, 0, 0, 0];
  history.forEach((b) => wins[ladderOf(b.hash).winner]++);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">이더리움 블록 사다리</h1>
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
        {/* 사다리 판 */}
        <section className="overflow-hidden rounded-xl border border-foreground/10 bg-white shadow-sm lg:col-start-1">
          {latest ? (
            <LadderBoard key={latest.hash} block={latest} pick={pick} />
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
          <BetSheet title="해시 마지막 값 맞히기" betClosed={betClosed} betRemain={betRemain}>
            <p className="mt-1 mb-3 text-sm text-foreground/60">
              {latest && <b className="text-eth">#{(latest.number + BET_AHEAD).toLocaleString()}</b>} 블록 해시의 마지막
              글자는?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {CATS.map((cat, i) => {
                const selected = pick === i;
                return (
                  <button
                    key={cat.kind}
                    onClick={() => g.choose(selected ? null : LADDER_PICKS[i])} // 한 번 더 누르면 선택 취소
                    disabled={betClosed || g.placedNow !== null}
                    className="relative flex flex-col items-center rounded-lg border-2 py-2 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ borderColor: selected ? cat.color : "transparent", background: `${cat.color}1a` }}
                  >
                    <CatHead cat={cat.kind} className="h-10 w-10" />
                    <span className="mt-1 text-xs font-black" style={{ color: cat.color }}>
                      {i + 1}번 {cat.name}
                    </span>
                    <span className="font-mono text-[11px] text-foreground/50">{cat.chars}</span>
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
            <p className="mt-3 text-xs text-foreground/50">
              맞히면 <b className="text-primary">x{PAYOUT}</b>. 고른 줄은 지금 사다리에서 미리 굵게 보여 드려요
            </p>

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
                  <b style={{ color: CATS[pick].color }}>
                    {pick + 1}번 {CATS[pick].name}
                  </b>{" "}
                  선택! {mode === "fixed" && "매 라운드 같은 줄에 걸어요"}
                  {mode === "random" && "라운드마다 무작위로 골라요"}
                  {mode === "manual" && (g.placedNow ? "사다리를 다 타면 알려드려요" : "배팅하기를 누르면 걸려요")}
                </>
              ) : mode === "fixed" ? (
                "고정할 줄을 골라 주세요"
              ) : (
                "4줄 중에 하나를 골라 주세요"
              )}
            </p>
          </BetSheet>

          <MyBets rows={g.rows} refreshKey={g.pointsVersion} />
        </aside>

        {/* 지난 사다리 */}
        <div className="min-w-0 space-y-3 lg:col-start-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">지난 라운드</h2>
            <div className="flex items-center gap-2 text-xs">
              {CATS.map((cat, i) => (
                <span key={cat.kind} className="flex items-center gap-0.5 font-semibold" style={{ color: cat.color }}>
                  <CatHead cat={cat.kind} className="h-4 w-4" />
                  {wins[i]}
                </span>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 bg-white">
            {history.map((b) => {
              const l = ladderOf(b.hash);
              const cat = CATS[l.winner];
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
                  <span className="flex items-center gap-1 font-bold" style={{ color: cat.color }}>
                    🎁
                    <CatHead cat={cat.kind} className="h-6 w-6" />
                    {l.winner + 1}번 {cat.name}
                  </span>
                  <span className="ml-auto text-xs text-foreground/40">
                    마지막 글자 <b className="font-mono">{b.hash.slice(-1)}</b>
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
        const picked = Number(bet.pick);
        const cat = CATS[picked];
        const label = (
          <span className="flex items-center gap-0.5 text-xs font-bold" style={{ color: cat.color }}>
            <CatHead cat={cat.kind} className="h-4 w-4" />
            {picked + 1}번
          </span>
        );
        if (!row.revealed || !row.hash) {
          return (
            <li key={bet.id} className="animate-pop flex items-center gap-2 rounded-lg bg-eth/10 px-3 py-2 text-sm text-eth">
              <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">🔒 #{bet.targetBlockNumber?.toLocaleString()}</span>
              {label}
              <span className="text-xs font-bold tabular-nums">{Number(bet.amount).toLocaleString()} 코인</span>
              <span className="ml-auto animate-pulse text-xs font-semibold">결과 기다리는 중</span>
            </li>
          );
        }
        const winner = ladderOf(row.hash).winner;
        const win = winner === picked;
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
            {label}
            <span className="text-xs text-foreground/40">→ 🎁 {winner + 1}번</span>
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

// 판 크기 (SVG 좌표)
const W = 320;
const TOP = 56;
const BOTTOM = 330;
const colX = (c: number) => 40 + c * ((W - 80) / (LADDER_COLS - 1));
const rowY = (r: number) => (r < 0 ? TOP : r >= LADDER_ROWS ? BOTTOM : TOP + 18 + r * ((BOTTOM - TOP - 36) / (LADDER_ROWS - 1)));

/** 고양이 머리 크기, 출발·도착할 때 머리 가운데 높이 */
const HEAD = 36;
const HEAD_START_Y = 26;
const HEAD_END_Y = BOTTOM - 12;

/** 고양이가 걷는 길 (SVG 좌표). 사다리 위에서 출발해 도착 칸 바로 위에서 멈춘다 */
function walkPoints(rungs: boolean[][], start: number): { x: number; y: number }[] {
  const points = pathOf(rungs, start).map((p) => ({ x: colX(p.col), y: rowY(p.row) }));
  points[0].y = HEAD_START_Y;
  points[points.length - 1].y = HEAD_END_Y;
  return points;
}

/** 길 전체 길이 중 t(0~1) 만큼 간 지점 */
function pointAt(points: { x: number; y: number }[], t: number): { x: number; y: number } {
  const lens = points.slice(1).map((p, i) => Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y));
  let left = t * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i]) {
      const k = lens[i] ? left / lens[i] : 0;
      return { x: points[i].x + (points[i + 1].x - points[i].x) * k, y: points[i].y + (points[i + 1].y - points[i].y) * k };
    }
    left -= lens[i];
  }
  return points[points.length - 1];
}

/** 사다리 판. 가로줄이 위에서부터 하나씩 생기고, 고양이 4마리가 사다리를 타고 내려가 당첨 칸을 가린다 */
function LadderBoard({ block, pick }: { block: Block; pick: number | null }) {
  const ladder = ladderOf(block.hash);
  const [stage, setStage] = useState<"rungs" | "draw" | "done">("rungs");
  const [rungsShown, setRungsShown] = useState(0);
  // 고양이가 길을 얼마나 갔는지 (0~1)
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let frame = 0;
    for (let r = 1; r <= LADDER_ROWS; r++) timers.push(setTimeout(() => setRungsShown(r), r * RUNG_STEP_MS));
    const drawAt = (LADDER_ROWS + 1) * RUNG_STEP_MS;
    timers.push(
      setTimeout(() => {
        setStage("draw");
        const startedAt = performance.now();
        const step = (time: number) => {
          const t = Math.min(1, (time - startedAt) / DRAW_MS);
          setProgress(t);
          if (t < 1) frame = requestAnimationFrame(step);
          else setStage("done");
        };
        frame = requestAnimationFrame(step);
      }, drawAt),
    );
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
  }, [block.hash]);

  const done = stage === "done";
  const winner = CATS[ladder.winner];
  const walks = CATS.map((_, c) => walkPoints(ladder.rungs, c));

  return (
    <div className="px-5 pt-5 pb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
          블록 #{block.number.toLocaleString()}
        </span>
        <span
          key={String(done)}
          className={`text-sm font-black ${done ? "animate-pop" : "animate-pulse text-foreground/50"}`}
          style={done ? { color: winner.color } : undefined}
        >
          {done ? `🎁 ${ladder.winner + 1}번 ${winner.name} 당첨!` : stage === "rungs" ? "사다리 그리는 중..." : "내려가는 중..."}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${BOTTOM + 44}`} className="mx-auto block w-full max-w-md">
        {/* 세로줄 */}
        {CATS.map((_, c) => (
          <line key={c} x1={colX(c)} x2={colX(c)} y1={TOP} y2={BOTTOM} stroke="#5b2e14" strokeOpacity={0.18} strokeWidth={6} strokeLinecap="round" />
        ))}

        {/* 가로줄 (위에서부터 차례로 나타난다) */}
        {ladder.rungs.map((row, r) =>
          row.map(
            (on, g) =>
              on && (
                <line
                  key={`${r}-${g}`}
                  x1={colX(g)}
                  x2={colX(g + 1)}
                  y1={rowY(r)}
                  y2={rowY(r)}
                  stroke="#5b2e14"
                  strokeOpacity={r < rungsShown ? 0.18 : 0}
                  strokeWidth={6}
                  strokeLinecap="round"
                  style={{ transition: "stroke-opacity 0.2s" }}
                />
              ),
          ),
        )}

        {/* 고양이가 지나간 자국 (머리 뒤로 길이 그려진다) */}
        {CATS.map((cat, c) => {
          const strong = done ? c === ladder.winner || c === pick : c === pick;
          return (
            <polyline
              key={cat.kind}
              points={walks[c].map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={cat.color}
              strokeWidth={strong ? 6 : 3}
              strokeOpacity={done && !strong ? 0.35 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
              style={{ transition: "stroke-width 0.3s, stroke-opacity 0.3s" }}
            />
          );
        })}

        {/* 고양이 머리 4마리: 위에서 기다리다가 사다리를 타고 내려간다. 고른 고양이는 조금 크게, 꽝에 도착한 고양이는 사라진다 */}
        {CATS.map((cat, c) => {
          const { x, y } = pointAt(walks[c], progress);
          const isWinner = c === ladder.winner;
          const size = c === pick ? HEAD + 6 : HEAD;
          return (
            <g key={cat.kind} transform={`translate(${x} ${y})`} opacity={done && !isWinner ? 0 : 1} style={{ transition: "opacity 0.3s" }}>
              <foreignObject x={-size / 2} y={-size / 2} width={size} height={size} overflow="visible">
                <div className={`h-full w-full ${stage === "draw" ? "animate-run" : done && isWinner ? "animate-pop" : ""}`}>
                  <CatHead cat={cat.kind} className="h-full w-full drop-shadow" />
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* 도착: 당첨 칸 하나, 나머지는 꽝 */}
        {CATS.map((_, c) => {
          const prize = c === ladder.prize;
          return (
            <g key={c} transform={`translate(${colX(c)} ${BOTTOM + 22})`}>
              <rect
                x={-28}
                y={-16}
                width={56}
                height={32}
                rx={8}
                fill={done && prize ? winner.color : "#fff"}
                stroke={prize && done ? winner.color : "#5b2e14"}
                strokeOpacity={prize && done ? 1 : 0.15}
                strokeWidth={2}
                style={{ transition: "fill 0.3s" }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={800}
                fill={done && prize ? "#fff" : "#5b2e14"}
                fillOpacity={done ? 1 : 0.35}
              >
                {done ? (prize ? "🎁 당첨" : "꽝") : "?"}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 font-mono text-[11px] leading-relaxed break-all text-foreground/40 sm:text-xs">
        {block.hash.slice(0, -1)}
        <b className="text-sm text-primary">{block.hash.slice(-1)}</b>
      </p>
      <p className="mt-1 text-[11px] text-foreground/40">
        해시 마지막 글자가 0~3 이면 1번, 4~7 이면 2번, 8~b 면 3번, c~f 면 4번 당첨! 사다리는 그 결과를 보여주는 연출이에요
      </p>
    </div>
  );
}
