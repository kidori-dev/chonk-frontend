// 고양이 경주에 나오는 고양이 4마리 얼굴. 메인 캐릭터처럼 갈색 외곽선 + 단순한 색

export type CatKind = "orange" | "black" | "calico" | "white";

const LINE = "#5b2e14";

const LOOK: Record<CatKind, { fur: string; ear: string; eye: string; muzzle: string }> = {
  orange: { fur: "#f5a04f", ear: "#f08c3a", eye: LINE, muzzle: "#fde6c8" },
  black: { fur: "#3d3434", ear: "#2b2424", eye: "#f6d04d", muzzle: "#5a4f4f" },
  calico: { fur: "#fbf6ef", ear: "#fbf6ef", eye: LINE, muzzle: "#ffffff" },
  white: { fur: "#f6f3f1", ear: "#f6f3f1", eye: "#6fb6e8", muzzle: "#ffffff" },
};

export default function CatHead({ cat, className }: { cat: CatKind; className?: string }) {
  const c = LOOK[cat];
  const line = cat === "black" ? "#1d1717" : LINE;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke={line}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 귀 */}
      <path d="M12 28L16 7l14 11z" fill={cat === "calico" ? "#f08c3a" : c.ear} />
      <path d="M52 28L48 7 34 18z" fill={cat === "calico" ? "#3d3434" : c.ear} />
      <path d="M17 21l2-8 6 5zM47 21l-2-8-6 5z" fill="#f7a8b4" stroke="none" />
      {/* 얼굴 */}
      <ellipse cx="32" cy="37" rx="23" ry="19" fill={c.fur} />
      {cat === "orange" && <path d="M28 19l1 6M32 18v7M36 19l-1 6" stroke="#d9722a" strokeWidth={2.2} />}
      {/* 삼색이 얼룩 */}
      {cat === "calico" && (
        <>
          <path d="M11 33c2-10 9-15 17-15 1 6-3 11-9 13-3 1-5 2-8 2z" fill="#f08c3a" stroke="none" />
          <path d="M53 33c-2-10-9-15-17-15-1 5 2 9 7 11 4 2 7 3 10 4z" fill="#3d3434" stroke="none" />
          <ellipse cx="32" cy="37" rx="23" ry="19" />
        </>
      )}
      <ellipse cx="32" cy="44" rx="9.5" ry="6.5" fill={c.muzzle} strokeWidth={1.8} />
      {/* 눈 */}
      <ellipse cx="23.5" cy="35" rx="3" ry="3.8" fill={c.eye} stroke={cat === "black" ? "#1d1717" : "none"} strokeWidth={1.2} />
      <ellipse cx="40.5" cy="35" rx="3" ry="3.8" fill={c.eye} stroke={cat === "black" ? "#1d1717" : "none"} strokeWidth={1.2} />
      {cat !== "orange" && cat !== "calico" && (
        <path d="M23.5 32.5v5M40.5 32.5v5" stroke="#1d1717" strokeWidth={1.6} />
      )}
      <circle cx="22.4" cy="33.6" r="1.1" fill="#fff" stroke="none" />
      <circle cx="39.4" cy="33.6" r="1.1" fill="#fff" stroke="none" />
      {/* 코, 입 */}
      <path d="M30 41h4l-2 2.4z" fill="#f47c8a" strokeWidth={1.5} />
      <path d="M32 43.4q-1.5 3.5-4.5 2M32 43.4q1.5 3.5 4.5 2" strokeWidth={1.8} />
      {/* 볼, 수염 */}
      <ellipse cx="17.5" cy="42" rx="3" ry="2" fill="#f7a8b4" stroke="none" opacity={cat === "black" ? 0.6 : 1} />
      <ellipse cx="46.5" cy="42" rx="3" ry="2" fill="#f7a8b4" stroke="none" opacity={cat === "black" ? 0.6 : 1} />
      <path d="M4 38l9 2M4 44l9-1M60 38l-9 2M60 44l-9-1" strokeWidth={1.6} />
    </svg>
  );
}
