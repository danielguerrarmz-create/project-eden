/**
 * RegisterInterest.tsx — the splash's one email capture (spec §5). Top-of-funnel
 * and design-agnostic, so it deliberately does NOT reuse the store's
 * commission-coupled submitReserve() slice; it keeps its own local state and the
 * same honesty posture the rest of the MVP holds: real as a shape, logged to
 * console, not yet wired to a backend, and it says so.
 *
 * Visuals stay in the hairline drafting register (1px border, no rounded pill,
 * thin-bordered submit) so this page keeps exactly one filled action, the hero
 * and close engine CTA.
 */
import { useState, type FormEvent } from 'react';

export function RegisterInterest() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    // MVP: no backend. Capture the intent to console + local state only.
    // eslint-disable-next-line no-console
    console.log('[REGISTER] interest captured', { email: email.trim(), source: 'splash' });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <p className="mt-8 font-mono text-[13px] tracking-[0.02em] opacity-80">
        Noted. We will be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-70">
          register interest
        </span>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full min-w-[16rem] border border-inkBlack/50 bg-transparent px-3 py-2 font-mono text-[13px] text-inkBlack outline-none transition focus:border-inkBlack placeholder:opacity-40 sm:w-[22rem]"
        />
      </label>
      <button
        type="submit"
        className="border border-inkBlack/60 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack transition hover:border-inkBlack hover:bg-inkBlack/5 focus-visible:border-inkBlack"
      >
        submit
      </button>
    </form>
  );
}
