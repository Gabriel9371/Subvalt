package br.com.gabriel.subvalt.dto.response;

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
public class ResumoPagamentoAssinaturaDTO {

    private Long assinaturaId;
    private BigDecimal totalPago;
    private long pagamentosRealizados;
    private LocalDate ultimoPagamento;
    private LocalDate proximoVencimento;
}
