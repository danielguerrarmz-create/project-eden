/**
 * ReserveCTA.tsx — the commission gate (paper theme).
 * Email capture for reserve / request-a-call intent. MVP has NO backend: submit
 * logs the captured commission summary to the console + local state only.
 */
import { useDesign } from '../state/store';

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

export function ReserveCTA() {
  const email = useDesign((s) => s.reserveEmail);
  const reserved = useDesign((s) => s.reserved);
  const setEmail = useDesign((s) => s.setReserveEmail);
  const submit = useDesign((s) => s.submitReserve);
  const price = useDesign((s) => s.outputs.price.incVatGBP);

  if (reserved) {
    return (
      <div className="rounded-2xl border border-moss/50 bg-moss/12 p-4 text-sm text-ink">
        <span className="font-medium">Reserved.</span> We'll be in touch to arrange a site visit
        and confirm the quote.
        <div className="mt-1 text-[11px] text-inkFaint">
          MVP: intent logged to the console, no backend wired.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) submit();
      }}
      className="space-y-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="w-full rounded-full border border-line bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-inkFaint/70 focus:border-moss focus:outline-none"
      />
      <button
        type="submit"
        className="w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-mossDeep"
      >
        Reserve this folly · {gbp(price)}
      </button>
      <p className="text-center text-[11px] text-inkFaint">
        Reserves a slot for a site visit. No payment taken.
      </p>
    </form>
  );
}
