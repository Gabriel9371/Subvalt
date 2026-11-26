package br.com.gabriel.subvalt.dto.response;

import br.com.gabriel.subvalt.model.enums.TipoAssinatura;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GastoPorAssinaturaDTO {

    private Long assinaturaId;
    private String nome;
    private TipoAssinatura tipo;
    private String imagemUrl;
    private BigDecimal totalPago;
}
