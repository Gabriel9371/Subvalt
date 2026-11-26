import type {
  Assinatura,
  AssinaturaInput,
  ConfirmarPagamentoInput,
  Midia,
  MidiaInput,
  Pagamento,
  RegistrarPagamentoInput,
  ResumoPagamentoAssinatura,
  ResumoAssinaturas,
  StatusPagamento,
  StatusMidia,
} from './types'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8080'

export function imageSrc(path: string) {
  return `${API_URL}${path}`
}

export class ApiError extends Error {
  status: number
  campos: Record<string, string> | null

  constructor(status: number, mensagem: string, campos: Record<string, string> | null = null) {
    super(mensagem)
    this.status = status
    this.campos = campos
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isMultipart = init?.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let mensagem = 'Não foi possível concluir a operação.'
    let campos: Record<string, string> | null = null
    try {
      const body = await response.json() as { mensagem?: string; campos?: Record<string, string> }
      mensagem = body.mensagem || mensagem
      campos = body.campos || null
    } catch {
      if (response.status === 500) mensagem = 'O servidor encontrou um erro inesperado.'
    }
    throw new ApiError(response.status, mensagem, campos)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
})

const imageInit = (file: File): RequestInit => {
  const body = new FormData()
  body.append('arquivo', file)
  return { method: 'POST', body }
}

export const api = {
  resumo: () => request<ResumoAssinaturas>('/api/assinaturas/resumo'),
  vencimentos: (dias = 7) => request<Assinatura[]>(`/api/assinaturas/vencimentos?dias=${dias}`),
  semUso: () => request<Assinatura[]>('/api/assinaturas/sem-uso'),
  listarAssinaturas: () => request<Assinatura[]>('/api/assinaturas'),
  criarAssinatura: (input: AssinaturaInput) =>
    request<Assinatura>('/api/assinaturas', jsonInit('POST', input)),
  atualizarAssinatura: (id: number, input: AssinaturaInput) =>
    request<Assinatura>(`/api/assinaturas/${id}`, jsonInit('PUT', input)),
  excluirAssinatura: (id: number) =>
    request<void>(`/api/assinaturas/${id}`, jsonInit('DELETE')),
  enviarImagemAssinatura: (id: number, file: File) =>
    request<Assinatura>(`/api/assinaturas/${id}/imagem`, imageInit(file)),
  removerImagemAssinatura: (id: number) =>
    request<Assinatura>(`/api/assinaturas/${id}/imagem`, jsonInit('DELETE')),
  renovarAssinatura: (id: number) =>
    request<Assinatura>(`/api/assinaturas/${id}/renovar`, jsonInit('PATCH')),
  cancelarAssinatura: (id: number) =>
    request<Assinatura>(`/api/assinaturas/${id}/cancelar`, jsonInit('PATCH')),
  reativarAssinatura: (id: number) =>
    request<Assinatura>(`/api/assinaturas/${id}/reativar`, jsonInit('PATCH')),
  resumosPagamentosAssinaturas: () =>
    request<ResumoPagamentoAssinatura[]>('/api/pagamentos/resumo-assinaturas'),
  listarPagamentos: (filters: {
    inicio?: string
    fim?: string
    assinaturaId?: number
    status?: StatusPagamento
  } = {}) => {
    const params = new URLSearchParams()
    if (filters.inicio) params.set('inicio', filters.inicio)
    if (filters.fim) params.set('fim', filters.fim)
    if (filters.assinaturaId) params.set('assinaturaId', String(filters.assinaturaId))
    if (filters.status) params.set('status', filters.status)
    const query = params.toString()
    return request<Pagamento[]>(`/api/pagamentos${query ? `?${query}` : ''}`)
  },
  registrarPagamento: (input: RegistrarPagamentoInput) =>
    request<Pagamento>('/api/pagamentos', jsonInit('POST', input)),
  confirmarPagamento: (id: number, input: ConfirmarPagamentoInput) =>
    request<Pagamento>(`/api/pagamentos/${id}/confirmar`, jsonInit('PATCH', input)),

  listarMidias: (status?: StatusMidia, assinaturaId?: number) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (assinaturaId) params.set('assinaturaId', String(assinaturaId))
    const query = params.toString()
    return request<Midia[]>(`/api/midias${query ? `?${query}` : ''}`)
  },
  criarMidia: (input: MidiaInput) =>
    request<Midia>('/api/midias', jsonInit('POST', input)),
  atualizarMidia: (id: number, input: MidiaInput) =>
    request<Midia>(`/api/midias/${id}`, jsonInit('PUT', input)),
  excluirMidia: (id: number) =>
    request<void>(`/api/midias/${id}`, jsonInit('DELETE')),
  enviarImagemMidia: (id: number, file: File) =>
    request<Midia>(`/api/midias/${id}/imagem`, imageInit(file)),
  removerImagemMidia: (id: number) =>
    request<Midia>(`/api/midias/${id}/imagem`, jsonInit('DELETE')),
  assistirEpisodio: (id: number) =>
    request<Midia>(`/api/midias/${id}/episodio`, jsonInit('PATCH')),
  registrarHoras: (id: number, quantidade: number) =>
    request<Midia>(`/api/midias/${id}/horas?quantidade=${quantidade}`, jsonInit('PATCH')),
}
