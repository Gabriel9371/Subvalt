package br.com.gabriel.subvalt.model;

import br.com.gabriel.subvalt.model.enums.CicloCobranca;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.NonNull;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "assinaturas")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "tipo", discriminatorType = DiscriminatorType.STRING, length = 20)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter 
@Setter 
public abstract class Assinatura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @NonNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private CicloCobranca ciclo;

    @NonNull
    @Column(name = "proximo_vencimento", nullable = false)
    private LocalDate proximoVencimento;

    @Column(nullable = false)
    private boolean ativa = true;

    @Column(name = "imagem_key", length = 80)
    private String imagemKey;

    @OneToMany(mappedBy = "assinatura")
    private List<Midia> midias = new ArrayList<>();

    @OneToMany(mappedBy = "assinatura")
    private List<PagamentoAssinatura> pagamentos = new ArrayList<>();

    // O construtor passa pelos setters, então toda regra de validação
    // vale na criação e também nas atualizações
    protected Assinatura(String nome, BigDecimal valor, CicloCobranca ciclo, LocalDate proximoVencimento) {
        setNome(nome);
        setValor(valor);
        setCiclo(ciclo);
        setProximoVencimento(proximoVencimento);
    }

    public void setNome(String nome) {
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("O nome da assinatura é obrigatório.");
        }
        this.nome = nome.trim();
    }

    public void setValor(BigDecimal valor) {
        if (valor == null || valor.signum() <= 0) {
            throw new IllegalArgumentException("O valor da assinatura deve ser maior que zero.");
        }
        this.valor = valor;
    }

    // ---------- Regras de negócio ----------

    protected BigDecimal valorBaseMensal() {
        return valor.divide(BigDecimal.valueOf(ciclo.getMeses()), 4, RoundingMode.HALF_UP);
    }

    public abstract BigDecimal custoMensal();

    public long diasParaVencer() {
        return ChronoUnit.DAYS.between(LocalDate.now(), proximoVencimento);
    }

    public boolean estaVencida() {
        return diasParaVencer() < 0;
    }

    /** Avança o vencimento pelo número de meses do ciclo. */
    public void renovar() {
        if (!ativa) {
            throw new IllegalStateException("Não é possível renovar uma assinatura cancelada.");
        }
        this.proximoVencimento = proximoVencimento.plusMonths(ciclo.getMeses());
    }

    public void desvincularMidias() {
        for (Midia midia : midias) {
            midia.setAssinatura(null);
        }
        midias.clear();
    }

    public void desvincularPagamentos() {
        for (PagamentoAssinatura pagamento : pagamentos) {
            pagamento.setAssinatura(null);
        }
        pagamentos.clear();
    }
}
