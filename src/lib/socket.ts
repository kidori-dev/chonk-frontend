"use client";

import { io, type Socket } from "socket.io-client";

import type { Block, GameId, Round } from "@/lib/api";

// 게임 화면 실시간 데이터 (백엔드 Socket.IO).
// /api/* 는 Next rewrites 로 넘기지만 Vercel rewrites 는 웹소켓을 못 넘겨서, 소켓만 백엔드 주소로 직접 붙는다.
// 백엔드 SOCKET_CORS_ORIGINS 에 이 프론트 주소가 있어야 한다

/** 백엔드 주소 (빌드할 때 들어간다) */
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3000";

/** 'blocks' 이벤트: 접속하면 한 번, 이후 새 블록이 저장될 때마다 */
export type BlocksEvent = {
  serverTime: number;
  /** 최신이 앞 */
  blocks: Block[];
  /** 지금 배팅할 수 있는 라운드 (판정 블록 번호, 마감 시각 ms) */
  round: { targetBlockNumber: number; closesAt: number } | null;
};

type RoundsEvent = { game: GameId; rounds: Round[] };

let socket: Socket | null = null;
// 마지막으로 받은 blocks 이벤트. 다른 게임 화면으로 옮겨 가도 다음 블록을 기다리지 않고 바로 보여준다
let lastBlocks: BlocksEvent | null = null;

// 서버 시각 - 브라우저 시각. 배팅 마감은 서버 시각 기준이라 남은 시간도 서버 시각으로 계산한다
let clockOffset = 0;

/** 서버 기준 지금 시각(ms) */
export function serverNow(): number {
  return Date.now() + clockOffset;
}

/** 화면 전체가 소켓 하나를 같이 쓴다 */
function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socket.on("blocks", (event: BlocksEvent) => {
      clockOffset = event.serverTime - Date.now();
      lastBlocks = event;
    });
  }
  return socket;
}

/** 새 블록이 오면 onBlocks 를 부른다 (접속하자마자 한 번 온다). 반환값을 부르면 구독 해제 */
export function subscribeBlocks(onBlocks: (event: BlocksEvent) => void): () => void {
  const s = getSocket();
  const handler = (event: BlocksEvent) => {
    if (event.blocks.length > 0) onBlocks(event);
  };
  s.on("blocks", handler);
  // 이미 받아 둔 블록이 있으면 바로 보여준다 (서버는 접속할 때만 보내 준다)
  if (lastBlocks) handler(lastBlocks);
  return () => {
    s.off("blocks", handler);
  };
}

/**
 * 블록 게임 하나의 라운드 결과를 받는다.
 * onInit: 구독할 때(그리고 다시 접속할 때) 최근 라운드 목록, onNew: 새로 확정된 라운드 (둘 다 최신이 앞)
 */
export function subscribeRounds(
  game: GameId,
  onInit: (rounds: Round[]) => void,
  onNew: (rounds: Round[]) => void,
): () => void {
  const s = getSocket();
  const subscribe = () => {
    s.timeout(5000)
      .emitWithAck("rounds:subscribe", game)
      .then((res: RoundsEvent) => onInit(res.rounds))
      .catch(() => {});
  };
  const handler = (event: RoundsEvent) => {
    if (event.game === game) onNew(event.rounds);
  };
  s.on("rounds", handler);
  // 다시 접속하면 방(room)이 없어지니 다시 구독한다
  s.on("connect", subscribe);
  if (s.connected) subscribe();
  return () => {
    s.off("rounds", handler);
    s.off("connect", subscribe);
  };
}
