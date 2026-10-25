"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  BLOCK_INTERVAL_MS,
  getMyBets,
  hasTokens,
  placeBet,
  type Bet,
  type Block,
  type GameId,
  type Round,
} from "@/lib/api";
import { BET_AMOUNTS, MY_BETS_SIZE, type PickMode } from "@/lib/betting";
import { serverNow, subscribeBlocks, subscribeRounds, type BlocksEvent } from "@/lib/socket";

/** 게임 히스토리에 남겨 두는 라운드 수 */
const ROUNDS_SIZE = 20;

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다
const subscribeNothing = () => () => {};

/**
 * 내 배팅 기록 한 줄
 * - waiting: 판정 블록이 아직 안 나왔거나 애니메이션 중
 * - revealed: 판정 블록이 나왔다. hash 로 결과를 보여준다 (settled 가 false 면 서버 정산 전)
 */
export type BetRow = { bet: Bet; hash: string | null; revealed: boolean; settled: boolean };

/**
 * 블록 게임(동전, 고양이 경주, 그림 맞추기, 주사위)이 같이 쓰는 배팅 흐름.
 *
 * - 블록과 지금 라운드(판정 블록 번호, 마감 시각)는 소켓으로 받는다. 지금 블록이 N 이면 N+2 블록에 건다
 * - 게임 히스토리는 서버가 확정한 라운드 결과(game_rounds)를 소켓으로 받는다
 * - "배팅하기"를 누르면 서버에 배팅하고 포인트가 빠진다. 취소는 없다
 * - 자동 모드(fixed: 같은 선택 / random: 무작위)는 새 라운드가 열리면 알아서 건다
 * - 결과는 판정 블록이 나오면 화면에서 바로 계산해 보여주고, 포인트는 서버가 정산하면(판정 블록 + 2) 들어온다
 *
 * picks: 고를 수 있는 값 (서버 pick 값). null 이면 고르는 것 없이 금액만 건다
 * revealMs: 새 블록 애니메이션 길이. 끝난 뒤에 결과 줄을 보여준다
 */
export function useBlockBetting({
  game,
  picks,
  revealMs,
}: {
  game: GameId;
  picks: readonly string[] | null;
  revealMs: number;
}) {
  const loggedIn = useSyncExternalStore(subscribeNothing, hasTokens, () => false);
  const [blocks, setBlocks] = useState<Block[]>([]); // 최신이 앞
  const [round, setRound] = useState<BlocksEvent["round"]>(null);
  // 확정된 라운드 결과 (최신이 앞)
  const [rounds, setRounds] = useState<Round[]>([]);
  const [now, setNow] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [mode, setMode] = useState<PickMode>("manual");
  const [amount, setAmount] = useState(BET_AMOUNTS[0]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // 애니메이션이 끝나 결과를 보여줘도 되는 가장 최신 블록 번호
  const [revealedNumber, setRevealedNumber] = useState(0);
  // 포인트가 바뀌었을 수 있을 때 올린다 (WalletCard 가 다시 불러온다)
  const [pointsVersion, setPointsVersion] = useState(0);

  // 새 블록 콜백에서 최신 값을 읽기 위한 ref
  const live = useRef({ pick, mode, amount, latest: 0, target: 0, loggedIn, placing: false });
  useEffect(() => {
    Object.assign(live.current, { pick, mode, amount, loggedIn });
  }, [pick, mode, amount, loggedIn]);

  function randomPick(): string | null {
    return picks ? picks[Math.floor(Math.random() * picks.length)] : null;
  }

  async function refreshBets() {
    if (!live.current.loggedIn) return;
    try {
      const { items } = await getMyBets(game, MY_BETS_SIZE);
      setBets((prev) => {
        // 새로 정산된 배팅이 있으면 포인트를 다시 불러온다
        const settledBefore = new Set(prev.filter((b) => b.status === "settled").map((b) => b.id));
        if (items.some((b) => b.status === "settled" && !settledBefore.has(b.id))) setPointsVersion((v) => v + 1);
        return items;
      });
    } catch {
      // 다음 블록 때 다시
    }
  }

  /** 이번 라운드(최신 블록 + 2)에 건다. p 를 안 주면 지금 고른 값 */
  async function place(p: string | null = live.current.pick, auto = false) {
    const target = live.current.target;
    if (!target || live.current.placing) return;
    if (picks && p === null) {
      setMessage("먼저 골라 주세요");
      return;
    }
    live.current.placing = true;
    setPlacing(true);
    setMessage(null);
    try {
      const { bet } = await placeBet(game, {
        targetBlockNumber: target,
        pick: p ?? undefined,
        amount: live.current.amount,
      });
      setBets((prev) => [bet, ...prev.filter((b) => b.id !== bet.id)].slice(0, MY_BETS_SIZE));
      setPointsVersion((v) => v + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "배팅하지 못했어요");
      // 자동 배팅이 실패하면(포인트 부족 등) 자동을 끈다
      if (auto) setMode("manual");
    } finally {
      live.current.placing = false;
      setPlacing(false);
    }
  }

  function choose(p: string | null) {
    setPick(p);
    setMessage(null);
  }

  function changeMode(next: PickMode) {
    setMode(next);
    // 랜덤으로 바꾸면 이번 라운드도 바로 골라 건다 (이미 걸었거나 마감이면 다음 라운드부터)
    if (next === "random" && !placedNow && !betClosed && loggedIn) {
      const p = randomPick();
      setPick(p);
      void place(p, true);
    }
  }

  useEffect(() => {
    let first = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const unsubscribe = subscribeBlocks((event) => {
      const next = event.blocks;
      const prevLatest = live.current.latest;
      const latest = next[0].number;
      live.current.latest = latest;
      live.current.target = event.round?.targetBlockNumber ?? 0;
      setBlocks(next);
      setRound(event.round);

      if (first) {
        // 처음 받은 블록은 애니메이션 없이 바로 결과를 보여준다
        first = false;
        setRevealedNumber(latest);
        void refreshBets();
        return;
      }
      if (latest === prevLatest) return;
      timers.push(setTimeout(() => setRevealedNumber(latest), revealMs));
      void refreshBets();

      // 새 라운드: 고정이면 같은 값, 랜덤이면 무작위로 알아서 건다. 직접 고르기면 선택을 비운다
      if (latest > prevLatest) {
        const { mode: m, pick: p, loggedIn: li } = live.current;
        if (m === "manual") {
          setPick(null);
        } else if (li) {
          const nextPick = m === "random" ? randomPick() : p;
          setPick(nextPick);
          void place(nextPick, true);
        }
      }
    });

    // 라운드 결과: 새로 확정되면 내 배팅도 정산됐을 수 있으니 다시 불러온다
    const unsubscribeRounds = subscribeRounds(
      game,
      (init) => setRounds(init),
      (added) => {
        setRounds((prev) => {
          const known = new Set(prev.map((r) => r.blockNumber));
          return [...added.filter((r) => !known.has(r.blockNumber)), ...prev].slice(0, ROUNDS_SIZE);
        });
        void refreshBets();
      },
    );

    const tick = setInterval(() => setNow(serverNow()), 200);
    return () => {
      unsubscribe();
      unsubscribeRounds();
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = blocks[0];
  const previous = blocks.slice(1);
  // 게임 히스토리: 서버가 확정한 라운드 결과 (블록 모양으로 바꿔서 페이지의 결과 계산 함수를 그대로 쓴다)
  const history: Block[] = rounds.map((r) => ({ number: r.blockNumber, hash: r.blockHash, timestamp: 0 }));
  const elapsed = latest && now ? Math.max(0, now - latest.timestamp) : 0;
  // 마감은 서버가 알려준 시각 기준
  const betClosed = !round || !now || now >= round.closesAt;
  const betRemain = round && now ? Math.max(0, Math.ceil((round.closesAt - now) / 1000)) : 0;
  const blockRemain = Math.max(0, Math.ceil((BLOCK_INTERVAL_MS - elapsed) / 1000));
  const target = round?.targetBlockNumber ?? null;
  // 이번 라운드에 이미 건 배팅
  const placedNow = bets.find((b) => b.targetBlockNumber === target) ?? null;

  const rows: BetRow[] = bets.map((bet) => {
    const block = blocks.find((b) => b.number === bet.targetBlockNumber);
    const hash = bet.blockHash ?? block?.hash ?? null;
    const revealed = bet.status === "settled" || (hash !== null && bet.targetBlockNumber! <= revealedNumber);
    return { bet, hash, revealed, settled: bet.status === "settled" };
  });

  return {
    loggedIn,
    blocks,
    latest,
    previous,
    rounds,
    history,
    target,
    betClosed,
    betRemain,
    blockRemain,
    pick,
    choose,
    mode,
    changeMode,
    amount,
    setAmount,
    place,
    placing,
    placedNow,
    message,
    rows,
    pointsVersion,
  };
}

/** 정산이 끝났으면 서버 값, 아니면 화면에서 계산한 배수로 얻거나 잃은 포인트 */
export function profitOf(row: BetRow, localMultiplier: number): number {
  const amount = Number(row.bet.amount);
  const payout = row.settled ? Number(row.bet.payout) : amount * localMultiplier;
  return Math.round((payout - amount) * 1e6) / 1e6;
}
