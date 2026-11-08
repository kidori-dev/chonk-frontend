import { isValidBet } from "@/lib/betting";

/** 배팅 금액 직접 입력 (1 이상 정수). times 는 맞혔을 때 돌려받는 배수, timesLabel 은 그 앞에 붙는 말 */
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
        {isValidBet(amount) && (
          <span>
            {timesLabel} <b className="text-primary">x{times}</b> ({(amount * times).toLocaleString()} 코인)
          </span>
        )}
      </div>
      <BetAmountInput amount={amount} disabled={disabled} onChange={onChange} />
    </div>
  );
}

/** 숫자만 받는 금액 입력칸. 비우면 0 으로 넘긴다 (배팅 버튼에서 막힘) */
export function BetAmountInput({
  amount,
  disabled,
  onChange,
}: {
  amount: number;
  disabled: boolean;
  onChange: (amount: number) => void;
}) {
  return (
    <label
      className={`flex items-center rounded-md border-2 bg-white px-3 focus-within:border-primary ${
        isValidBet(amount) ? "border-primary/30" : "border-red-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <input
        type="text"
        inputMode="numeric"
        value={amount ? String(amount) : ""}
        placeholder="얼마 걸까요?"
        disabled={disabled}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
          onChange(digits ? Number(digits) : 0);
        }}
        className="min-w-0 flex-1 bg-transparent py-2 text-right text-sm font-bold text-primary outline-none disabled:cursor-not-allowed"
      />
      <span className="ml-1.5 shrink-0 text-sm text-foreground/50">코인</span>
    </label>
  );
}
