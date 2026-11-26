export type TipoAssinatura = 'STREAMING' | 'SOFTWARE'
export type CicloCobranca = 'MENSAL' | 'TRIMESTRAL' | 'ANUAL'
export type TipoMidia = 'ANIME' | 'JOGO'
export type StatusMidia = 'QUERO_CONSUMIR' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'ABANDONADO'

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
