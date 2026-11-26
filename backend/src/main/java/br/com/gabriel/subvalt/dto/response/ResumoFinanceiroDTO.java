package br.com.gabriel.subvalt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumoFinanceiroDTO {

    private BigDecimal totalPagoMes;
    private BigDecimal totalPagoAno;
    private BigDecimal totalMesAnterior;
    private BigDecimal variacaoMes;
    private BigDecimal variacaoPercentual;
    private BigDecimal despesasPendentes;
    private long quantidadePendentes;
    private BigDecimal despesasAtrasadas;
    private long quantidadeAtrasadas;
    private BigDecimal previsaoProximos30Dias;
    private List<GastoMensalDTO> gastosMensais;
    private List<GastoPorTipoDTO> gastosPorTipo;
    private List<GastoPorAssinaturaDTO> gastosPorAssinatura;
    private List<PagamentoResponseDTO> proximasCobrancas;
}
