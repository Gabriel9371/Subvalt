export type TipoAssinatura = 'STREAMING' | 'SOFTWARE'
export type CicloCobranca = 'MENSAL' | 'TRIMESTRAL' | 'ANUAL'
export type TipoMidia = 'ANIME' | 'JOGO'
export type StatusMidia = 'QUERO_CONSUMIR' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'ABANDONADO'
export type StatusPagamento = 'PENDENTE' | 'PAGO' | 'ATRASADO'

export interface Assinatura {
  id: number
  tipo: TipoAssinatura
  nome: string
  valor: number
  ciclo: CicloCobranca
  proximoVencimento: string
  ativa: boolean
  imagemUrl: string | null
  custoMensal: number
  diasParaVencer: number
  vencida: boolean
  pessoasNoPlano: number | null
  percentualDesconto: number | null
}

export interface AssinaturaInput {
  tipo: TipoAssinatura
  nome: string
  valor: number
  ciclo: CicloCobranca
  proximoVencimento: string
  pessoasNoPlano?: number
  percentualDesconto?: number
}

export interface ResumoAssinaturas {
  gastoMensalTotal: number
  gastoAnualEstimado: number
  quantidadeAtivas: number
  quantidadeVencendoEm7Dias: number
  financeiro: ResumoFinanceiro
}

export interface ResumoFinanceiro {
  totalPagoMes: number
  totalPagoAno: number
  totalMesAnterior: number
  variacaoMes: number
  variacaoPercentual: number | null
  despesasPendentes: number
  quantidadePendentes: number
  despesasAtrasadas: number
  quantidadeAtrasadas: number
  previsaoProximos30Dias: number
  gastosMensais: GastoMensal[]
  gastosPorTipo: GastoPorTipo[]
  gastosPorAssinatura: GastoPorAssinatura[]
  proximasCobrancas: Pagamento[]
}

export interface GastoMensal {
  periodo: string
  totalPago: number
}

export interface GastoPorTipo {
  tipo: TipoAssinatura
  totalPago: number
}

export interface GastoPorAssinatura {
  assinaturaId: number | null
  nome: string
  tipo: TipoAssinatura
  imagemUrl: string | null
  totalPago: number
}

export interface Pagamento {
  id: number
  assinaturaId: number | null
  assinaturaNome: string
  tipoAssinatura: TipoAssinatura
  imagemUrl: string | null
  dataVencimento: string
  dataPagamento: string | null
  valorPrevisto: number | null
  valorPago: number | null
  status: StatusPagamento
  previsao: boolean
  observacoes: string | null
}

export interface ResumoPagamentoAssinatura {
  assinaturaId: number
  totalPago: number
  pagamentosRealizados: number
  ultimoPagamento: string | null
  proximoVencimento: string
}

export interface RegistrarPagamentoInput {
  assinaturaId: number
  dataVencimento: string
  dataPagamento: string
  valorPago: number
  observacoes?: string
}

export interface ConfirmarPagamentoInput {
  dataPagamento?: string
  valorPago?: number
  observacoes?: string
}

export interface Midia {
  id: number
  tipo: TipoMidia
  titulo: string
  status: StatusMidia
  nota: number | null
  imagemUrl: string | null
  descricaoProgresso: string
  assinaturaId: number | null
  assinaturaNome: string | null
  episodiosAssistidos: number | null
  totalEpisodios: number | null
  horasJogadas: number | null
}

export interface MidiaInput {
  tipo: TipoMidia
  titulo: string
  status?: StatusMidia
  nota?: number
  assinaturaId?: number
  episodiosAssistidos?: number
  totalEpisodios?: number
  horasJogadas?: number
}
