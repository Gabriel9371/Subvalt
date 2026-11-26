import type { CicloCobranca, StatusMidia, StatusPagamento, TipoAssinatura, TipoMidia } from './types'

export const tipoAssinaturaLabels: Record<TipoAssinatura, string> = {
  STREAMING: 'Streaming',
  SOFTWARE: 'Software',
}

export const tipoMidiaLabels: Record<TipoMidia, string> = {
  ANIME: 'Anime',
  JOGO: 'Jogo',
}

export const cicloLabels: Record<CicloCobranca, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual',
}

export const statusMidiaLabels: Record<StatusMidia, string> = {
  QUERO_CONSUMIR: 'Quero consumir',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  ABANDONADO: 'Abandonado',
}

export const statusPagamentoLabels: Record<StatusPagamento, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  ATRASADO: 'Atrasado',
}
