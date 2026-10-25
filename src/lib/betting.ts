// 이더리움 블록 게임(동전 던지기, 고양이 경주, 그림 맞추기, 주사위)이 같이 쓰는 배팅 규칙.
// 서버(chonk-backend/src/modules/games/rules.ts)와 같은 값이어야 한다

import { BLOCK_INTERVAL_MS } from "@/lib/api";

/**
 * 라운드 규칙: 지금 블록이 N 이면 N+2 블록에 건다.
 * N+1 이 나오는 순간 N+2 배팅은 마감(locked)되고 N+3 배팅이 열린다.
 * 블록이 퍼지는 사이에 결과를 먼저 알고 거는 걸 막기 위해 한 블록 여유를 둔다.
 */
export const BET_AHEAD = 2;

/** 블록이 나오고(블록 시각 기준) 9초 동안만 배팅할 수 있고, 다음 블록 전 마지막 3초는 마감 */
export const BET_OPEN_MS = BLOCK_INTERVAL_MS - 3_000;

/** 고를 수 있는 배팅 금액(포인트) */
export const BET_AMOUNTS = [10, 50, 100];

/** 배팅 기록 카드에 보여줄 줄 수 (결과 기다리는 줄 포함) */
export const MY_BETS_SHOWN = 5;

/** 서버에서 불러오는 배팅 기록 수 */
export const MY_BETS_SIZE = 20;

/** 새 라운드가 열리면 어떻게 할지. manual(기본): 선택을 비움, fixed: 같은 선택으로 자동 배팅, random: 무작위로 골라 자동 배팅 */
export type PickMode = "manual" | "fixed" | "random";

/** 블록 탐색기 (백엔드가 Sepolia 를 쓴다) */
const EXPLORER_URL = "https://sepolia.etherscan.io";

export function blockUrl(blockNumber: number): string {
  return `${EXPLORER_URL}/block/${blockNumber}`;
}

export function addressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}

export function txUrl(txHash: string): string {
  return `${EXPLORER_URL}/tx/${txHash}`;
}
