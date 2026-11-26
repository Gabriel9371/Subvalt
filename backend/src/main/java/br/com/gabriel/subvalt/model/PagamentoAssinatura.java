package br.com.gabriel.subvalt.model;

import br.com.gabriel.subvalt.model.enums.StatusPagamento;
import br.com.gabriel.subvalt.model.enums.TipoAssinatura;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "pagamentos_assinaturas", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_pagamento_assinatura_vencimento",
                columnNames = {"assinatura_id", "data_vencimento"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PagamentoAssinatura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assinatura_id")
    @Setter
    private Assinatura assinatura;

    @Column(name = "assinatura_id_origem", nullable = false)
    private Long assinaturaIdOrigem;

    @Column(name = "assinatura_nome", nullable = false, length = 100)
    private String assinaturaNome;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_assinatura", nullable = false, length = 15)
    private TipoAssinatura tipoAssinatura;

    @Column(name = "data_vencimento", nullable = false)
    private LocalDate dataVencimento;

    @Column(name = "data_pagamento")
    private LocalDate dataPagamento;

    @Column(name = "valor_previsto", precision = 10, scale = 2)
    private BigDecimal valorPrevisto;

    @Column(name = "valor_pago", precision = 10, scale = 2)
    private BigDecimal valorPago;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private StatusPagamento status;

    @Column(nullable = false)
    private boolean previsao;

    @Column(length = 500)
    private String observacoes;

    private PagamentoAssinatura(Assinatura assinatura, LocalDate dataVencimento,
                                BigDecimal valorPrevisto, StatusPagamento status, boolean previsao) {
        this.assinatura = assinatura;
        this.assinaturaIdOrigem = assinatura.getId();
        this.assinaturaNome = assinatura.getNome();
        this.tipoAssinatura = tipoDe(assinatura);
        this.dataVencimento = dataVencimento;
        this.valorPrevisto = valorPrevisto;
        this.status = status;
        this.previsao = previsao;
    }

    public static PagamentoAssinatura previsao(Assinatura assinatura, LocalDate dataVencimento) {
        return new PagamentoAssinatura(
                assinatura, dataVencimento, assinatura.getValor(), StatusPagamento.PENDENTE, true);
    }

    public static PagamentoAssinatura pagamentoManual(Assinatura assinatura, LocalDate dataVencimento,
                                                       LocalDate dataPagamento, BigDecimal valorPago,
                                                       String observacoes) {
        PagamentoAssinatura pagamento = new PagamentoAssinatura(
                assinatura, dataVencimento, null, StatusPagamento.PAGO, false);
        pagamento.dataPagamento = dataPagamento;
        pagamento.valorPago = validarValorPago(valorPago);
        pagamento.setObservacoes(observacoes);
        return pagamento;
    }

    public void confirmar(LocalDate dataPagamento, BigDecimal valorPago, String observacoes) {
        if (status == StatusPagamento.PAGO) {
            throw new IllegalStateException("Este pagamento já foi confirmado.");
        }
        if (dataPagamento == null) {
            throw new IllegalArgumentException("A data do pagamento é obrigatória.");
        }
        this.dataPagamento = dataPagamento;
        this.valorPago = validarValorPago(valorPago == null ? valorPrevisto : valorPago);
        this.status = StatusPagamento.PAGO;
        this.previsao = false;
        if (observacoes != null) {
            setObservacoes(observacoes);
        }
    }

    public void atualizarPrevisao(Assinatura assinatura) {
        if (status != StatusPagamento.PENDENTE || !previsao) {
            throw new IllegalStateException("Somente previsões pendentes podem ser atualizadas.");
        }
        this.assinatura = assinatura;
        this.assinaturaNome = assinatura.getNome();
        this.tipoAssinatura = tipoDe(assinatura);
        this.valorPrevisto = assinatura.getValor();
    }

    public void marcarAtrasado() {
        if (status == StatusPagamento.PENDENTE) {
            this.status = StatusPagamento.ATRASADO;
        }
    }

    public void setObservacoes(String observacoes) {
        if (observacoes != null && observacoes.length() > 500) {
            throw new IllegalArgumentException("As observações podem ter no máximo 500 caracteres.");
        }
        this.observacoes = observacoes == null || observacoes.isBlank() ? null : observacoes.trim();
    }

    private static BigDecimal validarValorPago(BigDecimal valor) {
        if (valor == null || valor.signum() <= 0) {
            throw new IllegalArgumentException("O valor pago deve ser maior que zero.");
        }
        return valor;
    }

    private static TipoAssinatura tipoDe(Assinatura assinatura) {
        if (assinatura instanceof AssinaturaStreaming) {
            return TipoAssinatura.STREAMING;
        }
        if (assinatura instanceof AssinaturaSoftware) {
            return TipoAssinatura.SOFTWARE;
        }
        throw new IllegalArgumentException("Tipo de assinatura desconhecido.");
    }
}
