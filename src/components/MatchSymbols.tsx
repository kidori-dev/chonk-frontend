// 랜덤 츄르 그림 맞추기에 쓰는 그림들. 메인 캐릭터처럼 갈색 외곽선 + 단순한 색으로 그린다

export const MATCH_SYMBOLS = ["churu", "fish", "cat", "mouse", "yarn"] as const;
export type MatchSymbol = (typeof MATCH_SYMBOLS)[number];

const LINE = "#5b2e14";

export default function SymbolArt({ symbol, className }: { symbol: MatchSymbol; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke={LINE}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ART[symbol]}
    </svg>
  );
}

const ART: Record<MatchSymbol, React.ReactNode> = {
  // 츄르: 비스듬히 놓인 스틱 봉지, 라벨에 물고기
  churu: (
    <g transform="rotate(-35 32 32)">
      <rect x="22" y="4" width="20" height="56" rx="4" fill="#f08c3a" />
      <path d="M22 13h20" strokeWidth={1.8} strokeDasharray="2.5 2" />
      <rect x="25" y="24" width="14" height="20" rx="2" fill="#fff6e0" strokeWidth={1.8} />
      <path d="M27.5 34q4.5-5 9 0q-4.5 5-9 0z" fill="#f08c3a" strokeWidth={1.5} />
      <path d="M36.5 34l3-3v6z" fill="#f08c3a" strokeWidth={1.5} />
      <path d="M26 51h12" strokeWidth={1.8} />
      {/* 광택 */}
      <path d="M26 8v12" stroke="#ffd2a6" strokeWidth={2} />
    </g>
  ),

  // 생선: 통통한 몸통 + 지느러미는 몸통 뒤에 깔고, 볼터치로 귀엽게
  fish: (
    <g>
      {/* 꼬리, 등/배 지느러미 (몸통에 가려지는 부분 포함) */}
      <path d="M44 32c4-5 9-10 15-12-2 7-2 17 0 24-6-2-11-7-15-12z" fill="#5aa9dc" />
      <path d="M51 29l4-3M51 35l4 3" strokeWidth={1.4} />
      <path d="M20 22q6-12 18-5v8H20z" fill="#5aa9dc" />
      <path d="M24 43q1 9 10 7q-1-4 1-7z" fill="#5aa9dc" />
      {/* 몸통 */}
      <ellipse cx="27" cy="32" rx="21" ry="14" fill="#7cc4ef" />
      <ellipse cx="28" cy="39" rx="14" ry="4.5" fill="#d6eefc" stroke="none" />
      {/* 아가미, 비늘 */}
      <path d="M19 23q5 9 0 18" />
      <path d="M27 26q2.5 3 0 6M33 24q2.5 3 0 6M33 32q2.5 3 0 6M39 28q2.5 3 0 6" strokeWidth={1.6} />
      {/* 눈, 입, 볼 */}
      <circle cx="13" cy="29" r="3.2" fill={LINE} stroke="none" />
      <circle cx="12" cy="28" r="1.1" fill="#fff" stroke="none" />
      <path d="M7 35q2.5 1.5 4.5-.5" strokeWidth={1.8} />
      <ellipse cx="15" cy="36" rx="2.6" ry="1.7" fill="#f7a8b4" stroke="none" />
    </g>
  ),

  // 주황 고양이 얼굴 (Chonk)
  cat: (
    <g>
      <path d="M12 28L16 7l14 11z" fill="#f08c3a" />
      <path d="M52 28L48 7 34 18z" fill="#f08c3a" />
      <path d="M17 21l2-8 6 5z" fill="#f7a8b4" stroke="none" />
      <path d="M47 21l-2-8-6 5z" fill="#f7a8b4" stroke="none" />
      <ellipse cx="32" cy="37" rx="23" ry="19" fill="#f5a04f" />
      <path d="M28 19l1 6M32 18v7M36 19l-1 6" stroke="#d9722a" strokeWidth={2.2} />
      <ellipse cx="32" cy="44" rx="9.5" ry="6.5" fill="#fde6c8" strokeWidth={1.8} />
      <ellipse cx="23.5" cy="35" rx="2.8" ry="3.6" fill={LINE} stroke="none" />
      <ellipse cx="40.5" cy="35" rx="2.8" ry="3.6" fill={LINE} stroke="none" />
      <circle cx="22.6" cy="33.6" r="1.1" fill="#fff" stroke="none" />
      <circle cx="39.6" cy="33.6" r="1.1" fill="#fff" stroke="none" />
      <path d="M30 41h4l-2 2.4z" fill="#f47c8a" strokeWidth={1.5} />
      <path d="M32 43.4q-1.5 3.5-4.5 2M32 43.4q1.5 3.5 4.5 2" strokeWidth={1.8} />
      <ellipse cx="17.5" cy="42" rx="3" ry="2" fill="#f7a8b4" stroke="none" />
      <ellipse cx="46.5" cy="42" rx="3" ry="2" fill="#f7a8b4" stroke="none" />
      <path d="M4 38l9 2M4 44l9-1M60 38l-9 2M60 44l-9-1" strokeWidth={1.6} />
    </g>
  ),

  // 흰 쥐 (메인 캐릭터 옆의 쥐)
  mouse: (
    <g>
      <circle cx="16" cy="20" r="10" fill="#f6f3f1" />
      <circle cx="48" cy="20" r="10" fill="#f6f3f1" />
      <circle cx="16" cy="20" r="5.5" fill="#f7b6c2" stroke="none" />
      <circle cx="48" cy="20" r="5.5" fill="#f7b6c2" stroke="none" />
      <ellipse cx="32" cy="38" rx="19" ry="17" fill="#f6f3f1" />
      <circle cx="25" cy="36" r="2.4" fill={LINE} stroke="none" />
      <circle cx="39" cy="36" r="2.4" fill={LINE} stroke="none" />
      <circle cx="24.3" cy="35.2" r="0.9" fill="#fff" stroke="none" />
      <circle cx="38.3" cy="35.2" r="0.9" fill="#fff" stroke="none" />
      <circle cx="32" cy="42" r="2.6" fill="#f47c8a" strokeWidth={1.5} />
      <path d="M32 44.6v2.4M29 49q3 2 6 0" strokeWidth={1.6} />
      <ellipse cx="20" cy="43" rx="2.6" ry="1.7" fill="#f7b6c2" stroke="none" />
      <ellipse cx="44" cy="43" rx="2.6" ry="1.7" fill="#f7b6c2" stroke="none" />
      <path d="M8 40l10 1M9 46l9-2M56 40l-10 1M55 46l-9-2" strokeWidth={1.4} />
    </g>
  ),

  // 털실 뭉치
  yarn: (
    <g>
      <path d="M46 48q8 6 6 11t8 1" strokeWidth={2.2} stroke="#c8587f" />
      <circle cx="31" cy="33" r="21" fill="#ef8fb0" />
      <path d="M13 25q18 6 34-10" stroke="#c8587f" strokeWidth={2} />
      <path d="M10.5 35q20 6 39-14" stroke="#c8587f" strokeWidth={2} />
      <path d="M15 46q20 2 34-20" stroke="#c8587f" strokeWidth={2} />
      <path d="M24 13q16 14 6 41" stroke="#c8587f" strokeWidth={2} />
      <path d="M36 13q10 18 14 30" stroke="#c8587f" strokeWidth={2} />
      <circle cx="31" cy="33" r="21" />
      <path d="M17 20q4-5 10-7" stroke="#fbd0df" strokeWidth={2.5} />
    </g>
  ),
};
