// 이더리움 블록 사다리. 블록 해시로 사다리 가로줄과 당첨 칸을 정한다.
// 백엔드 chonk-backend/src/modules/games/rules.ts 의 ladderWinner 와 같은 규칙이어야 한다
//
// - 당첨 출발 칸 = 해시 마지막 글자 / 4 (0~3 = 1번, 4~7 = 2번, 8~b = 3번, c~f = 4번. 각 1/4)
// - 사다리 그림은 연출: 세로줄 4개, 가로줄 10단. 해시(0x 뒤) 앞에서부터 i 번째 글자의 비트로 i 단의 가로줄을 정한다
//   bit0 = 1·2 사이, bit1 = 2·3 사이, bit2 = 3·4 사이. 붙어 있는 두 가로줄이 동시에 생기면 오른쪽 것을 뺀다
// - 당첨 칸 = 당첨 출발 칸이 내려가 닿는 칸 (그래서 그림과 결과가 항상 맞는다)

export const LADDER_COLS = 4;
export const LADDER_ROWS = 10;

export type Ladder = {
  /** rungs[r][g] = r 단에 g 번째 사이(g·g+1)에 가로줄이 있는지 */
  rungs: boolean[][];
  /** 당첨 도착 칸 (0~3) */
  prize: number;
  /** 출발 칸별 도착 칸 */
  ends: number[];
  /** 당첨되는 출발 칸 */
  winner: number;
};

export function ladderOf(hash: string): Ladder {
  const hex = hash.slice(2);
  const rungs = Array.from({ length: LADDER_ROWS }, (_, r) => {
    const v = parseInt(hex[r], 16);
    const row = [0, 1, 2].map((g) => ((v >> g) & 1) === 1);
    for (let g = 1; g < row.length; g++) if (row[g] && row[g - 1]) row[g] = false;
    return row;
  });
  const winner = Math.floor(parseInt(hex[hex.length - 1], 16) / 4);
  const ends = Array.from({ length: LADDER_COLS }, (_, start) => walk(rungs, start));
  return { rungs, prize: ends[winner], ends, winner };
}

/** 출발 칸에서 사다리를 타고 내려가 도착 칸을 돌려준다 */
function walk(rungs: boolean[][], start: number): number {
  let col = start;
  for (const row of rungs) {
    if (col > 0 && row[col - 1]) col--;
    else if (col < LADDER_COLS - 1 && row[col]) col++;
  }
  return col;
}

/** 출발 칸에서 내려가는 길의 꺾이는 점들 (그리기용). x = 칸 번호, y = 단 번호(-1 = 맨 위, ROWS = 맨 아래) */
export function pathOf(rungs: boolean[][], start: number): { col: number; row: number }[] {
  let col = start;
  const points = [{ col, row: -1 }];
  rungs.forEach((row, r) => {
    const next = col > 0 && row[col - 1] ? col - 1 : col < LADDER_COLS - 1 && row[col] ? col + 1 : col;
    if (next !== col) {
      points.push({ col, row: r }, { col: next, row: r });
      col = next;
    }
  });
  points.push({ col, row: LADDER_ROWS });
  return points;
}
