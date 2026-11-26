package br.com.gabriel.subvalt.model;

import br.com.gabriel.subvalt.model.enums.CicloCobranca;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Entity
@DiscriminatorValue("SOFTWARE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AssinaturaSoftware extends Assinatura {

    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    @Column(name = "percentual_desconto", precision = 5, scale = 2)
    private BigDecimal percentualDesconto;

    public AssinaturaSoftware(String nome, BigDecimal valor, CicloCobranca ciclo,
                              LocalDate proximoVencimento, BigDecimal percentualDesconto) {
        super(nome, valor, ciclo, proximoVencimento);
        setPercentualDesconto(percentualDesconto);
    }

    public void setPercentualDesconto(BigDecimal percentualDesconto) {
        if (percentualDesconto == null
                || percentualDesconto.signum() < 0
                || percentualDesconto.compareTo(CEM) > 0) {
            throw new IllegalArgumentException("O desconto deve estar entre 0 e 100.");
        }
        this.percentualDesconto = percentualDesconto;
    }

    /** Aplica o desconto (por exemplo, o de estudante) sobre o valor mensal. */
    @Override
    public BigDecimal custoMensal() {
        BigDecimal fator = CEM.subtract(percentualDesconto).divide(CEM);
        return valorBaseMensal().multiply(fator).setScale(2, RoundingMode.HALF_UP);
    }
}
