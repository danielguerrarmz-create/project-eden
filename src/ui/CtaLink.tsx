/**
 * CtaLink.tsx — the Cedar-style forward action: a confident text label with an
 * arrow that slides on hover. Two weights: 'solid' (the primary advance, an ink
 * pill) and 'ghost' (a quiet underline link). No blue anywhere; accent is moss.
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
        className="group inline-flex items-center gap-2 text-sm font-medium text-inkSoft hover:text-ink disabled:opacity-40 transition"
      >
        {back && <span className="transition-transform group-hover:-translate-x-1">&larr;</span>}
        <span className="border-b border-transparent group-hover:border-ink/40 pb-0.5">{label}</span>
        {!back && <span className="transition-transform group-hover:translate-x-1">&rarr;</span>}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-paper hover:bg-mossDeep disabled:opacity-40 disabled:hover:bg-ink transition-colors shadow-sm"
    >
      <span>{label}</span>
      <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
    </button>
  );
}
