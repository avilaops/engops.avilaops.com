"use client";

import { useActionState, useState } from "react";
import type { Documento } from "@prisma/client";
import { conferirDocumentoAction, enviarDocumentoAction, removerDocumentoAction, type EstadoAcao } from "@/app/acoes/demandas";
import { Icone } from "@/components/ui/Icones";
import Sheet from "@/components/ui/Sheet";
import { Toast, useAcao } from "@/components/useAcao";
import { CAMPOS_CONFERIVEIS, CATEGORIAS, rotuloDoTipo, sugerirTipo, TIPOS_DOCUMENTO } from "@/dominio/documentos";
import { bytes, dataHora } from "@/lib/formatos";

type Props = { demandaId: string; documentos: Documento[]; podeEnviar: boolean; podeRemover: boolean };

export default function PainelDocumentos({ demandaId, documentos, podeEnviar, podeRemover }: Props) {
  const [enviar, setEnviar] = useState(false);
  const [conferir, setConferir] = useState<Documento | null>(null);
  const { executar, pendente, toast } = useAcao();

  return (
    <section className="panel" id="documentos">
      <div className="panel-title">
        <h2>Dossiê</h2>
        <span style={{ display: "flex", gap: 8 }}>
          <span className="subtle">{documentos.length} arquivo(s)</span>
          {podeEnviar ? <button type="button" className="row-action" onClick={() => setEnviar(true)}>+ Enviar</button> : null}
        </span>
      </div>
      {!documentos.length ? <p className="muted">Nenhum documento ainda. Comece pela Ordem de Serviço e pela matrícula.</p> : null}
      {CATEGORIAS.map((c) => {
        const docs = documentos.filter((d) => d.categoria === c.chave);
        if (!docs.length) return null;
        return (
          <div className="check-group" key={c.chave}>
            <h3>{c.pasta}</h3>
            {docs.map((d) => (
              <div className="doc-row" key={d.id}>
                <Icone nome="documento" tamanho={20} className="muted" />
                <div className="nome">
                  <strong title={d.nomeOriginal}>{d.nomeArquivo}</strong>
                  <small>{rotuloDoTipo(d.tipo)} · v{d.versao} · {bytes(d.tamanho)} · {dataHora(d.criadoEm)} · {d.enviadoPor.split("@")[0]}{d.dados ? " · conferido" : ""}</small>
                </div>
                <div className="acoes">
                  <a href={`/api/documentos/${d.id}/arquivo`} target="_blank" rel="noreferrer" className="row-action">Abrir</a>
                  {podeEnviar ? <button type="button" className="row-action" onClick={() => setConferir(d)}>{d.dados ? "Conferência" : "Conferir"}</button> : null}
                  {podeRemover ? <button type="button" className="row-action" disabled={pendente} onClick={() => { if (confirm(`Remover ${d.nomeArquivo}? Fica na auditoria.`)) executar(() => removerDocumentoAction(d.id, demandaId)); }}>Remover</button> : null}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <Toast estado={toast} />
      {enviar ? <FolhaEnvio demandaId={demandaId} aoFechar={() => setEnviar(false)} /> : null}
      {conferir ? <FolhaConferencia demandaId={demandaId} doc={conferir} aoFechar={() => setConferir(null)} /> : null}
    </section>
  );
}

function FolhaEnvio({ demandaId, aoFechar }: { demandaId: string; aoFechar: () => void }) {
  const acao = enviarDocumentoAction.bind(null, demandaId);
  const [estado, agir, enviando] = useActionState(acao, {} as EstadoAcao);
  const [tipo, setTipo] = useState("");
  const [nomes, setNomes] = useState<string[]>([]);

  function aoEscolher(lista: FileList | null) {
    const arr = Array.from(lista ?? []);
    setNomes(arr.map((f) => f.name));
    if (!tipo && arr[0]) setTipo(sugerirTipo(arr[0].name) ?? "");
  }

  return (
    <Sheet titulo="Enviar documento" aoFechar={aoFechar}>
      <form action={agir} className="form">
        <label className="dropzone">
          <input type="file" name="arquivo" multiple accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.zip,.xlsx,.docx,.doc,.xls" style={{ display: "none" }} onChange={(e) => aoEscolher(e.target.files)} />
          {nomes.length ? nomes.join(", ") : "Toque para escolher arquivos (PDF, foto, ZIP). Até 40 MB cada."}
        </label>
        <label className="field">
          <span>Tipo do documento{tipo && nomes.length ? " (sugerido pelo nome)" : ""}</span>
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
            <option value="">Escolha...</option>
            {TIPOS_DOCUMENTO.map((t) => <option key={t.tipo} value={t.tipo}>{t.rotulo}</option>)}
          </select>
        </label>
        <p className="subtle">O arquivo é renomeado no padrão do dossiê, ganha hash e versão. Mesmo conteúdo enviado duas vezes não duplica.</p>
        {estado.erro ? <p className="form-error">{estado.erro}</p> : null}
        {estado.ok ? <p className="form-ok" style={{ whiteSpace: "pre-wrap" }}>{estado.ok}</p> : null}
        <button type="submit" className="primary-button" disabled={enviando || !nomes.length}>{enviando ? "Enviando..." : "Enviar"}</button>
      </form>
    </Sheet>
  );
}

function FolhaConferencia({ demandaId, doc, aoFechar }: { demandaId: string; doc: Documento; aoFechar: () => void }) {
  const acao = conferirDocumentoAction.bind(null, doc.id, demandaId);
  const [estado, agir, enviando] = useActionState(acao, {} as EstadoAcao);
  const [tipo, setTipo] = useState(doc.tipo);
  const dados = (doc.dados as Record<string, string> | null) ?? {};
  const campos = CAMPOS_CONFERIVEIS.filter((c) => c.tipos.includes(tipo));
  return (
    <Sheet titulo={`Conferir ${doc.nomeArquivo}`} aoFechar={aoFechar}>
      <form action={agir} className="form">
        <p className="muted">Abra o arquivo e registre o que está escrito nele. O validador cruzado compara com o cadastro e aponta divergência antes da automação.</p>
        <a href={`/api/documentos/${doc.id}/arquivo`} target="_blank" rel="noreferrer" className="secondary-button">Abrir arquivo</a>
        <label className="field"><span>Tipo</span>
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS_DOCUMENTO.map((t) => <option key={t.tipo} value={t.tipo}>{t.rotulo}</option>)}</select>
        </label>
        {campos.map((c) => (
          <label className="field" key={c.chave}><span>{c.rotulo}</span><input name={`dado.${c.chave}`} defaultValue={dados[c.chave] ?? ""} placeholder="como está no documento" /></label>
        ))}
        {!campos.length ? <p className="subtle">Este tipo não tem campos de conferência cruzada.</p> : null}
        {estado.erro ? <p className="form-error">{estado.erro}</p> : null}
        {estado.ok ? <p className="form-ok">{estado.ok}</p> : null}
        <button type="submit" className="primary-button" disabled={enviando}>{enviando ? "Salvando..." : "Registrar conferência"}</button>
      </form>
    </Sheet>
  );
}
