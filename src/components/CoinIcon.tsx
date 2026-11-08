/**
 * 토큰 심볼 첫 글자를 새긴 금색 동전. DORI → D, CAT → C
 */
export default function CoinIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const letter = symbol.trim().charAt(0).toUpperCase() || "?";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="shrink-0" aria-hidden>
      {/* 동전 옆면(살짝 아래로 두꺼운 느낌) */}
      <circle cx="16" cy="17" r="15" fill="#c98a1b" />
      {/* 앞면 */}
      <circle cx="16" cy="16" r="15" fill="#f6c343" />
      {/* 안쪽 테두리 */}
      <circle cx="16" cy="16" r="11.5" fill="#f9d36b" stroke="#d99a22" strokeWidth="1.5" />
      {/* 하이라이트 */}
      <path d="M7 11 A10 10 0 0 1 13 6" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill="#9a6410"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {letter}
      </text>
    </svg>
  );
}
