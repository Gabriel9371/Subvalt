package br.com.gabriel.subvalt.dto.request;

import br.com.gabriel.subvalt.model.enums.StatusMidia;
import br.com.gabriel.subvalt.model.enums.TipoMidia;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MidiaRequestDTO {

    @NotNull(message = "O tipo é obrigatório")
    private TipoMidia tipo;

    @NotBlank(message = "O título é obrigatório")
    @Size(max = 150, message = "O título pode ter no máximo 150 caracteres")
    private String titulo;

    // Opcional: se não vier, a mídia nasce como QUERO_CONSUMIR
    private StatusMidia status;

    @DecimalMin(value = "0.0", message = "A nota não pode ser negativa")
    @DecimalMax(value = "10.0", message = "A nota não pode passar de 10")
    private Double nota;

    // Opcional: id da assinatura em que a mídia está disponível
    private Long assinaturaId;

    // Usados só quando tipo = ANIME
    @PositiveOrZero(message = "Os episódios assistidos não podem ser negativos")
    private Integer episodiosAssistidos;

    @Positive(message = "O total de episódios deve ser pelo menos 1")
    private Integer totalEpisodios;

    // Usado só quando tipo = JOGO
    @PositiveOrZero(message = "As horas jogadas não podem ser negativas")
    private Integer horasJogadas;
}
