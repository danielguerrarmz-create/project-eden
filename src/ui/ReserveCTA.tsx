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
  const price = useDesign((s) => s.outputs.price.fixedTotalGBP);

  if (reserved) {
    return (
      <div className="rounded-lg border border-accentOlive/40 bg-accentOlive/10 p-4 text-[13px] leading-relaxed text-inkBlack">
        <span className="font-medium">Held.</span> We will be in touch to arrange a site visit and
        confirm the quote against your garden.
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
        className="w-full rounded-lg border border-inkBlack/25 bg-white/60 px-4 py-3 font-mono text-[13px] text-inkBlack outline-none transition placeholder:text-inkBlack/35 focus:border-inkBlack"
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-inkBlack px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-paperVellum transition-colors hover:bg-accentOlive hover:text-inkBlack"
      >
        Hold this design · {gbp(price)}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-inkBlack/45">
        Starts a conversation and a site visit. No payment taken.
      </p>
    </form>
  );
}
