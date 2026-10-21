// 이더리움 블록 게임(동전 던지기, 고양이 경주)이 같이 쓰는 배팅 규칙

import { BLOCK_INTERVAL_MS } from "@/lib/api";

/**
 * 라운드 규칙: 지금 블록이 N 이면 N+2 블록에 건다.
 * N+1 이 나오는 순간 N+2 배팅은 마감(locked)되고 N+3 배팅이 열린다.
 * 블록이 퍼지는 사이에 결과를 먼저 알고 거는 걸 막기 위해 한 블록 여유를 둔다.
 */
export const BET_AHEAD = 2;

/** 블록이 나오고 9초 동안만 배팅할 수 있고, 다음 블록 전 마지막 3초는 마감 */
export const BET_OPEN_MS = BLOCK_INTERVAL_MS - 3_000;

/** 고를 수 있는 배팅 금액(코인) */
export const BET_AMOUNTS = [10, 50, 100];

/** 배팅 기록 카드에 보여줄 줄 수 (결과 기다리는 줄 포함) */
export const MY_BETS_SHOWN = 5;

/** 배팅 기록을 이 화면에 남겨 두는 최대 개수 */
export const MY_BETS_SIZE = 50;

/** 라운드가 끝난 뒤 다음 선택을 어떻게 할지. manual(기본): 비움, fixed: 같은 선택 유지, random: 무작위로 자동 선택 */
export type PickMode = "manual" | "fixed" | "random";
