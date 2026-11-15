import { consultarGov } from "../src/integracoes/gov";

async function verificar() {
for (const filtros of [
  { fonte: "abertas", fim: "2026-12-31" },
  { fonte: "publicacoes", inicio: "2026-11-01", fim: "2026-11-15", modalidade: 6 },
  { fonte: "planejamento", inicio: "2026-11-14", fim: "2026-11-15" },
  { fonte: "compras", inicio: "2026-11-01", fim: "2026-11-15" },
  { fonte: "pregoes", inicio: "2022-01-01", fim: "2022-12-31" },
].filter(f => !process.argv[2] || process.argv[2] === f.fonte)) {
  const r = await consultarGov(filtros, process.env.GOV_TAMANHO_PAGINA ? { tamanhoPagina: Number(process.env.GOV_TAMANHO_PAGINA) } : {});
  if (!r.itens.length) throw new Error(`${filtros.fonte}: sem amostra para validar`);
  console.log(JSON.stringify({ fonte: filtros.fonte, total: r.total, paginas: r.paginas, itensRecebidos: r.itens.length, primeiroId: r.itens[0].id, valorPresente: r.itens[0].valor !== null, consultadoEm: r.consultadoEm }));
}
}
verificar().catch(e => { console.error(e.message); process.exitCode = 1; });
