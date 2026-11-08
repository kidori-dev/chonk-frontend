"use client";

import { ApiError, placeBet, type GameId } from "@/lib/api";
import { isValidBet, type PickMode } from "@/lib/betting";
import { subscribeBlocks, type BlocksEvent } from "@/lib/socket";

// 자동배팅(고정 / 랜덤). 게임 화면이 아니라 여기(모듈 전역)서 돌아서, 다른 페이지로 옮겨 가도 계속 건다.
// 여러 게임을 동시에 켜 둘 수 있고, '내 배팅' 패널이나 각 게임 화면에서 끌 수 있다.
// 새로고침하거나 탭을 닫으면 꺼진다 (모르는 사이에 계속 걸리지 않게 저장하지 않는다)

export type AutoBet = {
  game: GameId;
  mode: Exclude<PickMode, "manual">;
  /** 고정이면 거는 값, 랜덤이면 이번 라운드에 고른 값. 고르는 게 없는 게임은 null */
  pick: string | null;
  amount: number;
  /** 고를 수 있는 값 (랜덤용). null 이면 고르는 것 없이 금액만 건다 */
  picks: readonly string[] | null;
};

type State = {
  autos: Partial<Record<GameId, AutoBet>>;
  /** 자동배팅이 실패해서 멈췄을 때 이유 (게임별) */
  notices: Partial<Record<GameId, string>>;
  /** 배팅이 새로 걸린 횟수(자동 + 직접). 바뀌면 화면이 배팅 기록과 포인트를 다시 불러온다 */
  version: number;
};

const EMPTY: State = { autos: {}, notices: {}, version: 0 };
let state = EMPTY;
const listeners = new Set<() => void>();

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  syncBlocks();
}

/** useSyncExternalStore 용 */
export function subscribeAutoBets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const getAutoBets = () => state;
export const getServerAutoBets = () => EMPTY;

export function randomPickOf(picks: readonly string[] | null): string | null {
  return picks ? picks[Math.floor(Math.random() * picks.length)] : null;
}

export function startAuto(bet: AutoBet) {
  const notices = { ...state.notices };
  delete notices[bet.game];
  setState({ autos: { ...state.autos, [bet.game]: bet }, notices });
  if (bet.game === CHURU) void runChuru();
}

export function updateAuto(game: GameId, patch: Partial<Pick<AutoBet, "pick" | "amount">>) {
  const current = state.autos[game];
  if (current) setState({ autos: { ...state.autos, [game]: { ...current, ...patch } } });
}

/** 끈다. notice 를 주면 멈춘 이유로 남긴다 */
export function stopAuto(game: GameId, notice?: string) {
  const autos = { ...state.autos };
  delete autos[game];
  const notices = { ...state.notices };
  if (notice) notices[game] = notice;
  else delete notices[game];
  setState({ autos, notices });
}

/** 직접 배팅하거나 츄르를 사 줘서 포인트가 바뀌었을 때도 부른다. 내 자산 카드(모든 페이지 공유)가 기록과 포인트를 다시 불러온다 */
export function notifyBetsChanged() {
  setState({ version: state.version + 1 });
}

export function clearNotice(game: GameId) {
  if (!state.notices[game]) return;
  const notices = { ...state.notices };
  delete notices[game];
  setState({ notices });
}

// ---- 새 라운드마다 켜 둔 게임 전부 건다 ----

let unsubscribe: (() => void) | null = null;
let latest = 0;

/** 켜 둔 블록 게임이 있을 때만 블록을 구독한다 (츄르 맞추기는 블록과 상관없이 돈다) */
function syncBlocks() {
  const on = Object.keys(state.autos).some((g) => g !== CHURU);
  if (on && !unsubscribe) {
    latest = 0;
    unsubscribe = subscribeBlocks(onBlocks);
  } else if (!on && unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function onBlocks(event: BlocksEvent) {
  const prev = latest;
  latest = event.blocks[0].number;
  const target = event.round?.targetBlockNumber;
  // 처음 받은 블록(이미 열려 있던 라운드)은 건너뛰고, 새 블록이 나와 새 라운드가 열릴 때만 건다
  if (!prev || latest <= prev || !target) return;
  for (const bet of Object.values(state.autos)) if (bet.game !== CHURU) void placeAuto(bet, target);
}

async function placeAuto(bet: AutoBet, target: number) {
  const pick = bet.mode === "random" ? randomPickOf(bet.picks) : bet.pick;
  if (bet.picks && pick === null) return; // 고정인데 아직 안 골랐다
  if (!isValidBet(bet.amount)) {
    stopAuto(bet.game, "배팅 금액이 올바르지 않아 자동배팅을 멈췄어요");
    return;
  }
  if (bet.mode === "random") updateAuto(bet.game, { pick });
  try {
    await placeBet(bet.game, { targetBlockNumber: target, pick: pick ?? undefined, amount: bet.amount });
    notifyBetsChanged();
  } catch (err) {
    // 409: 이번 라운드에 이미 걸었다(화면에서 직접 걸었을 때) 또는 마감. 다음 라운드에 다시 건다
    if (err instanceof ApiError && err.status === 409) return;
    // 포인트 부족 등은 계속 실패하니 끈다
    if (state.autos[bet.game]) {
      stopAuto(bet.game, `자동배팅을 멈췄어요: ${err instanceof Error ? err.message : "배팅하지 못했어요"}`);
    }
  }
}

// ---- 츄르 그림 맞추기 자동 돌리기 ----
// 블록을 기다리지 않고 바로 결과가 나오는 게임이라, 한 판 끝나면 잠깐 쉬고 다음 판을 돌린다

const CHURU: GameId = "churu-match";
/** 자동 돌리기 한 판 간격(ms). 판을 시작한 때부터 잰다 (릴이 1.9초에 멈추고 나머지는 결과를 보여 준다) */
const CHURU_ROUND_MS = 6000;

type ChuruRound = ReturnType<typeof placeBet>;
const churuListeners = new Set<(round: ChuruRound) => void>();
let churuRunning = false;

/** 자동으로 한 판 돌릴 때마다 결과 Promise 를 받는다 (게임 화면이 릴을 돌리는 데 쓴다) */
export function onChuruRound(listener: (round: ChuruRound) => void): () => void {
  churuListeners.add(listener);
  return () => {
    churuListeners.delete(listener);
  };
}

async function runChuru() {
  if (churuRunning) return;
  churuRunning = true;
  try {
    for (let bet = state.autos[CHURU]; bet; bet = state.autos[CHURU]) {
      const startedAt = Date.now();
      const round = placeBet(CHURU, { amount: bet.amount });
      churuListeners.forEach((l) => l(round));
      try {
        await round;
        notifyBetsChanged();
      } catch (err) {
        // 포인트 부족 등은 계속 실패하니 끈다
        if (state.autos[CHURU]) {
          stopAuto(CHURU, `자동 돌리기를 멈췄어요: ${err instanceof Error ? err.message : "돌리지 못했어요"}`);
        }
        return;
      }
      await new Promise((r) => setTimeout(r, Math.max(0, startedAt + CHURU_ROUND_MS - Date.now())));
    }
  } finally {
    churuRunning = false;
  }
}
