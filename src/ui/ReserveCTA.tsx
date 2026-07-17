/**
 * ReserveCTA.tsx — the commission gate (paper theme).
 * Email capture for reserve / request-a-call intent. MVP has NO backend: submit
 * logs the captured commission summary to the console + local state only.
 *
 * 2026-07-17 honesty pass: the button read "Hold this design · {figure}", which
 * offered to hold a price that does not exist yet (every rate behind it is a
 * placeholder until fab quotes land). It holds the DESIGN. The figure is gone
 * rather than qualified: a button is the one place a caveat cannot follow a
 * number, and nobody reads a disclaimer on the thing they are clicking.
 */
import { useDesign } from '../state/store';

export function ReserveCTA() {
  const email = useDesign((s) => s.reserveEmail);
  const reserved = useDesign((s) => s.reserved);
  const setEmail = useDesign((s) => s.setReserveEmail);
  const submit = useDesign((s) => s.submitReserve);

  if (reserved) {
    return (
      <div className="rounded-lg border border-accentOlive/40 bg-accentOlive/10 p-4 text-[13px] leading-relaxed text-inkBlack">
        <span className="font-medium">Held.</span> We will be in touch to arrange a site visit, and
        put a firm figure against your garden once it and the fabrication quote are in.
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
        Hold this design
      </button>
      <p className="text-center text-[11px] leading-relaxed text-inkBlack/45">
        Starts a conversation and a site visit, and your figure is set from that visit and the
        fabrication quote. No payment taken.
      </p>
    </form>
  );
}
