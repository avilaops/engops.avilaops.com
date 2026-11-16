import type { ModuloEngOps } from "@prisma/client";
import { definirModuloAction } from "@/app/acoes/modulos";
import { MODULOS } from "@/dominio/modulos";

export default function ModulosEmpresaForm({ empresaId, ativos }: { empresaId: string; ativos: ModuloEngOps[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {MODULOS.map((item) => {
        const ativo = ativos.includes(item.chave);
        return (
          <form action={definirModuloAction} key={item.chave}>
            <input type="hidden" name="empresaId" value={empresaId} />
            <input type="hidden" name="modulo" value={item.chave} />
            <input type="hidden" name="ativo" value={String(!ativo)} />
            <button type="submit" className={ativo ? "button button-secondary" : "button button-ghost"}>
              {item.nome} • {ativo ? "ativo" : "inativo"}
            </button>
          </form>
        );
      })}
    </div>
  );
}
