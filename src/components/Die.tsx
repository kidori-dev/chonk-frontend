// 주사위 한 면. 다른 그림처럼 갈색 외곽선 + 크림색 면, 눈은 갈색이고 1 은 크고 주황색

const LINE = "#5b2e14";

/** 면마다 눈의 위치 (64x64 기준) */
const PIPS: Record<number, [number, number][]> = {
  1: [[32, 32]],
  2: [[20, 20], [44, 44]],
  3: [[19, 19], [32, 32], [45, 45]],
  4: [[20, 20], [44, 20], [20, 44], [44, 44]],
  5: [[19, 19], [45, 19], [32, 32], [19, 45], [45, 45]],
  6: [[20, 18], [44, 18], [20, 32], [44, 32], [20, 46], [44, 46]],
};

export default function Die({ value, className }: { value: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className}>
      {/* 아래쪽 두께 */}
      <rect x="5" y="8" width="54" height="53" rx="12" fill="#e8d3bd" stroke={LINE} strokeWidth={2.5} />
      <rect x="5" y="4" width="54" height="53" rx="12" fill="#fffaf3" stroke={LINE} strokeWidth={2.5} />
      {/* 왼쪽 위 광택 */}
      <path d="M14 12h12" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
      <g transform="translate(0 -2)">
        {PIPS[value]?.map(([x, y], i) =>
          value === 1 ? (
            <circle key={i} cx={x} cy={y} r={8} fill="#e9823a" stroke={LINE} strokeWidth={1.5} />
          ) : (
            <circle key={i} cx={x} cy={y} r={5} fill={LINE} />
          ),
        )}
      </g>
    </svg>
  );
}
