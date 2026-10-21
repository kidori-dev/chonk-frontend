/** 츄르 (비스듬히 놓인 스틱형 간식 봉지) */
export default function ChuruIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <g transform="rotate(-35 12 12)">
        <rect x="8.5" y="1.5" width="7" height="21" rx="1.5" fill="#e9823a" stroke="#5b2e14" strokeWidth={1} />
        {/* 뜯는 선 */}
        <path d="M8.5 5.5h7" stroke="#5b2e14" strokeWidth={0.8} strokeDasharray="1 0.8" />
        {/* 라벨과 물고기 */}
        <rect x="9.3" y="9" width="5.4" height="7.5" rx="0.6" fill="#fff6e0" />
        <path d="M10.2 12.75q1.6-1.8 3.2 0q-1.6 1.8-3.2 0zM13.4 12.75l1-1v2z" fill="#e9823a" />
      </g>
    </svg>
  );
}
