/**
 * ReserveCTA.tsx — the commission gate.
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
      <div className="rounded-2xl border border-accentOlive/50 bg-accentOlive/10 p-4 text-sm text-inkBlack">
        <span className="font-medium">Reserved.</span> We'll be in touch to arrange a site visit
        and confirm the quote.
        <div className="mt-1 text-[11px] text-inkBlack/45">
          This reserves your interest for our records. No backend is connected in this demo yet, so
          nothing has actually been sent.
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
        className="w-full rounded-full border border-line bg-white/70 px-4 py-3 text-sm text-inkBlack placeholder:text-inkBlack/45 focus:border-accentOlive focus:outline-none"
      />
      <button
        type="submit"
        className="w-full rounded-full bg-inkBlack px-4 py-3 text-sm font-medium text-paperVellum ring-2 ring-transparent transition hover:ring-accentOlive/60"
      >
        Reserve this Eden · {gbp(price)}
      </button>
      <p className="text-center text-[11px] text-inkBlack/45">
        Reserves a slot for a site visit. No payment taken.
      </p>
    </form>
  );
}
