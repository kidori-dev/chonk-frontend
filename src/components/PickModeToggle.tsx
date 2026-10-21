import type { PickMode } from "@/lib/betting";

/** 켜고 끄는 자동 배팅 버튼. 둘 다 꺼져 있으면 매번 직접 고른다(manual) */
const PICK_MODES: { mode: PickMode; label: string }[] = [
  { mode: "random", label: "🎲 랜덤 자동배팅" },
  { mode: "fixed", label: "📌 고정 배팅" },
];

export default function PickModeToggle({ mode, onChange }: { mode: PickMode; onChange: (mode: PickMode) => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-foreground/5 p-1 text-xs font-semibold">
      {PICK_MODES.map(({ mode: m, label }) => (
        <button
          key={m}
          onClick={() => onChange(mode === m ? "manual" : m)} // 켜져 있으면 끈다
          className={`rounded-md py-2 transition ${
            mode === m ? "bg-white text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
