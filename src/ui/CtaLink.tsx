/**
 * CtaLink.tsx — the forward action: a confident text label with an arrow that
 * slides on hover. Two weights: 'solid' (the primary advance, an ink pill) and
 * 'ghost' (a quiet underline link). The one accent is olive, used as a hover
 * ring/underline only, never as a fill swap (a fill change would read as the
 * "recommended" pill signal, the wrong message for a plain forward action).
 */
interface Props {
  label: string;
  onClick: () => void;
  variant?: 'solid' | 'ghost';
  back?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function CtaLink({ label, onClick, variant = 'solid', back = false, disabled, type = 'button' }: Props) {
  if (variant === 'ghost') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="group inline-flex items-center gap-2 text-sm font-medium text-inkBlack/70 hover:text-inkBlack disabled:opacity-40 transition"
      >
        {back && <span className="transition-transform group-hover:-translate-x-1">&larr;</span>}
        <span className="border-b border-transparent group-hover:border-accentOlive/60 pb-0.5">{label}</span>
        {!back && <span className="transition-transform group-hover:translate-x-1">&rarr;</span>}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-2.5 rounded-full bg-inkBlack px-6 py-3 text-[15px] font-medium text-paperVellum ring-2 ring-transparent hover:ring-accentOlive/60 disabled:opacity-40 disabled:hover:ring-transparent transition shadow-sm"
    >
      <span>{label}</span>
      <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
    </button>
  );
}
