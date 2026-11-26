package br.com.gabriel.subvalt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumoAssinaturasResponseDTO {

    private BigDecimal gastoMensalTotal;
    private BigDecimal gastoAnualEstimado;
    private int quantidadeAtivas;
    private int quantidadeVencendoEm7Dias;
    private ResumoFinanceiroDTO financeiro;
}
