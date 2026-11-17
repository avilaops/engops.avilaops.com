const TITULOS = [
  "Disposições Gerais e Gerenciamento de Riscos Ocupacionais",
  "Inspeção Prévia • revogada",
  "Embargo e Interdição",
  "Serviços Especializados em Segurança e Medicina do Trabalho",
  "Comissão Interna de Prevenção de Acidentes e de Assédio",
  "Equipamento de Proteção Individual",
  "Programa de Controle Médico de Saúde Ocupacional",
  "Edificações",
  "Avaliação e Controle das Exposições Ocupacionais",
  "Segurança em Instalações e Serviços em Eletricidade",
  "Transporte, Movimentação, Armazenagem e Manuseio de Materiais",
  "Segurança no Trabalho em Máquinas e Equipamentos",
  "Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos",
  "Fornos",
  "Atividades e Operações Insalubres",
  "Atividades e Operações Perigosas",
  "Ergonomia",
  "Segurança e Saúde no Trabalho na Indústria da Construção",
  "Explosivos",
  "Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis",
  "Trabalhos a Céu Aberto",
  "Segurança e Saúde Ocupacional na Mineração",
  "Proteção Contra Incêndios",
  "Condições Sanitárias e de Conforto nos Locais de Trabalho",
  "Resíduos Industriais",
  "Sinalização de Segurança",
  "Registro Profissional do Técnico de Segurança • revogada",
  "Fiscalização e Penalidades",
  "Segurança e Saúde no Trabalho Portuário",
  "Segurança e Saúde no Trabalho Aquaviário",
  "Segurança e Saúde no Trabalho na Agricultura, Pecuária e Silvicultura",
  "Segurança e Saúde no Trabalho em Serviços de Saúde",
  "Segurança e Saúde nos Trabalhos em Espaços Confinados",
  "Condições e Meio Ambiente de Trabalho na Indústria Naval",
  "Trabalho em Altura",
  "Segurança e Saúde no Trabalho em Empresas de Abate e Processamento",
  "Segurança e Saúde em Plataformas de Petróleo",
  "Segurança e Saúde no Trabalho nas Atividades de Limpeza Urbana",
] as const;

export type ItemCatalogoNr = {
  numero: number;
  codigo: string;
  titulo: string;
  vigente: boolean;
  permiteCertificado: boolean;
  conteudoProgramatico: readonly string[];
};

export const CATALOGO_NR: readonly ItemCatalogoNr[] = TITULOS.map((titulo, indice) => {
  const numero = indice + 1;
  const vigente = numero !== 2 && numero !== 27;
  return {
    numero,
    codigo: `NR-${String(numero).padStart(2, "0")}`,
    titulo,
    vigente,
    permiteCertificado: vigente,
    conteudoProgramatico: [
      `${titulo.replace(" • revogada", "")} • fundamentos, objetivos e campo de aplicação`,
      "Identificação de perigos, responsabilidades e medidas de prevenção",
      "Procedimentos operacionais, resposta a emergências e avaliação de aprendizagem",
    ],
  };
});

export function obterNr(codigo: string): ItemCatalogoNr | undefined {
  const numero = Number(codigo.replace(/\D/g, ""));
  return CATALOGO_NR.find(item => item.numero === numero);
}
