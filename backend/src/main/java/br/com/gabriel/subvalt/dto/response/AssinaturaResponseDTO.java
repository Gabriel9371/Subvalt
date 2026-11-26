package br.com.gabriel.subvalt.dto.response;

import br.com.gabriel.subvalt.model.enums.CicloCobranca;
import br.com.gabriel.subvalt.model.enums.TipoAssinatura;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssinaturaResponseDTO {

    private Long id;
    private TipoAssinatura tipo;
    private String nome;
    private BigDecimal valor;
    private CicloCobranca ciclo;
    private LocalDate proximoVencimento;
    private boolean ativa;
    private String imagemUrl;

    // Calculados pela regra de negócio da entidade (nada disso é gravado no banco)
    private BigDecimal custoMensal;
    private long diasParaVencer;
    private boolean vencida;

    // Específicos de cada tipo; vêm nulos quando não se aplicam
    private Integer pessoasNoPlano;
    private BigDecimal percentualDesconto;
}
