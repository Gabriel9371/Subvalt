package br.com.gabriel.subvalt.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class RegistrarPagamentoRequestDTO {

    @NotNull(message = "A assinatura é obrigatória")
    private Long assinaturaId;

    @NotNull(message = "A data de vencimento é obrigatória")
    private LocalDate dataVencimento;

    @NotNull(message = "A data do pagamento é obrigatória")
    private LocalDate dataPagamento;

    @NotNull(message = "O valor pago é obrigatório")
    @DecimalMin(value = "0.01", message = "O valor pago deve ser maior que zero")
    private BigDecimal valorPago;

    @Size(max = 500, message = "As observações podem ter no máximo 500 caracteres")
    private String observacoes;
}
