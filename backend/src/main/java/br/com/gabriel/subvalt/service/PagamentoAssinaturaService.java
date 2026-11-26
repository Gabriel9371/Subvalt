package br.com.gabriel.subvalt.service;

import br.com.gabriel.subvalt.dto.request.ConfirmarPagamentoRequestDTO;
import br.com.gabriel.subvalt.dto.request.RegistrarPagamentoRequestDTO;
import br.com.gabriel.subvalt.dto.response.GastoMensalDTO;
import br.com.gabriel.subvalt.dto.response.GastoPorAssinaturaDTO;
import br.com.gabriel.subvalt.dto.response.GastoPorTipoDTO;
import br.com.gabriel.subvalt.dto.response.PagamentoResponseDTO;
import br.com.gabriel.subvalt.dto.response.ResumoFinanceiroDTO;
import br.com.gabriel.subvalt.dto.response.ResumoPagamentoAssinaturaDTO;
import br.com.gabriel.subvalt.exception.RecursoNaoEncontradoException;
import br.com.gabriel.subvalt.mapper.PagamentoAssinaturaMapper;
import br.com.gabriel.subvalt.model.Assinatura;
import br.com.gabriel.subvalt.model.PagamentoAssinatura;
import br.com.gabriel.subvalt.model.enums.StatusPagamento;
import br.com.gabriel.subvalt.model.enums.TipoAssinatura;
import br.com.gabriel.subvalt.repository.AssinaturaRepository;
import br.com.gabriel.subvalt.repository.PagamentoAssinaturaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PagamentoAssinaturaService {

    private static final int MESES_PREVISAO = 12;

    private final PagamentoAssinaturaRepository pagamentoRepository;
    private final AssinaturaRepository assinaturaRepository;
    private final PagamentoAssinaturaMapper pagamentoMapper;

    @Transactional
    public void gerarPrevisoes(Assinatura assinatura) {
        if (assinatura.isAtiva()) {
            criarPrevisoesAteHorizonte(assinatura);
        }
    }

    @Transactional
    public void reconciliarPrevisoes(Assinatura assinatura) {
        pagamentoRepository.excluirPrevisoesFuturas(
                assinatura.getId(), StatusPagamento.PENDENTE, LocalDate.now());
        gerarPrevisoes(assinatura);
    }

    @Transactional
    public void manterPrevisoesAposRenovacao(Assinatura assinatura, LocalDate vencimentoRenovado) {
        LocalDate hoje = LocalDate.now();
        LocalDate preservarAte = vencimentoRenovado.isAfter(hoje) ? vencimentoRenovado : hoje;
        pagamentoRepository.excluirPrevisoesFuturas(
                assinatura.getId(), StatusPagamento.PENDENTE, preservarAte);
        gerarPrevisoes(assinatura);
    }

    @Transactional
    public void cancelarPrevisoesFuturas(Assinatura assinatura) {
        pagamentoRepository.excluirPrevisoesFuturas(
                assinatura.getId(), StatusPagamento.PENDENTE, LocalDate.now());
    }

    @Transactional
    public PagamentoResponseDTO registrar(RegistrarPagamentoRequestDTO dto) {
        Assinatura assinatura = assinaturaRepository.findById(dto.getAssinaturaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Assinatura não encontrada: " + dto.getAssinaturaId()));
        PagamentoAssinatura pagamento = pagamentoRepository
                .findByAssinaturaIdAndDataVencimento(dto.getAssinaturaId(), dto.getDataVencimento())
                .orElse(null);

        if (pagamento == null) {
            pagamento = PagamentoAssinatura.pagamentoManual(
                    assinatura, dto.getDataVencimento(), dto.getDataPagamento(),
                    dto.getValorPago(), dto.getObservacoes());
        } else {
            pagamento.confirmar(dto.getDataPagamento(), dto.getValorPago(), dto.getObservacoes());
        }
        return pagamentoMapper.toResponse(pagamentoRepository.save(pagamento));
    }

    @Transactional
    public PagamentoResponseDTO confirmar(Long id, ConfirmarPagamentoRequestDTO dto) {
        PagamentoAssinatura pagamento = buscarPagamento(id);
        atualizarAtrasados();
        pagamento.confirmar(
                dto.getDataPagamento() == null ? LocalDate.now() : dto.getDataPagamento(),
                dto.getValorPago(),
                dto.getObservacoes());
        return pagamentoMapper.toResponse(pagamento);
    }

    @Transactional
    public List<PagamentoResponseDTO> listar(LocalDate inicio, LocalDate fim,
                                              Long assinaturaId, StatusPagamento status) {
        validarPeriodo(inicio, fim);
        sincronizarPrevisoesAtivas();
        atualizarAtrasados();

        return pagamentoRepository.findAll().stream()
                .filter(p -> inicio == null || !p.getDataVencimento().isBefore(inicio))
                .filter(p -> fim == null || !p.getDataVencimento().isAfter(fim))
                .filter(p -> assinaturaId == null || p.getAssinaturaIdOrigem().equals(assinaturaId))
                .filter(p -> status == null || p.getStatus() == status)
                .sorted(Comparator.comparing(PagamentoAssinatura::getDataVencimento).reversed())
                .map(pagamentoMapper::toResponse)
                .toList();
    }

    @Transactional
    public ResumoFinanceiroDTO resumoFinanceiro() {
        sincronizarPrevisoesAtivas();
        atualizarAtrasados();

        LocalDate hoje = LocalDate.now();
        YearMonth mesAtual = YearMonth.from(hoje);
        YearMonth mesAnterior = mesAtual.minusMonths(1);
        LocalDate inicioAno = hoje.withDayOfYear(1);
        LocalDate fimPrevisao = hoje.plusDays(30);
        List<PagamentoAssinatura> pagamentos = pagamentoRepository.findAll();

        BigDecimal pagoMes = totalPago(pagamentos, mesAtual.atDay(1), mesAtual.atEndOfMonth());
        BigDecimal pagoAno = totalPago(pagamentos, inicioAno, hoje);
        BigDecimal pagoMesAnterior = totalPago(
                pagamentos, mesAnterior.atDay(1), mesAnterior.atEndOfMonth());
        BigDecimal variacao = pagoMes.subtract(pagoMesAnterior);
        BigDecimal percentual = pagoMesAnterior.signum() == 0
                ? null
                : variacao.multiply(BigDecimal.valueOf(100))
                        .divide(pagoMesAnterior, 1, RoundingMode.HALF_UP);

        List<PagamentoAssinatura> pendentes = pagamentos.stream()
                .filter(p -> p.getStatus() == StatusPagamento.PENDENTE)
                .toList();
        List<PagamentoAssinatura> atrasados = pagamentos.stream()
                .filter(p -> p.getStatus() == StatusPagamento.ATRASADO)
                .toList();
        BigDecimal totalPendente = somarPrevisto(pendentes);
        BigDecimal totalAtrasado = somarPrevisto(atrasados);
        BigDecimal previsao30Dias = somarPrevisto(pendentes.stream()
                .filter(p -> !p.getDataVencimento().isBefore(hoje)
                        && !p.getDataVencimento().isAfter(fimPrevisao))
                .toList());

        return ResumoFinanceiroDTO.builder()
                .totalPagoMes(pagoMes)
                .totalPagoAno(pagoAno)
                .totalMesAnterior(pagoMesAnterior)
                .variacaoMes(variacao)
                .variacaoPercentual(percentual)
                .despesasPendentes(totalPendente)
                .quantidadePendentes(pendentes.size())
                .despesasAtrasadas(totalAtrasado)
                .quantidadeAtrasadas(atrasados.size())
                .previsaoProximos30Dias(previsao30Dias)
                .gastosMensais(evolucaoMensal(pagamentos, mesAtual))
                .gastosPorTipo(gastosPorTipo(pagamentos, inicioAno, hoje))
                .gastosPorAssinatura(gastosPorAssinatura(pagamentos, inicioAno, hoje))
                .proximasCobrancas(proximasCobrancas(pagamentos, hoje, fimPrevisao))
                .build();
    }

    @Transactional
    public List<ResumoPagamentoAssinaturaDTO> resumosPorAssinatura() {
        atualizarAtrasados();
        List<PagamentoAssinatura> pagos = pagamentoRepository.findAll().stream()
                .filter(p -> p.getStatus() == StatusPagamento.PAGO && p.getAssinatura() != null)
                .toList();
        Map<Long, List<PagamentoAssinatura>> porAssinatura = new HashMap<>();
        for (PagamentoAssinatura pagamento : pagos) {
            porAssinatura.computeIfAbsent(pagamento.getAssinatura().getId(), ignored -> new ArrayList<>())
                    .add(pagamento);
        }
        return assinaturaRepository.findAll().stream()
                .map(assinatura -> resumoDaAssinatura(assinatura, porAssinatura.get(assinatura.getId())))
                .toList();
    }

    private ResumoPagamentoAssinaturaDTO resumoDaAssinatura(
            Assinatura assinatura, List<PagamentoAssinatura> pagamentos) {
        List<PagamentoAssinatura> lista = pagamentos == null ? List.of() : pagamentos;
        BigDecimal total = lista.stream()
                .map(PagamentoAssinatura::getValorPago)
                .filter(valor -> valor != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDate ultimo = lista.stream()
                .map(PagamentoAssinatura::getDataPagamento)
                .filter(data -> data != null)
                .max(LocalDate::compareTo)
                .orElse(null);
        return ResumoPagamentoAssinaturaDTO.builder()
                .assinaturaId(assinatura.getId())
                .totalPago(total)
                .pagamentosRealizados(lista.size())
                .ultimoPagamento(ultimo)
                .proximoVencimento(assinatura.getProximoVencimento())
                .build();
    }

    private List<GastoMensalDTO> evolucaoMensal(
            List<PagamentoAssinatura> pagamentos, YearMonth mesAtual) {
        List<GastoMensalDTO> resultado = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            YearMonth mes = mesAtual.minusMonths(i);
            resultado.add(GastoMensalDTO.builder()
                    .periodo(mes.toString())
                    .totalPago(totalPago(pagamentos, mes.atDay(1), mes.atEndOfMonth()))
                    .build());
        }
        return resultado;
    }

    private List<GastoPorTipoDTO> gastosPorTipo(
            List<PagamentoAssinatura> pagamentos, LocalDate inicio, LocalDate fim) {
        Map<TipoAssinatura, BigDecimal> totais = new HashMap<>();
        for (PagamentoAssinatura pagamento : pagamentosPagosNoPeriodo(pagamentos, inicio, fim)) {
            totais.merge(pagamento.getTipoAssinatura(), pagamento.getValorPago(), BigDecimal::add);
        }
        return List.of(TipoAssinatura.STREAMING, TipoAssinatura.SOFTWARE).stream()
                .map(tipo -> GastoPorTipoDTO.builder()
                        .tipo(tipo)
                        .totalPago(totais.getOrDefault(tipo, BigDecimal.ZERO))
                        .build())
                .toList();
    }

    private List<GastoPorAssinaturaDTO> gastosPorAssinatura(
            List<PagamentoAssinatura> pagamentos, LocalDate inicio, LocalDate fim) {
        Map<String, GastoPorAssinaturaDTO> totais = new HashMap<>();
        for (PagamentoAssinatura pagamento : pagamentosPagosNoPeriodo(pagamentos, inicio, fim)) {
            Assinatura assinatura = pagamento.getAssinatura();
            Long id = assinatura == null ? null : assinatura.getId();
            String chave = id == null
                    ? pagamento.getTipoAssinatura() + ":" + pagamento.getAssinaturaNome()
                    : id.toString();
            GastoPorAssinaturaDTO atual = totais.get(chave);
            BigDecimal valorAtual = atual == null ? BigDecimal.ZERO : atual.getTotalPago();
            String imagemUrl = assinatura == null || assinatura.getImagemKey() == null
                    ? null
                    : "/api/assinaturas/" + id + "/imagem?v=" + assinatura.getImagemKey();
            totais.put(chave, GastoPorAssinaturaDTO.builder()
                    .assinaturaId(id)
                    .nome(pagamento.getAssinaturaNome())
                    .tipo(pagamento.getTipoAssinatura())
                    .imagemUrl(imagemUrl)
                    .totalPago(valorAtual.add(pagamento.getValorPago()))
                    .build());
        }
        return totais.values().stream()
                .sorted(Comparator.comparing(GastoPorAssinaturaDTO::getTotalPago).reversed())
                .toList();
    }

    private List<PagamentoResponseDTO> proximasCobrancas(
            List<PagamentoAssinatura> pagamentos, LocalDate hoje, LocalDate fim) {
        return pagamentos.stream()
                .filter(p -> p.getStatus() == StatusPagamento.PENDENTE)
                .filter(p -> !p.getDataVencimento().isBefore(hoje)
                        && !p.getDataVencimento().isAfter(fim))
                .sorted(Comparator.comparing(PagamentoAssinatura::getDataVencimento))
                .limit(10)
                .map(pagamentoMapper::toResponse)
                .toList();
    }

    private BigDecimal totalPago(
            List<PagamentoAssinatura> pagamentos, LocalDate inicio, LocalDate fim) {
        return pagamentosPagosNoPeriodo(pagamentos, inicio, fim).stream()
                .map(PagamentoAssinatura::getValorPago)
                .filter(valor -> valor != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<PagamentoAssinatura> pagamentosPagosNoPeriodo(
            List<PagamentoAssinatura> pagamentos, LocalDate inicio, LocalDate fim) {
        return pagamentos.stream()
                .filter(p -> p.getStatus() == StatusPagamento.PAGO)
                .filter(p -> p.getDataPagamento() != null
                        && !p.getDataPagamento().isBefore(inicio)
                        && !p.getDataPagamento().isAfter(fim))
                .toList();
    }

    private BigDecimal somarPrevisto(List<PagamentoAssinatura> pagamentos) {
        return pagamentos.stream()
                .map(PagamentoAssinatura::getValorPrevisto)
                .filter(valor -> valor != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void atualizarAtrasados() {
        List<PagamentoAssinatura> vencidos = pagamentoRepository.findByStatusAndDataVencimentoBefore(
                StatusPagamento.PENDENTE, LocalDate.now());
        vencidos.forEach(PagamentoAssinatura::marcarAtrasado);
        pagamentoRepository.saveAll(vencidos);
    }

    private void sincronizarPrevisoesAtivas() {
        LocalDate horizonte = LocalDate.now().plusMonths(MESES_PREVISAO);
        for (Assinatura assinatura : assinaturaRepository.findByAtivaTrue()) {
            criarPrevisoesAteHorizonte(assinatura, horizonte);
        }
    }

    private void criarPrevisoesAteHorizonte(Assinatura assinatura) {
        criarPrevisoesAteHorizonte(assinatura, LocalDate.now().plusMonths(MESES_PREVISAO));
    }

    private void criarPrevisoesAteHorizonte(Assinatura assinatura, LocalDate horizonte) {
        if (!assinatura.isAtiva()) {
            return;
        }
        LocalDate hoje = LocalDate.now();
        LocalDate data = assinatura.getProximoVencimento();
        LocalDate dataMinima = hoje.minusMonths(MESES_PREVISAO);
        int ciclosIgnorados = 0;
        while (data.isBefore(dataMinima) && ciclosIgnorados < 240) {
            data = data.plusMonths(assinatura.getCiclo().getMeses());
            ciclosIgnorados++;
        }
        while (!data.isAfter(horizonte)) {
            if (!pagamentoRepository.existsByAssinaturaIdAndDataVencimento(
                    assinatura.getId(), data)) {
                pagamentoRepository.save(PagamentoAssinatura.previsao(assinatura, data));
            }
            data = data.plusMonths(assinatura.getCiclo().getMeses());
        }
    }

    private PagamentoAssinatura buscarPagamento(Long id) {
        return pagamentoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Pagamento não encontrado: " + id));
    }

    private void validarPeriodo(LocalDate inicio, LocalDate fim) {
        if (inicio != null && fim != null && inicio.isAfter(fim)) {
            throw new IllegalArgumentException("A data inicial deve ser anterior ou igual à data final.");
        }
    }
}
