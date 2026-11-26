import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import './App.css'
import { ApiError, api } from './api'
import { cicloLabels, statusMidiaLabels, tipoAssinaturaLabels, tipoMidiaLabels } from './labels'
import type {
  Assinatura,
  AssinaturaInput,
  Midia,
  MidiaInput,
  ResumoAssinaturas,
  StatusMidia,
  TipoAssinatura,
  TipoMidia,
} from './types'

type View = 'overview' | 'subscriptions' | 'library'

const navItems: { id: View; label: string; mark: string }[] = [
  { id: 'overview', label: 'Visão geral', mark: '01' },
  { id: 'subscriptions', label: 'Assinaturas', mark: '02' },
  { id: 'library', label: 'Biblioteca', mark: '03' },
]

function viewFromHash(): View {
  const hash = window.location.hash.replace('#', '')
  return navItems.some((item) => item.id === hash) ? (hash as View) : 'overview'
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(parseLocalDate(value))
}

function App() {
  const [view, setView] = useState<View>(viewFromHash)

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: View) => {
    window.location.hash = next
    setView(next)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate('overview')} aria-label="Ir para visão geral">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>
            <strong>Subvalt</strong>
            <small>workspace pessoal</small>
          </span>
        </button>

        <nav className="main-nav" aria-label="Seções principais">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'active' : ''}
              onClick={() => navigate(item.id)}
            >
              <span>{item.mark}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="system-status" title="Configuração de conexão">
          <span className="status-dot" />
          <span>conectado</span>
        </div>
      </header>

      <main className="main-content">
        {view === 'overview' && <Overview />}
        {view === 'subscriptions' && <Subscriptions />}
        {view === 'library' && <Library />}
      </main>
    </div>
  )
}

function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  )
}

function LoadingBlock({ label = 'Carregando dados' }: { label?: string }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" />
      {label}
    </div>
  )
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-panel" role="alert">
      <div>
        <strong>Não foi possível carregar</strong>
        <p>{message}</p>
      </div>
      <button type="button" className="button secondary" onClick={onRetry}>Tentar novamente</button>
    </div>
  )
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-glyph" aria-hidden="true">—</span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  )
}

function Overview() {
  const [resumo, setResumo] = useState<ResumoAssinaturas | null>(null)
  const [vencimentos, setVencimentos] = useState<Assinatura[]>([])
  const [semUso, setSemUso] = useState<Assinatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([api.resumo(), api.vencimentos(7), api.semUso()])
      .then(([summary, due, unused]) => {
        if (!active) return
        setResumo(summary)
        setVencimentos(due)
        setSemUso(unused)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar o painel.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [revision])

  if (loading) return <LoadingBlock label="Montando visão geral" />
  if (error) return <ErrorPanel message={error} onRetry={() => setRevision((value) => value + 1)} />
  if (!resumo) return null

  return (
    <>
      <PageHeader eyebrow="Painel / visão geral" title="Seu resumo" />
      <section className="overview-grid" aria-label="Resumo financeiro">
        <article className="cost-panel">
          <div className="panel-heading">
            <span>Custo mensal</span>
            <span className="mono">BRL</span>
          </div>
          <strong className="cost-value">{formatMoney(resumo.gastoMensalTotal)}</strong>
          <div className="cost-footer">
            <span>Estimativa anual</span>
            <b>{formatMoney(resumo.gastoAnualEstimado)}</b>
          </div>
        </article>

        <article className="metric-panel">
          <div className="metric-ring">
            <strong>{resumo.quantidadeAtivas}</strong>
            <span>ativas</span>
          </div>
          <div>
            <p>Assinaturas em uso</p>
            <span className="muted">contas que integram o custo atual</span>
          </div>
        </article>

        <article className="due-panel">
          <span className="indicator yellow" />
          <div>
            <strong>{resumo.quantidadeVencendoEm7Dias}</strong>
            <p>vencem em até 7 dias</p>
          </div>
        </article>
      </section>

      <section className="overview-lists">
        <div className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Próximos compromissos</p>
              <h2>Próximos vencimentos</h2>
            </div>
            <span className="section-count">{vencimentos.length}</span>
          </div>

          {vencimentos.length === 0 ? (
            <EmptyState title="Nada próximo do vencimento" message="Nenhuma assinatura ativa vence nos próximos sete dias." />
          ) : (
            <div className="due-list">
              {vencimentos.map((assinatura) => (
                <article className="due-row" key={assinatura.id}>
                  <span className={`type-glyph ${assinatura.tipo.toLowerCase()}`}>
                    {assinatura.tipo === 'STREAMING' ? 'S' : 'W'}
                  </span>
                  <div className="due-main">
                    <strong>{assinatura.nome}</strong>
                    <span>{tipoAssinaturaLabels[assinatura.tipo]} · {cicloLabels[assinatura.ciclo]}</span>
                  </div>
                  <time className="mono" dateTime={assinatura.proximoVencimento}>
                    {formatDate(assinatura.proximoVencimento)}
                  </time>
                  <strong className="due-cost">{formatMoney(assinatura.custoMensal)}<small>/mês</small></strong>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="section-block review-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Revisar</p>
              <h2>Sem utilização</h2>
            </div>
            <span className="section-count">{semUso.length}</span>
          </div>
          {semUso.length === 0 ? (
            <EmptyState title="Tudo em movimento" message="Não há assinaturas ativas sem mídias em andamento." />
          ) : (
            <div className="unused-list">
              {semUso.map((assinatura) => (
                <article className="unused-row" key={assinatura.id}>
                  <span className="indicator blue" />
                  <div>
                    <strong>{assinatura.nome}</strong>
                    <span>{tipoAssinaturaLabels[assinatura.tipo]}</span>
                  </div>
                  <b>{formatMoney(assinatura.custoMensal)}</b>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>
    </>
  )
}

function Subscriptions() {
  const [items, setItems] = useState<Assinatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'TODAS' | 'ATIVAS' | 'CANCELADAS'>('TODAS')
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState<Assinatura | null | 'new'>(null)
  const [confirm, setConfirm] = useState<{ assinatura: Assinatura; action: 'delete' | 'cancel' } | null>(null)
  const [toast, setToast] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const reload = () => setRevision((value) => value + 1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.listarAssinaturas()
      .then((data) => { if (active) setItems(data) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar assinaturas.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const visibleItems = useMemo(() => items.filter((item) => {
    if (filter === 'ATIVAS') return item.ativa
    if (filter === 'CANCELADAS') return !item.ativa
    return true
  }), [items, filter])

  const runAction = async (assinatura: Assinatura, action: 'renew' | 'cancel' | 'reactivate') => {
    setBusyId(assinatura.id)
    try {
      if (action === 'renew') await api.renovarAssinatura(assinatura.id)
      if (action === 'cancel') await api.cancelarAssinatura(assinatura.id)
      if (action === 'reactivate') await api.reativarAssinatura(assinatura.id)
      setToast(action === 'renew' ? 'Assinatura renovada.' : action === 'cancel' ? 'Assinatura cancelada.' : 'Assinatura reativada.')
      reload()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Não foi possível alterar a assinatura.')
    } finally {
      setBusyId(null)
    }
  }

  const confirmAction = async () => {
    if (!confirm) return
    setBusyId(confirm.assinatura.id)
    try {
      if (confirm.action === 'delete') {
        await api.excluirAssinatura(confirm.assinatura.id)
        setToast('Assinatura excluída. As mídias ficaram sem vínculo.')
      } else {
        await api.cancelarAssinatura(confirm.assinatura.id)
        setToast('Assinatura cancelada.')
      }
      setConfirm(null)
      reload()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Não foi possível concluir a operação.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Financeiro / assinaturas"
        title="Assinaturas"
        action={<button type="button" className="button primary" onClick={() => setForm('new')}><span aria-hidden="true">＋</span> Nova assinatura</button>}
      />

      <div className="filter-bar" aria-label="Filtros de assinatura">
        {(['TODAS', 'ATIVAS', 'CANCELADAS'] as const).map((value) => (
          <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>
            {value === 'TODAS' ? 'Todas' : value === 'ATIVAS' ? 'Ativas' : 'Canceladas'}
            <span>{value === 'TODAS' ? items.length : value === 'ATIVAS' ? items.filter((item) => item.ativa).length : items.filter((item) => !item.ativa).length}</span>
          </button>
        ))}
      </div>

      {loading ? <LoadingBlock label="Carregando assinaturas" /> :
        error ? <ErrorPanel message={error} onRetry={reload} /> :
        visibleItems.length === 0 ? (
          <EmptyState title="Nenhuma assinatura encontrada" message="Cadastre uma assinatura para acompanhar custos e vencimentos." action={
            <button type="button" className="button primary" onClick={() => setForm('new')}>Cadastrar assinatura</button>
          } />
        ) : (
          <section className="subscription-list">
            {visibleItems.map((item) => (
              <article className="subscription-card" key={item.id}>
                <div className={`subscription-symbol ${item.tipo.toLowerCase()}`}>
                  {item.tipo === 'STREAMING' ? 'S' : 'W'}
                </div>
                <div className="subscription-main">
                  <div className="title-line">
                    <h2>{item.nome}</h2>
                    <span className={`state-badge ${item.ativa ? 'active' : 'inactive'}`}>
                      {item.ativa ? 'Ativa' : 'Cancelada'}
                    </span>
                  </div>
                  <div className="subscription-meta">
                    <span>{tipoAssinaturaLabels[item.tipo]}</span>
                    <i />
                    <span>{cicloLabels[item.ciclo]}</span>
                    {item.tipo === 'STREAMING' && item.pessoasNoPlano && <><i /><span>{item.pessoasNoPlano} {item.pessoasNoPlano === 1 ? 'pessoa' : 'pessoas'}</span></>}
                    {item.tipo === 'SOFTWARE' && item.percentualDesconto != null && <><i /><span>{item.percentualDesconto}% de desconto</span></>}
                  </div>
                </div>
                <div className="subscription-cost">
                  <strong>{formatMoney(item.custoMensal)}</strong>
                  <span>/ mês</span>
                </div>
                <div className="subscription-due">
                  <span className={`indicator ${item.vencida ? 'red' : item.diasParaVencer <= 7 ? 'yellow' : 'green'}`} />
                  <div>
                    <strong>{item.vencida ? 'Vencida' : item.diasParaVencer <= 7 ? 'Próxima do vencimento' : 'Em dia'}</strong>
                    <span>{formatDate(item.proximoVencimento)} · {item.diasParaVencer >= 0 ? `${item.diasParaVencer} dias` : `${Math.abs(item.diasParaVencer)} dias atrasada`}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button type="button" className="icon-button" title="Editar" aria-label={`Editar ${item.nome}`} onClick={() => setForm(item)}>✎</button>
                  {item.ativa ? (
                    <>
                      <button type="button" className="text-button" disabled={busyId === item.id} onClick={() => runAction(item, 'renew')}>Renovar</button>
                      <button type="button" className="icon-button danger" title="Cancelar" aria-label={`Cancelar ${item.nome}`} disabled={busyId === item.id} onClick={() => setConfirm({ assinatura: item, action: 'cancel' })}>×</button>
                    </>
                  ) : (
                    <button type="button" className="text-button" disabled={busyId === item.id} onClick={() => runAction(item, 'reactivate')}>Reativar</button>
                  )}
                  <button type="button" className="icon-button danger" title="Excluir" aria-label={`Excluir ${item.nome}`} disabled={busyId === item.id} onClick={() => setConfirm({ assinatura: item, action: 'delete' })}>⌫</button>
                </div>
              </article>
            ))}
          </section>
        )
      }

      {form && (
        <SubscriptionForm
          assinatura={form === 'new' ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); setToast(form === 'new' ? 'Assinatura cadastrada.' : 'Assinatura atualizada.'); reload() }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.action === 'delete' ? 'Excluir assinatura?' : 'Cancelar assinatura?'}
          message={confirm.action === 'delete'
            ? 'As mídias associadas continuarão existindo, mas ficarão sem uma assinatura vinculada.'
            : 'A assinatura ficará cancelada e deixará de integrar os totais ativos.'}
          confirmLabel={confirm.action === 'delete' ? 'Excluir' : 'Cancelar assinatura'}
          danger
          busy={busyId === confirm.assinatura.id}
          onClose={() => setConfirm(null)}
          onConfirm={confirmAction}
        />
      )}
      {toast && <Toast message={toast} />}
    </>
  )
}

function MediaForm({ midia, assinaturas, onClose, onSaved }: {
  midia: Midia | null
  assinaturas: Assinatura[]
  onClose: () => void
  onSaved: () => void
}) {
  const [tipo, setTipo] = useState<TipoMidia>(midia?.tipo || 'ANIME')
  const [titulo, setTitulo] = useState(midia?.titulo || '')
  const [status, setStatus] = useState<StatusMidia | ''>(midia?.status || '')
  const [nota, setNota] = useState(midia?.nota != null ? String(midia.nota) : '')
  const [assinaturaId, setAssinaturaId] = useState(midia?.assinaturaId ? String(midia.assinaturaId) : '')
  const [episodios, setEpisodios] = useState(midia?.episodiosAssistidos != null ? String(midia.episodiosAssistidos) : '')
  const [total, setTotal] = useState(midia?.totalEpisodios != null ? String(midia.totalEpisodios) : '')
  const [horas, setHoras] = useState(midia?.horasJogadas != null ? String(midia.horasJogadas) : '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    const input: MidiaInput = {
      tipo,
      titulo,
      ...(status ? { status } : {}),
      ...(nota !== '' ? { nota: Number(nota) } : {}),
      ...(assinaturaId ? { assinaturaId: Number(assinaturaId) } : {}),
      ...(tipo === 'ANIME'
        ? { episodiosAssistidos: episodios === '' ? 0 : Number(episodios), ...(total ? { totalEpisodios: Number(total) } : {}) }
        : { horasJogadas: horas === '' ? 0 : Number(horas) }),
    }
    try {
      if (midia) await api.atualizarMidia(midia.id, input)
      else await api.criarMidia(input)
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.campos || {})
      } else setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={midia ? 'Editar mídia' : 'Nova mídia'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="midia-tipo">Tipo</label>
          <select id="midia-tipo" value={tipo} disabled={!!midia} onChange={(event) => setTipo(event.target.value as TipoMidia)}>
            <option value="ANIME">Anime</option>
            <option value="JOGO">Jogo</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="midia-titulo">Título</label>
          <input id="midia-titulo" value={titulo} maxLength={150} onChange={(event) => setTitulo(event.target.value)} placeholder="Nome da mídia" />
          {fieldErrors.titulo && <small className="field-error">{fieldErrors.titulo}</small>}
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="midia-status">Status</label>
            <select id="midia-status" value={status} onChange={(event) => setStatus(event.target.value as StatusMidia)}>
              <option value="">Quero consumir</option>
              <option value="QUERO_CONSUMIR">Quero consumir</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="ABANDONADO">Abandonado</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="midia-nota">Nota</label>
            <input id="midia-nota" type="number" min="0" max="10" step="0.1" value={nota} onChange={(event) => setNota(event.target.value)} placeholder="0–10" />
            {fieldErrors.nota && <small className="field-error">{fieldErrors.nota}</small>}
          </div>
        </div>
        <div className="field">
          <label htmlFor="midia-assinatura">Assinatura</label>
          <select id="midia-assinatura" value={assinaturaId} onChange={(event) => setAssinaturaId(event.target.value)}>
            <option value="">Sem assinatura</option>
            {assinaturas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </div>
        {tipo === 'ANIME' ? (
          <div className="form-grid">
            <div className="field">
              <label htmlFor="episodios-assistidos">Episódios assistidos</label>
              <input id="episodios-assistidos" type="number" min="0" step="1" value={episodios} onChange={(event) => setEpisodios(event.target.value)} />
              {fieldErrors.episodiosAssistidos && <small className="field-error">{fieldErrors.episodiosAssistidos}</small>}
            </div>
            <div className="field">
              <label htmlFor="total-episodios">Total de episódios</label>
              <input id="total-episodios" type="number" min="1" step="1" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="Opcional" />
              {fieldErrors.totalEpisodios && <small className="field-error">{fieldErrors.totalEpisodios}</small>}
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="horas-jogadas">Horas jogadas</label>
            <input id="horas-jogadas" type="number" min="0" step="1" value={horas} onChange={(event) => setHoras(event.target.value)} />
            {fieldErrors.horasJogadas && <small className="field-error">{fieldErrors.horasJogadas}</small>}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button primary" disabled={busy}>{busy ? 'Salvando…' : midia ? 'Salvar alterações' : 'Cadastrar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Painel</p>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>×</button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ConfirmDialog({ title, message, confirmLabel, danger = false, busy = false, onClose, onConfirm }: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <span className={`confirm-mark ${danger ? 'danger' : ''}`} aria-hidden="true">!</span>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Voltar</button>
          <button type="button" className={danger ? 'button danger' : 'button primary'} disabled={busy} onClick={onConfirm}>
            {busy ? 'Processando…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

function HoursDialog({ midia, busy, onClose, onSaved }: {
  midia: Midia
  busy: boolean
  onClose: () => void
  onSaved: (quantidade: number) => void
}) {
  const [quantidade, setQuantidade] = useState('')
  return (
    <Modal title="Registrar horas" onClose={onClose}>
      <form className="form" onSubmit={(event) => {
        event.preventDefault()
        if (Number(quantidade) > 0) onSaved(Number(quantidade))
      }}>
        <p className="dialog-context">{midia.titulo} · {midia.descricaoProgresso}</p>
        <div className="field">
          <label htmlFor="horas-adicionais">Horas a adicionar</label>
          <input id="horas-adicionais" type="number" min="1" step="1" value={quantidade} onChange={(event) => setQuantidade(event.target.value)} autoFocus />
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button primary" disabled={busy || Number(quantidade) <= 0}>{busy ? 'Registrando…' : 'Registrar horas'}</button>
        </div>
      </form>
    </Modal>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="status">
      <span aria-hidden="true">✓</span>
      {message}
    </div>
  )
}

export default App

function SubscriptionForm({ assinatura, onClose, onSaved }: { assinatura: Assinatura | null; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState<TipoAssinatura>(assinatura?.tipo || 'STREAMING')
  const [nome, setNome] = useState(assinatura?.nome || '')
  const [valor, setValor] = useState(assinatura ? String(assinatura.valor) : '')
  const [ciclo, setCiclo] = useState<AssinaturaInput['ciclo']>(assinatura?.ciclo || 'MENSAL')
  const [vencimento, setVencimento] = useState(assinatura?.proximoVencimento || '')
  const [pessoas, setPessoas] = useState(assinatura?.pessoasNoPlano ? String(assinatura.pessoasNoPlano) : '')
  const [desconto, setDesconto] = useState(assinatura?.percentualDesconto != null ? String(assinatura.percentualDesconto) : '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    const input: AssinaturaInput = {
      tipo,
      nome,
      valor: Number(valor),
      ciclo,
      proximoVencimento: vencimento,
      ...(tipo === 'STREAMING' ? { pessoasNoPlano: Number(pessoas) } : { percentualDesconto: Number(desconto) }),
    }
    try {
      if (assinatura) await api.atualizarAssinatura(assinatura.id, input)
      else await api.criarAssinatura(input)
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.campos || {})
      } else setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={assinatura ? 'Editar assinatura' : 'Nova assinatura'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="assinatura-tipo">Tipo</label>
          <select id="assinatura-tipo" value={tipo} disabled={!!assinatura} onChange={(event) => setTipo(event.target.value as TipoAssinatura)}>
            <option value="STREAMING">Streaming</option>
            <option value="SOFTWARE">Software</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="assinatura-nome">Nome</label>
          <input id="assinatura-nome" value={nome} maxLength={100} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: Netflix" />
          {fieldErrors.nome && <small className="field-error">{fieldErrors.nome}</small>}
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="assinatura-valor">Valor cobrado</label>
            <div className="input-prefix"><span>R$</span><input id="assinatura-valor" type="number" min="0.01" step="0.01" value={valor} onChange={(event) => setValor(event.target.value)} /></div>
            {fieldErrors.valor && <small className="field-error">{fieldErrors.valor}</small>}
          </div>
          <div className="field">
            <label htmlFor="assinatura-ciclo">Ciclo</label>
            <select id="assinatura-ciclo" value={ciclo} onChange={(event) => setCiclo(event.target.value as AssinaturaInput['ciclo'])}>
              <option value="MENSAL">Mensal</option>
              <option value="TRIMESTRAL">Trimestral</option>
              <option value="ANUAL">Anual</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="assinatura-vencimento">Próximo vencimento</label>
          <input id="assinatura-vencimento" type="date" value={vencimento} onChange={(event) => setVencimento(event.target.value)} />
          {fieldErrors.proximoVencimento && <small className="field-error">{fieldErrors.proximoVencimento}</small>}
        </div>
        {tipo === 'STREAMING' ? (
          <div className="field">
            <label htmlFor="pessoas-plano">Pessoas no plano</label>
            <input id="pessoas-plano" type="number" min="1" step="1" value={pessoas} onChange={(event) => setPessoas(event.target.value)} />
            {fieldErrors.pessoasNoPlano && <small className="field-error">{fieldErrors.pessoasNoPlano}</small>}
          </div>
        ) : (
          <div className="field">
            <label htmlFor="desconto">Percentual de desconto</label>
            <div className="input-suffix"><input id="desconto" type="number" min="0" max="100" step="0.01" value={desconto} onChange={(event) => setDesconto(event.target.value)} /><span>%</span></div>
            {fieldErrors.percentualDesconto && <small className="field-error">{fieldErrors.percentualDesconto}</small>}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button primary" disabled={busy}>{busy ? 'Salvando…' : assinatura ? 'Salvar alterações' : 'Cadastrar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function Library() {
  const [items, setItems] = useState<Midia[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusMidia | 'TODOS'>('TODOS')
  const [assinaturaFilter, setAssinaturaFilter] = useState<'TODAS' | 'SEM_ASSINATURA' | number>('TODAS')
  const [typeFilter, setTypeFilter] = useState<'TODOS' | TipoMidia>('TODOS')
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState<Midia | null | 'new'>(null)
  const [confirm, setConfirm] = useState<Midia | null>(null)
  const [hoursTarget, setHoursTarget] = useState<Midia | null>(null)
  const [toast, setToast] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const reload = () => setRevision((value) => value + 1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([api.listarMidias(), api.listarAssinaturas()])
      .then(([medias, subscriptions]) => {
        if (!active) return
        setItems(medias)
        setAssinaturas(subscriptions)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar a biblioteca.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const visibleItems = useMemo(() => items.filter((item) => {
    if (statusFilter !== 'TODOS' && item.status !== statusFilter) return false
    if (typeFilter !== 'TODOS' && item.tipo !== typeFilter) return false
    if (assinaturaFilter === 'SEM_ASSINATURA' && item.assinaturaId !== null) return false
    if (assinaturaFilter !== 'TODAS' && assinaturaFilter !== 'SEM_ASSINATURA' && item.assinaturaId !== assinaturaFilter) return false
    return true
  }), [items, statusFilter, assinaturaFilter, typeFilter])

  const assistirEpisodio = async (midia: Midia) => {
    setBusyId(midia.id)
    try {
      await api.assistirEpisodio(midia.id)
      setToast('Episódio registrado.')
      reload()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Não foi possível registrar o episódio.')
    } finally {
      setBusyId(null)
    }
  }

  const excluirMidia = async () => {
    if (!confirm) return
    setBusyId(confirm.id)
    try {
      await api.excluirMidia(confirm.id)
      setConfirm(null)
      setToast('Mídia excluída.')
      reload()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Não foi possível excluir a mídia.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Consumo / biblioteca"
        title="Biblioteca"
        action={<button type="button" className="button primary" onClick={() => setForm('new')}><span aria-hidden="true">＋</span> Nova mídia</button>}
      />

      <div className="library-toolbar">
        <div className="segmented" aria-label="Filtro por tipo">
          {(['TODOS', 'ANIME', 'JOGO'] as const).map((value) => (
            <button key={value} type="button" className={typeFilter === value ? 'active' : ''} onClick={() => setTypeFilter(value)}>
              {value === 'TODOS' ? 'Todos' : tipoMidiaLabels[value]}
              {value !== 'TODOS' && <span>{items.filter((item) => item.tipo === value).length}</span>}
            </button>
          ))}
        </div>
        <div className="select-filters">
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusMidia | 'TODOS')}>
              <option value="TODOS">Todos os status</option>
              <option value="QUERO_CONSUMIR">Quero consumir</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="ABANDONADO">Abandonado</option>
            </select>
          </label>
          <label>
            <span>Assinatura</span>
            <select value={assinaturaFilter === 'TODAS' || assinaturaFilter === 'SEM_ASSINATURA' ? assinaturaFilter : String(assinaturaFilter)}
              onChange={(event) => setAssinaturaFilter(event.target.value === 'TODAS' || event.target.value === 'SEM_ASSINATURA' ? event.target.value : Number(event.target.value))}>
              <option value="TODAS">Todas</option>
              <option value="SEM_ASSINATURA">Sem assinatura</option>
              {assinaturas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </label>
        </div>
      </div>

      {loading ? <LoadingBlock label="Organizando biblioteca" /> :
        error ? <ErrorPanel message={error} onRetry={reload} /> :
        visibleItems.length === 0 ? (
          <EmptyState title="Nenhuma mídia encontrada" message="Ajuste os filtros ou cadastre uma nova mídia." action={
            <button type="button" className="button primary" onClick={() => setForm('new')}>Cadastrar mídia</button>
          } />
        ) : (
          <section className="media-grid" aria-label="Lista da biblioteca">
            {visibleItems.map((midia) => (
              <article className={`media-card ${midia.tipo.toLowerCase()}`} key={midia.id}>
                <div className="media-head">
                  <span className="media-kind">{midia.tipo === 'ANIME' ? 'AN' : 'JG'}</span>
                  <div className="media-actions">
                    <button type="button" className="icon-button" title="Editar" aria-label={`Editar ${midia.titulo}`} onClick={() => setForm(midia)}>✎</button>
                    <button type="button" className="icon-button danger" title="Excluir" aria-label={`Excluir ${midia.titulo}`} onClick={() => setConfirm(midia)}>⌫</button>
                  </div>
                </div>
                <div className="media-title">
                  <span className={`status-dot-label ${midia.status.toLowerCase()}`} />
                  <div>
                    <p>{tipoMidiaLabels[midia.tipo]}</p>
                    <h2>{midia.titulo}</h2>
                  </div>
                </div>
                <div className="media-progress">
                  <span className="mono">{midia.descricaoProgresso}</span>
                  {midia.tipo === 'ANIME' && midia.totalEpisodios != null && (
                    <div className="progress-track">
                      <span style={{ width: `${Math.min(100, ((midia.episodiosAssistidos || 0) / midia.totalEpisodios) * 100)}%` }} />
                    </div>
                  )}
                  {midia.tipo === 'JOGO' && <div className="game-meter" aria-hidden="true"><i /><i /><i /><i /><i /></div>}
                </div>
                <div className="media-footer">
                  <span className={`media-status ${midia.status.toLowerCase().replaceAll('_', '-')}`}>{statusMidiaLabels[midia.status]}</span>
                  {midia.nota != null && <span className="media-note">nota <b>{midia.nota}</b></span>}
                </div>
                <div className="media-association">
                  <span>{midia.assinaturaNome || 'Sem assinatura'}</span>
                  {midia.tipo === 'ANIME' && (
                    <button type="button" className="text-button" disabled={busyId === midia.id || midia.status === 'CONCLUIDO'}
                      onClick={() => assistirEpisodio(midia)}>
                      {midia.status === 'CONCLUIDO' ? 'Concluído' : '+ Episódio'}
                    </button>
                  )}
                  {midia.tipo === 'JOGO' && (
                    <button type="button" className="text-button" disabled={busyId === midia.id} onClick={() => setHoursTarget(midia)}>+ Horas</button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )
      }

      {form && (
        <MediaForm
          midia={form === 'new' ? null : form}
          assinaturas={assinaturas}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); setToast(form === 'new' ? 'Mídia cadastrada.' : 'Mídia atualizada.'); reload() }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title="Excluir mídia?"
          message={`“${confirm.titulo}” será removida permanentemente da biblioteca.`}
          confirmLabel="Excluir mídia"
          danger
          busy={busyId === confirm.id}
          onClose={() => setConfirm(null)}
          onConfirm={excluirMidia}
        />
      )}
      {hoursTarget && (
        <HoursDialog
          midia={hoursTarget}
          busy={busyId === hoursTarget.id}
          onClose={() => setHoursTarget(null)}
          onSaved={async (quantidade) => {
            setBusyId(hoursTarget.id)
            try {
              await api.registrarHoras(hoursTarget.id, quantidade)
              setHoursTarget(null)
              setToast('Horas registradas.')
              reload()
            } catch (err) {
              setToast(err instanceof Error ? err.message : 'Não foi possível registrar as horas.')
            } finally {
              setBusyId(null)
            }
          }}
        />
      )}
      {toast && <Toast message={toast} />}
    </>
  )
}
