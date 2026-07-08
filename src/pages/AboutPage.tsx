/**
 * AboutPage.tsx — placeholder for the company story (#/about). Deliberately empty
 * for now: the global nav links here, and this holds the frame so the route never
 * dead-ends. Copy to come.
 */
import { SplashHeader } from './splash/SplashHeader';

export function AboutPage() {
  return (
    <div className="min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader />
      <div className="mx-auto flex min-h-screen max-w-[880px] flex-col justify-center px-6 md:px-10">
        <h1 className="font-serifDisplay text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.01em]">
          About
        </h1>
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/50">
          Coming soon
        </p>
      </div>
    </div>
  );
}
