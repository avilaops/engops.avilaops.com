import type { SVGProps } from "react";

export type NomeIcone =
  | "demandas"
  | "prazos"
  | "automacoes"
  | "aprovacoes"
  | "mais"
  | "chevron"
  | "fechar"
  | "adicionar"
  | "documento"
  | "busca"
  | "check"
  | "alerta"
  | "sino"
  | "pessoas"
  | "grafico"
  | "empresa";

/* Ícones de traço no peso do SF Symbols. Sem biblioteca: são doze desenhos. */
const caminhos: Record<NomeIcone, React.ReactNode> = {
  sino: <><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4" /></>,
  pessoas: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" /></>,
  grafico: <path d="M4 3v17h17M8 16v-4M13 16V8M18 16V5" />,
  empresa: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-6h4v6" /></>,
  demandas: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" />
    </>
  ),
  prazos: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  automacoes: (
    <>
      <path d="M13 2.5 5 13.5h6l-1 8 9-11.5h-6l0-7.5Z" />
    </>
  ),
  aprovacoes: (
    <>
      <path d="M4 12.5l5 5L20 6.5" />
    </>
  ),
  mais: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      <circle cx="16" cy="12" r="0.9" fill="currentColor" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  adicionar: <path d="M12 5v14M5 12h14" />,
  documento: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
    </>
  ),
  busca: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  alerta: (
    <>
      <path d="M12 3.5 21 19.5H3z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </>
  ),
};

export function Icone({ nome, tamanho = 20, className, ...resto }: { nome: NomeIcone; tamanho?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...resto}
    >
      {caminhos[nome]}
    </svg>
  );
}
