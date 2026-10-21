import { BET_AMOUNTS } from "@/lib/betting";

/** 배팅 금액 고르기 (10 / 50 / 100 코인). times 는 맞혔을 때 돌려받는 배수, timesLabel 은 그 앞에 붙는 말 */
export default function BetAmountPicker({
  amount,
  times,
  timesLabel = "맞히면",
  disabled,
  onChange,
}: {
  amount: number;
  times: number;
  timesLabel?: string;
  disabled: boolean;
  onChange: (amount: number) => void;
}) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-xs text-foreground/50">
        <span>배팅 금액</span>
        <span>
          {timesLabel} <b className="text-primary">x{times}</b> ({(amount * times).toLocaleString()} 코인)
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BET_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => onChange(a)}
            disabled={disabled}
            className={`rounded-md py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              amount === a ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {a} 코인
          </button>
        ))}
      </div>
    </div>
  );
}
