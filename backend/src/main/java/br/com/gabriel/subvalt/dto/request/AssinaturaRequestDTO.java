package br.com.gabriel.subvalt.dto.request;

import br.com.gabriel.subvalt.model.enums.CicloCobranca;
import br.com.gabriel.subvalt.model.enums.TipoAssinatura;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class AssinaturaRequestDTO {

    @NotNull(message = "O tipo é obrigatório")
    private TipoAssinatura tipo;

    @NotBlank(message = "O nome é obrigatório")
    @Size(max = 100, message = "O nome pode ter no máximo 100 caracteres")
    private String nome;

    @NotNull(message = "O valor é obrigatório")
    @Positive(message = "O valor deve ser maior que zero")
    private BigDecimal valor;

    @NotNull(message = "O ciclo de cobrança é obrigatório")
    private CicloCobranca ciclo;

    @NotNull(message = "O próximo vencimento é obrigatório")
    private LocalDate proximoVencimento;

    // Usado só quando tipo = STREAMING
    @Min(value = 1, message = "O plano precisa ter pelo menos 1 pessoa")
    private Integer pessoasNoPlano;

    // Usado só quando tipo = SOFTWARE
    @DecimalMin(value = "0.0", message = "O desconto não pode ser negativo")
    @DecimalMax(value = "100.0", message = "O desconto não pode passar de 100")
    private BigDecimal percentualDesconto;
}
