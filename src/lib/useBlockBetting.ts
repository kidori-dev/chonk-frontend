"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  BLOCK_INTERVAL_MS,
  getMyBets,
  hasTokens,
  subscribeAuth,
  placeBet,
  type Bet,
  type Block,
  type GameId,
  type Round,
} from "@/lib/api";
import {
  clearNotice,
  getAutoBets,
  getServerAutoBets,
  notifyBetsChanged,
  randomPickOf,
  startAuto,
  stopAuto,
  subscribeAutoBets,
  updateAuto,
} from "@/lib/autoBet";
import { DEFAULT_BET, isValidBet, MY_BETS_SIZE, type PickMode } from "@/lib/betting";
import { serverNow, subscribeBlocks, subscribeRounds, type BlocksEvent } from "@/lib/socket";

/** 게임 히스토리에 남겨 두는 라운드 수 */
const ROUNDS_SIZE = 20;


/**
 * 블록 게임(동전, 고양이 경주, 그림 맞추기, 주사위)이 같이 쓰는 배팅 흐름.
 *
 * - 블록과 지금 라운드(판정 블록 번호, 마감 시각)는 소켓으로 받는다. 지금 블록이 N 이면 N+2 블록에 건다
 * - 게임 히스토리는 서버가 확정한 라운드 결과(game_rounds)를 소켓으로 받는다
 * - "배팅하기"를 누르면 서버에 배팅하고 포인트가 빠진다. 취소는 없다
 * - 자동 모드(fixed: 같은 선택 / random: 무작위)는 새 라운드가 열리면 알아서 건다.
 *   페이지를 옮겨 가도 계속 돌도록 src/lib/autoBet.ts(전역)에서 돌린다
 * - 결과는 판정 블록이 나오면 화면에서 바로 계산해 보여주고, 포인트는 서버가 정산하면(판정 블록 + 2) 들어온다
 * - 내 포인트와 배팅 기록은 모든 게임이 같이 쓰는 내 자산 카드(WalletCard)가 보여준다
 *
 * picks: 고를 수 있는 값 (서버 pick 값). null 이면 고르는 것 없이 금액만 건다
 */
export function useBlockBetting({ game, picks }: { game: GameId; picks: readonly string[] | null }) {
  const loggedIn = useSyncExternalStore(subscribeAuth, hasTokens, () => false);
  const [blocks, setBlocks] = useState<Block[]>([]); // 최신이 앞
  const [round, setRound] = useState<BlocksEvent["round"]>(null);
  // 확정된 라운드 결과 (최신이 앞)
  const [rounds, setRounds] = useState<Round[]>([]);
  const [now, setNow] = useState(0);
  // 자동배팅은 전역(src/lib/autoBet.ts)에서 돈다. 켜져 있으면 고른 값·금액도 거기 값을 쓴다
  const { autos, notices, version: autoVersion } = useSyncExternalStore(
    subscribeAutoBets,
    getAutoBets,
    getServerAutoBets,
  );
  const auto = autos[game] ?? null;
  const [localPick, setLocalPick] = useState<string | null>(() => getAutoBets().autos[game]?.pick ?? null);
  const [localAmount, setLocalAmount] = useState(() => getAutoBets().autos[game]?.amount ?? DEFAULT_BET);
  const mode: PickMode = auto?.mode ?? "manual";
  const pick = auto ? auto.pick : localPick;
  const amount = auto ? auto.amount : localAmount;
  const [bets, setBets] = useState<Bet[]>([]);
  const [placing, setPlacing] = useState(false);
  const [localMessage, setMessage] = useState<string | null>(null);
  const message = localMessage ?? notices[game] ?? null;

  // 새 블록 콜백에서 최신 값을 읽기 위한 ref
  const live = useRef({ pick, amount, latest: 0, target: 0, loggedIn, placing: false });
  useEffect(() => {
    Object.assign(live.current, { pick, amount, loggedIn });
  }, [pick, amount, loggedIn]);

  // 배팅이 새로 걸렸으면(자동배팅은 다른 페이지에 있는 동안에도) 이번 라운드에 걸었는지 다시 확인한다
  useEffect(() => {
    if (autoVersion > 0) void refreshBets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVersion]);

  async function refreshBets() {
    if (!live.current.loggedIn) return;
    try {
      const { items } = await getMyBets(game, MY_BETS_SIZE);
      setBets(items);
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
    if (!isValidBet(live.current.amount)) {
      setMessage("배팅 금액을 1 이상으로 입력해 주세요");
      if (auto) stopAuto(game);
      return;
    }
    live.current.placing = true;
    setPlacing(true);
    setMessage(null);
    clearNotice(game);
    try {
      const { bet } = await placeBet(game, {
        targetBlockNumber: target,
        pick: p ?? undefined,
        amount: live.current.amount,
      });
      setBets((prev) => [bet, ...prev.filter((b) => b.id !== bet.id)].slice(0, MY_BETS_SIZE));
      notifyBetsChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "배팅하지 못했어요");
      // 자동 배팅이 실패하면(포인트 부족 등) 자동을 끈다
      if (auto) stopAuto(game);
    } finally {
      live.current.placing = false;
      setPlacing(false);
    }
  }

  function choose(p: string | null) {
    setLocalPick(p);
    if (auto) updateAuto(game, { pick: p });
    setMessage(null);
  }

  function setAmount(a: number) {
    setLocalAmount(a);
    if (auto) updateAuto(game, { amount: a });
  }

  function changeMode(next: PickMode) {
    setMessage(null);
    if (next === "manual") {
      stopAuto(game);
      return;
    }
    if (!loggedIn) {
      setMessage("로그인하면 자동배팅을 쓸 수 있어요");
      return;
    }
    if (!isValidBet(amount)) {
      setMessage("배팅 금액을 1 이상으로 입력해 주세요");
      return;
    }
    const p = next === "random" ? randomPickOf(picks) : pick;
    setLocalPick(p);
    startAuto({ game, mode: next, pick: p, amount, picks });
    // 랜덤으로 바꾸면 이번 라운드도 바로 골라 건다 (이미 걸었거나 마감이면 다음 라운드부터)
    if (next === "random" && !placedNow && !betClosed) void place(p, true);
  }

  useEffect(() => {
    let first = true;

    const unsubscribe = subscribeBlocks((event) => {
      const next = event.blocks;
      const prevLatest = live.current.latest;
      const latest = next[0].number;
      live.current.latest = latest;
      live.current.target = event.round?.targetBlockNumber ?? 0;
      setBlocks(next);
      setRound(event.round);

      if (first) {
        first = false;
        void refreshBets();
        return;
      }
      if (latest === prevLatest) return;
      void refreshBets();

      // 새 라운드: 직접 고르기면 선택을 비운다. 자동배팅은 전역(autoBet.ts)에서 알아서 건다
      if (latest > prevLatest && !getAutoBets().autos[game]) setLocalPick(null);
    });

    // 라운드 결과 (게임 히스토리)
    const unsubscribeRounds = subscribeRounds(
      game,
      (init) => setRounds(init),
      (added) => {
        setRounds((prev) => {
          const known = new Set(prev.map((r) => r.blockNumber));
          return [...added.filter((r) => !known.has(r.blockNumber)), ...prev].slice(0, ROUNDS_SIZE);
        });
      },
    );

    const tick = setInterval(() => setNow(serverNow()), 200);
    return () => {
      unsubscribe();
      unsubscribeRounds();
      clearInterval(tick);
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
  };
}

