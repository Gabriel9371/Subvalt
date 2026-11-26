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
@DiscriminatorValue("STREAMING")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AssinaturaStreaming extends Assinatura {

    @Column(name = "pessoas_no_plano")
    private Integer pessoasNoPlano;

    public AssinaturaStreaming(String nome, BigDecimal valor, CicloCobranca ciclo,
                               LocalDate proximoVencimento, int pessoasNoPlano) {
        super(nome, valor, ciclo, proximoVencimento);
        setPessoasNoPlano(pessoasNoPlano);
    }

    public void setPessoasNoPlano(int pessoasNoPlano) {
        if (pessoasNoPlano < 1) {
            throw new IllegalArgumentException("O plano precisa ter pelo menos 1 pessoa.");
        }
        this.pessoasNoPlano = pessoasNoPlano;
    }

    /** Plano compartilhado: a conta é dividida entre as pessoas. */
    @Override
    public BigDecimal custoMensal() {
        return valorBaseMensal().divide(BigDecimal.valueOf(pessoasNoPlano), 2, RoundingMode.HALF_UP);
    }
}
