package br.com.gabriel.subvalt.dto.response;

import br.com.gabriel.subvalt.model.enums.StatusMidia;
import br.com.gabriel.subvalt.model.enums.TipoMidia;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MidiaResponseDTO {

    private Long id;
    private TipoMidia tipo;
    private String titulo;
    private StatusMidia status;
    private Double nota;

    // Texto montado pela própria entidade, por exemplo "12/24 episódios" ou "35h jogadas"
    private String descricaoProgresso;

    // Nulos quando a mídia não está ligada a nenhuma assinatura
    private Long assinaturaId;
    private String assinaturaNome;

    // Específicos de cada tipo; vêm nulos quando não se aplicam
    private Integer episodiosAssistidos;
    private Integer totalEpisodios;
    private Integer horasJogadas;
}
