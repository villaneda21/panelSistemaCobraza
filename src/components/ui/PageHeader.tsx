import { useEffect } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  useEffect(() => {
    document.title = `${title} · Panel gerencial`;
  }, [title]);

  return (
    <header className="mb-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">{eyebrow}</p>
      <h1 className="mt-1 text-[1.7rem] font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </header>
  );
}
