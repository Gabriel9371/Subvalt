package br.com.gabriel.subvalt.dto.response;

import br.com.gabriel.subvalt.model.enums.StatusPagamento;
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
public class PagamentoResponseDTO {

    private Long id;
    private Long assinaturaId;
    private String assinaturaNome;
    private TipoAssinatura tipoAssinatura;
    private String imagemUrl;
    private LocalDate dataVencimento;
    private LocalDate dataPagamento;
    private BigDecimal valorPrevisto;
    private BigDecimal valorPago;
    private StatusPagamento status;
    private boolean previsao;
    private String observacoes;
}
