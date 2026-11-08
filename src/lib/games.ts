import type { GameId } from "@/lib/api";

// 게임 이름·주소·고른 값 이름. 여러 게임을 한곳에서 보여주는 '내 배팅' 패널이 쓴다

type GameInfo = { title: string; href: string; picks?: Record<string, string> };

const CAT_NAMES = { orange: "치즈", black: "까망", calico: "삼색이", white: "하양" };

export const GAME_INFO: Record<GameId, GameInfo> = {
  coin: { title: "동전 던지기", href: "/games/eth-hash", picks: { odd: "앞면", even: "뒷면" } },
  "cat-race": { title: "고양이 경주", href: "/games/cat-race", picks: CAT_NAMES },
  "block-match": { title: "블록 그림 맞추기", href: "/games/block-match" },
  dice: { title: "주사위", href: "/games/dice", picks: { low: "소", seven: "럭키 7", high: "대" } },
  // 사다리 pick 은 출발 칸 번호 (0~3 = 치즈, 까망, 삼색이, 하양)
  ladder: { title: "사다리", href: "/games/ladder", picks: { "0": "치즈", "1": "까망", "2": "삼색이", "3": "하양" } },
  lottery: { title: "제비뽑기", href: "/games/lottery" },
  "churu-match": { title: "츄르 그림 맞추기", href: "/games/churu-match" },
};

/** 서버 결과 값(bet.result)을 짧게. 그림 게임은 길어서 비운다 */
export function resultLabel(game: GameId, result: string | null): string {
  if (!result) return "";
  switch (game) {
    case "coin":
    case "lottery":
      return result; // 해시 마지막 글자
    case "dice":
      return result === "void" ? "무효" : `합 ${result.split(",").reduce((s, d) => s + Number(d), 0)}`;
    case "block-match":
    case "churu-match":
      return "";
    default:
      return pickLabel(game, result);
  }
}

/** 서버 pick 값을 화면에 보여줄 이름으로 */
export function pickLabel(game: GameId, pick: string | null): string {
  if (pick === null) return "";
  if (game === "lottery") return `제비 ${pick}`;
  return GAME_INFO[game].picks?.[pick] ?? pick;
}
