import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import './App.css'
import { ApiError, api } from './api'
import { EntityArtwork } from './EntityArtwork'
import { ImagePicker } from './ImagePicker'
import { cicloLabels, statusMidiaLabels, statusPagamentoLabels, tipoAssinaturaLabels, tipoMidiaLabels } from './labels'
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
  TipoAssinatura,
  TipoMidia,
} from './types'

type View = 'overview' | 'subscriptions' | 'payments' | 'library'

const navItems: { id: View; label: string; mark: string }[] = [
  { id: 'overview', label: 'Visão geral', mark: '01' },
  { id: 'subscriptions', label: 'Assinaturas', mark: '02' },
  { id: 'payments', label: 'Pagamentos', mark: '03' },
  { id: 'library', label: 'Biblioteca', mark: '04' },
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

function formatPeriod(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(year, month - 1, 1))
}

function todayInputDate() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
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
        {view === 'overview' && <Overview onPayments={() => navigate('payments')} />}
        {view === 'subscriptions' && <Subscriptions onPayments={() => navigate('payments')} />}
        {view === 'payments' && <Payments />}
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

function Overview({ onPayments }: { onPayments: () => void }) {
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
            <span>Custo mensal recorrente estimado</span>
            <span className="mono">BRL</span>
          </div>
          <strong className="cost-value">{formatMoney(resumo.gastoMensalTotal)}</strong>
          <div className="cost-footer">
            <span>Estimativa recorrente anual</span>
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

      <section className="finance-kpis" aria-label="Pagamentos e previsões financeiras">
        <article className="finance-kpi">
          <span>Pago neste mês</span>
          <strong>{formatMoney(resumo.financeiro.totalPagoMes)}</strong>
          <small>{resumo.financeiro.variacaoPercentual == null
            ? 'Sem base no mês anterior'
            : `${resumo.financeiro.variacaoPercentual >= 0 ? '+' : ''}${resumo.financeiro.variacaoPercentual}% vs. mês anterior`}</small>
        </article>
        <article className="finance-kpi">
          <span>Pago neste ano</span>
          <strong>{formatMoney(resumo.financeiro.totalPagoAno)}</strong>
          <small>{resumo.financeiro.gastosMensais.length} meses no gráfico</small>
        </article>
        <article className="finance-kpi pending">
          <span>Despesas pendentes · {resumo.financeiro.quantidadePendentes}</span>
          <strong>{formatMoney(resumo.financeiro.despesasPendentes)}</strong>
          <small>Valores previstos ainda não confirmados</small>
        </article>
        <article className="finance-kpi overdue">
          <span>Despesas atrasadas · {resumo.financeiro.quantidadeAtrasadas}</span>
          <strong>{formatMoney(resumo.financeiro.despesasAtrasadas)}</strong>
          <small>Vencidas e ainda não pagas</small>
        </article>
        <article className="finance-kpi forecast">
          <span>Previsão para 30 dias</span>
          <strong>{formatMoney(resumo.financeiro.previsaoProximos30Dias)}</strong>
          <small>Cobranças previstas no período</small>
        </article>
      </section>

      <section className="finance-analysis">
        <article className="section-block monthly-chart-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pagamentos confirmados</p>
              <h2>Evolução mensal</h2>
            </div>
            <span className={`comparison-pill ${resumo.financeiro.variacaoMes >= 0 ? 'up' : 'down'}`}>
              {resumo.financeiro.variacaoMes >= 0 ? '+' : ''}{formatMoney(resumo.financeiro.variacaoMes)}
            </span>
          </div>
          <div className="monthly-chart" role="img" aria-label="Gráfico de pagamentos mensais dos últimos 12 meses">
            {resumo.financeiro.gastosMensais.map((item) => {
              const maximo = Math.max(...resumo.financeiro.gastosMensais.map((mes) => mes.totalPago), 1)
              const altura = item.totalPago === 0 ? 0 : Math.max(5, (item.totalPago / maximo) * 100)
              return (
                <div className="monthly-chart-column" key={item.periodo} title={`${formatPeriod(item.periodo)}: ${formatMoney(item.totalPago)}`}>
                  <div className="monthly-chart-track">
                    <span style={{ height: `${altura}%` }} />
                  </div>
                  <small>{formatPeriod(item.periodo)}</small>
                </div>
              )
            })}
          </div>
          <div className="chart-caption">
            <span>Este mês</span>
            <strong>{formatMoney(resumo.financeiro.totalPagoMes)}</strong>
            <span>Anterior</span>
            <strong>{formatMoney(resumo.financeiro.totalMesAnterior)}</strong>
          </div>
        </article>

        <article className="section-block type-chart-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Ano atual</p>
              <h2>Streaming e software</h2>
            </div>
          </div>
          <div className="type-spend-list">
            {resumo.financeiro.gastosPorTipo.map((item) => {
              const maximo = Math.max(...resumo.financeiro.gastosPorTipo.map((tipo) => tipo.totalPago), 1)
              return (
                <div className="type-spend-row" key={item.tipo}>
                  <div className="type-spend-label">
                    <span>{tipoAssinaturaLabels[item.tipo]}</span>
                    <strong>{formatMoney(item.totalPago)}</strong>
                  </div>
                  <div className="type-spend-track">
                    <span className={item.tipo.toLowerCase()} style={{ width: `${(item.totalPago / maximo) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" className="text-button finance-link" onClick={onPayments}>Abrir histórico financeiro</button>
        </article>
      </section>

      <section className="finance-details">
        <article className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Ano atual</p>
              <h2>Gastos por assinatura</h2>
            </div>
          </div>
          {resumo.financeiro.gastosPorAssinatura.length === 0 ? (
            <EmptyState title="Sem pagamentos no período" message="Os valores aparecerão aqui após registrar pagamentos." />
          ) : (
            <div className="finance-subscription-list">
              {resumo.financeiro.gastosPorAssinatura.slice(0, 7).map((item) => (
                <div className="finance-subscription-row" key={`${item.assinaturaId ?? item.nome}-${item.tipo}`}>
                  <EntityArtwork
                    className={`finance-subscription-artwork ${item.tipo.toLowerCase()}`}
                    imageUrl={item.imagemUrl}
                    alt={`Logo de ${item.nome}`}
                    fallback={item.tipo === 'STREAMING' ? 'S' : 'W'}
                  />
                  <span>{item.nome}</span>
                  <strong>{formatMoney(item.totalPago)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Próximos 30 dias</p>
              <h2>Previsão de cobranças</h2>
            </div>
            <button type="button" className="text-button" onClick={onPayments}>Ver todas</button>
          </div>
          {resumo.financeiro.proximasCobrancas.length === 0 ? (
            <EmptyState title="Sem cobranças previstas" message="Não há vencimentos nos próximos 30 dias." />
          ) : (
            <div className="forecast-list">
              {resumo.financeiro.proximasCobrancas.map((item) => (
                <div className="forecast-row" key={item.id}>
                  <time dateTime={item.dataVencimento}>{formatDate(item.dataVencimento)}</time>
                  <span>{item.assinaturaNome}</span>
                  <strong>{formatMoney(item.valorPrevisto || 0)}</strong>
                </div>
              ))}
            </div>
          )}
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
                  <EntityArtwork
                    className={`type-glyph ${assinatura.tipo.toLowerCase()}`}
                    imageUrl={assinatura.imagemUrl}
                    alt={`Logo de ${assinatura.nome}`}
                    fallback={assinatura.tipo === 'STREAMING' ? 'S' : 'W'}
                  />
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
                  <EntityArtwork
                    className="unused-artwork"
                    imageUrl={assinatura.imagemUrl}
                    alt={`Logo de ${assinatura.nome}`}
                    fallback={assinatura.tipo === 'STREAMING' ? 'S' : 'W'}
                  />
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

function Subscriptions({ onPayments }: { onPayments: () => void }) {
  const [items, setItems] = useState<Assinatura[]>([])
  const [paymentSummaries, setPaymentSummaries] = useState<Record<number, ResumoPagamentoAssinatura>>({})
  const [paymentSummaryError, setPaymentSummaryError] = useState(false)
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
    api.resumosPagamentosAssinaturas()
      .then((data) => {
        if (active) setPaymentSummaries(Object.fromEntries(data.map((summary) => [summary.assinaturaId, summary])))
      })
      .catch(() => { if (active) setPaymentSummaryError(true) })
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
                <EntityArtwork
                  className={`subscription-symbol ${item.tipo.toLowerCase()}`}
                  imageUrl={item.imagemUrl}
                  alt={`Logo de ${item.nome}`}
                  fallback={item.tipo === 'STREAMING' ? 'S' : 'W'}
                />
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
                  <div className="subscription-finance-summary">
                    {paymentSummaries[item.id] ? (
                      <>
                        <span>Total pago <b>{formatMoney(paymentSummaries[item.id].totalPago)}</b></span>
                        <span>{paymentSummaries[item.id].pagamentosRealizados} pagamentos</span>
                        {paymentSummaries[item.id].ultimoPagamento && (
                          <span>Último em {formatDate(paymentSummaries[item.id].ultimoPagamento!)}</span>
                        )}
                      </>
                    ) : paymentSummaryError ? (
                      <span>Resumo de pagamentos indisponível</span>
                    ) : (
                      <span>Carregando histórico financeiro…</span>
                    )}
                    <button type="button" className="text-button" onClick={onPayments}>Histórico</button>
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
          onSaved={(feedback) => { setForm(null); setToast(feedback || (form === 'new' ? 'Assinatura cadastrada.' : 'Assinatura atualizada.')); reload() }}
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

function Payments() {
  const [items, setItems] = useState<Pagamento[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [assinaturaId, setAssinaturaId] = useState('')
  const [status, setStatus] = useState<StatusPagamento | 'TODOS'>('TODOS')
  const [revision, setRevision] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [confirming, setConfirming] = useState<Pagamento | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const confirmLock = useRef(false)

  const reload = () => {
    setLoading(true)
    setError('')
    setRevision((value) => value + 1)
  }

  useEffect(() => {
    let active = true
    Promise.all([
      api.listarPagamentos({
        ...(inicio ? { inicio } : {}),
        ...(fim ? { fim } : {}),
        ...(assinaturaId ? { assinaturaId: Number(assinaturaId) } : {}),
        ...(status !== 'TODOS' ? { status } : {}),
      }),
      api.listarAssinaturas(),
    ])
      .then(([payments, subscriptions]) => {
        if (!active) return
        setItems(payments)
        setAssinaturas(subscriptions)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar o histórico financeiro.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision, inicio, fim, assinaturaId, status])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const confirmarPagamento = async (input: ConfirmarPagamentoInput) => {
    if (!confirming || confirmLock.current) return
    confirmLock.current = true
    setBusyId(confirming.id)
    try {
      await api.confirmarPagamento(confirming.id, input)
      setConfirming(null)
      setToast('Pagamento confirmado.')
      reload()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Não foi possível confirmar o pagamento.')
    } finally {
      confirmLock.current = false
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Financeiro / pagamentos"
        title="Histórico financeiro"
        action={<button type="button" className="button primary" onClick={() => setShowNew(true)}>＋ Registrar pagamento</button>}
      />

      <section className="payment-filters" aria-label="Filtros do histórico financeiro">
        <label>
          <span>Vencimento desde</span>
          <input type="date" value={inicio} onChange={(event) => {
            setLoading(true)
            setError('')
            setInicio(event.target.value)
          }} />
        </label>
        <label>
          <span>Vencimento até</span>
          <input type="date" value={fim} onChange={(event) => {
            setLoading(true)
            setError('')
            setFim(event.target.value)
          }} />
        </label>
        <label>
          <span>Assinatura</span>
          <select value={assinaturaId} onChange={(event) => {
            setLoading(true)
            setError('')
            setAssinaturaId(event.target.value)
          }}>
            <option value="">Todas</option>
            {assinaturas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => {
            setLoading(true)
            setError('')
            setStatus(event.target.value as StatusPagamento | 'TODOS')
          }}>
            <option value="TODOS">Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="ATRASADO">Atrasado</option>
          </select>
        </label>
      </section>

      {loading ? <LoadingBlock label="Carregando pagamentos" /> :
        error ? <ErrorPanel message={error} onRetry={reload} /> :
        items.length === 0 ? (
          <EmptyState
            title="Nenhuma cobrança neste período"
            message="As previsões das assinaturas ativas e os pagamentos registrados aparecerão aqui."
            action={<button type="button" className="button primary" onClick={() => setShowNew(true)}>Registrar pagamento</button>}
          />
        ) : (
          <section className="payment-history" aria-label="Pagamentos e cobranças">
            {items.map((item) => (
              <article className="payment-row" key={item.id}>
                <EntityArtwork
                  className={`payment-artwork ${item.tipoAssinatura.toLowerCase()}`}
                  imageUrl={item.imagemUrl}
                  alt={`Logo de ${item.assinaturaNome}`}
                  fallback={item.tipoAssinatura === 'STREAMING' ? 'S' : 'W'}
                />
                <div className="payment-main">
                  <div className="payment-title-line">
                    <strong>{item.assinaturaNome}</strong>
                    <span className={`payment-status ${item.status.toLowerCase()}`}>
                      {statusPagamentoLabels[item.status]}
                    </span>
                    {item.previsao && item.status !== 'PAGO' && <small>Prevista</small>}
                  </div>
                  {item.observacoes && <p>{item.observacoes}</p>}
                </div>
                <div className="payment-date">
                  <span>Vencimento</span>
                  <strong>{formatDate(item.dataVencimento)}</strong>
                </div>
                <div className="payment-date">
                  <span>Pagamento</span>
                  <strong>{item.dataPagamento ? formatDate(item.dataPagamento) : '—'}</strong>
                </div>
                <div className="payment-amount">
                  <span>{item.status === 'PAGO' ? 'Valor pago' : 'Valor previsto'}</span>
                  <strong>{formatMoney(item.status === 'PAGO' ? item.valorPago || 0 : item.valorPrevisto || 0)}</strong>
                </div>
                {item.status !== 'PAGO' ? (
                  <button
                    type="button"
                    className="button secondary payment-action"
                    disabled={busyId === item.id}
                    onClick={() => setConfirming(item)}
                  >
                    Confirmar pagamento
                  </button>
                ) : <span className="payment-confirmed" aria-label="Pagamento confirmado">✓</span>}
              </article>
            ))}
          </section>
        )
      }

      {showNew && (
        <RegisterPaymentForm
          assinaturas={assinaturas}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false)
            setToast('Pagamento registrado.')
            setStatus('TODOS')
            setAssinaturaId('')
            setInicio('')
            setFim('')
            reload()
          }}
        />
      )}
      {confirming && (
        <ConfirmPaymentForm
          pagamento={confirming}
          busy={busyId === confirming.id}
          onClose={() => setConfirming(null)}
          onConfirm={confirmarPagamento}
        />
      )}
      {toast && <Toast message={toast} />}
    </>
  )
}

function RegisterPaymentForm({ assinaturas, onClose, onSaved }: {
  assinaturas: Assinatura[]
  onClose: () => void
  onSaved: () => void
}) {
  const [assinaturaId, setAssinaturaId] = useState('')
  const [dataVencimento, setDataVencimento] = useState(todayInputDate())
  const [dataPagamento, setDataPagamento] = useState(todayInputDate())
  const [valorPago, setValorPago] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitLock = useRef(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitLock.current) return
    submitLock.current = true
    setBusy(true)
    setError('')
    const input: RegistrarPagamentoInput = {
      assinaturaId: Number(assinaturaId),
      dataVencimento,
      dataPagamento,
      valorPago: Number(valorPago),
      ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
    }
    try {
      await api.registrarPagamento(input)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar o pagamento.')
    } finally {
      submitLock.current = false
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar pagamento" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="pagamento-assinatura">Assinatura</label>
          <select id="pagamento-assinatura" required value={assinaturaId} onChange={(event) => setAssinaturaId(event.target.value)}>
            <option value="">Selecione uma assinatura</option>
            {assinaturas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pagamento-vencimento">Data de vencimento</label>
            <input id="pagamento-vencimento" type="date" required value={dataVencimento} onChange={(event) => setDataVencimento(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pagamento-data">Data efetiva do pagamento</label>
            <input id="pagamento-data" type="date" required value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pagamento-valor">Valor efetivamente pago</label>
          <div className="input-prefix"><span>R$</span><input id="pagamento-valor" type="number" min="0.01" step="0.01" required value={valorPago} onChange={(event) => setValorPago(event.target.value)} /></div>
        </div>
        <div className="field">
          <label htmlFor="pagamento-observacoes">Observações (opcional)</label>
          <textarea id="pagamento-observacoes" maxLength={500} value={observacoes} onChange={(event) => setObservacoes(event.target.value)} />
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button primary" disabled={busy || !assinaturas.length}>
            {busy ? 'Registrando…' : 'Registrar pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmPaymentForm({ pagamento, busy, onClose, onConfirm }: {
  pagamento: Pagamento
  busy: boolean
  onClose: () => void
  onConfirm: (input: ConfirmarPagamentoInput) => void
}) {
  const [dataPagamento, setDataPagamento] = useState(todayInputDate())
  const [valorPago, setValorPago] = useState(pagamento.valorPrevisto == null ? '' : String(pagamento.valorPrevisto))
  const [observacoes, setObservacoes] = useState(pagamento.observacoes || '')

  return (
    <Modal title="Confirmar pagamento" onClose={onClose}>
      <form className="form" onSubmit={(event) => {
        event.preventDefault()
        onConfirm({
          ...(dataPagamento ? { dataPagamento } : {}),
          ...(valorPago ? { valorPago: Number(valorPago) } : {}),
          ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
        })
      }}>
        <p className="dialog-context">{pagamento.assinaturaNome} · vencimento em {formatDate(pagamento.dataVencimento)}</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="confirmacao-data">Data efetiva</label>
            <input id="confirmacao-data" type="date" required value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="confirmacao-valor">Valor cobrado</label>
            <div className="input-prefix"><span>R$</span><input id="confirmacao-valor" type="number" min="0.01" step="0.01" required value={valorPago} onChange={(event) => setValorPago(event.target.value)} /></div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="confirmacao-observacoes">Observações (opcional)</label>
          <textarea id="confirmacao-observacoes" maxLength={500} value={observacoes} onChange={(event) => setObservacoes(event.target.value)} />
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? 'Confirmando…' : 'Confirmar pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function MediaForm({ midia, assinaturas, onClose, onSaved }: {
  midia: Midia | null
  assinaturas: Assinatura[]
  onClose: () => void
  onSaved: (feedback?: string) => void
}) {
  const [tipo, setTipo] = useState<TipoMidia>(midia?.tipo || 'ANIME')
  const [titulo, setTitulo] = useState(midia?.titulo || '')
  const [status, setStatus] = useState<StatusMidia | ''>(midia?.status || '')
  const [nota, setNota] = useState(midia?.nota != null ? String(midia.nota) : '')
  const [assinaturaId, setAssinaturaId] = useState(midia?.assinaturaId ? String(midia.assinaturaId) : '')
  const [episodios, setEpisodios] = useState(midia?.episodiosAssistidos != null ? String(midia.episodiosAssistidos) : '')
  const [total, setTotal] = useState(midia?.totalEpisodios != null ? String(midia.totalEpisodios) : '')
  const [horas, setHoras] = useState(midia?.horasJogadas != null ? String(midia.horasJogadas) : '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitLock = useRef(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitLock.current) return
    submitLock.current = true
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
      const saved = midia
        ? await api.atualizarMidia(midia.id, input)
        : await api.criarMidia(input)
      if (imageFile) {
        try {
          await api.enviarImagemMidia(saved.id, imageFile)
        } catch (imageError) {
          onSaved(`Mídia salva, mas a imagem não foi enviada: ${imageError instanceof Error ? imageError.message : 'tente novamente ao editar a mídia.'}`)
          return
        }
      } else if (removeImage && midia?.imagemUrl) {
        try {
          await api.removerImagemMidia(saved.id)
        } catch (imageError) {
          onSaved(`Mídia salva, mas a imagem não foi removida: ${imageError instanceof Error ? imageError.message : 'tente novamente ao editar a mídia.'}`)
          return
        }
      }
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.campos || {})
      } else setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      submitLock.current = false
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
        <ImagePicker
          currentImageUrl={midia?.imagemUrl || null}
          alt={`Pré-visualização da capa de ${titulo || 'mídia'}`}
          kind="media"
          file={imageFile}
          onFileChange={setImageFile}
          removalRequested={removeImage}
          onRemovalRequestedChange={setRemoveImage}
          disabled={busy}
        />
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
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? imageFile || removeImage ? 'Salvando imagem…' : 'Salvando…' : midia ? 'Salvar alterações' : 'Cadastrar'}
          </button>
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

function SubscriptionForm({ assinatura, onClose, onSaved }: {
  assinatura: Assinatura | null
  onClose: () => void
  onSaved: (feedback?: string) => void
}) {
  const [tipo, setTipo] = useState<TipoAssinatura>(assinatura?.tipo || 'STREAMING')
  const [nome, setNome] = useState(assinatura?.nome || '')
  const [valor, setValor] = useState(assinatura ? String(assinatura.valor) : '')
  const [ciclo, setCiclo] = useState<AssinaturaInput['ciclo']>(assinatura?.ciclo || 'MENSAL')
  const [vencimento, setVencimento] = useState(assinatura?.proximoVencimento || '')
  const [pessoas, setPessoas] = useState(assinatura?.pessoasNoPlano ? String(assinatura.pessoasNoPlano) : '')
  const [desconto, setDesconto] = useState(assinatura?.percentualDesconto != null ? String(assinatura.percentualDesconto) : '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitLock = useRef(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitLock.current) return
    submitLock.current = true
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
      const saved = assinatura
        ? await api.atualizarAssinatura(assinatura.id, input)
        : await api.criarAssinatura(input)
      if (imageFile) {
        try {
          await api.enviarImagemAssinatura(saved.id, imageFile)
        } catch (imageError) {
          onSaved(`Assinatura salva, mas a imagem não foi enviada: ${imageError instanceof Error ? imageError.message : 'tente novamente ao editar a assinatura.'}`)
          return
        }
      } else if (removeImage && assinatura?.imagemUrl) {
        try {
          await api.removerImagemAssinatura(saved.id)
        } catch (imageError) {
          onSaved(`Assinatura salva, mas a imagem não foi removida: ${imageError instanceof Error ? imageError.message : 'tente novamente ao editar a assinatura.'}`)
          return
        }
      }
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.campos || {})
      } else setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      submitLock.current = false
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
        <ImagePicker
          currentImageUrl={assinatura?.imagemUrl || null}
          alt={`Pré-visualização do logo de ${nome || 'assinatura'}`}
          kind="subscription"
          file={imageFile}
          onFileChange={setImageFile}
          removalRequested={removeImage}
          onRemovalRequestedChange={setRemoveImage}
          disabled={busy}
        />
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
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? imageFile || removeImage ? 'Salvando imagem…' : 'Salvando…' : assinatura ? 'Salvar alterações' : 'Cadastrar'}
          </button>
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
                <EntityArtwork
                  className="media-cover"
                  imageUrl={midia.imagemUrl}
                  alt={`Capa de ${midia.titulo}`}
                  fallback={midia.tipo === 'ANIME' ? 'AN' : 'JG'}
                />
                <div className="media-content">
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
          onSaved={(feedback) => { setForm(null); setToast(feedback || (form === 'new' ? 'Mídia cadastrada.' : 'Mídia atualizada.')); reload() }}
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
