package br.com.gabriel.subvalt.model;

import br.com.gabriel.subvalt.model.enums.StatusMidia;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@DiscriminatorValue("ANIME")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Anime extends Midia {

    @Column(name = "episodios_assistidos")
    private Integer episodiosAssistidos;

    // Nulo quando o anime ainda está em exibição e o total é desconhecido
    @Column(name = "total_episodios")
    private Integer totalEpisodios;

    public Anime(String titulo, StatusMidia status, int episodiosAssistidos, Integer totalEpisodios) {
        super(titulo, status);
        setTotalEpisodios(totalEpisodios);
        setEpisodiosAssistidos(episodiosAssistidos);
    }

    public void setTotalEpisodios(Integer totalEpisodios) {
        if (totalEpisodios != null && totalEpisodios < 1) {
            throw new IllegalArgumentException("O total de episódios deve ser pelo menos 1.");
        }
        this.totalEpisodios = totalEpisodios;
    }

    public void setEpisodiosAssistidos(int episodiosAssistidos) {
        if (episodiosAssistidos < 0) {
            throw new IllegalArgumentException("Os episódios assistidos não podem ser negativos.");
        }
        if (totalEpisodios != null && episodiosAssistidos > totalEpisodios) {
            throw new IllegalArgumentException("Os episódios assistidos não podem passar do total.");
        }
        this.episodiosAssistidos = episodiosAssistidos;
    }

    /** Registra mais um episódio e ajusta o status sozinho. */
    public void assistirEpisodio() {
        if (totalEpisodios != null && episodiosAssistidos >= totalEpisodios) {
            throw new IllegalStateException("Todos os episódios já foram assistidos.");
        }
        episodiosAssistidos++;

        if (totalEpisodios != null && episodiosAssistidos.intValue() == totalEpisodios.intValue()) {
            setStatus(StatusMidia.CONCLUIDO);
        } else {
            setStatus(StatusMidia.EM_ANDAMENTO);
        }
    }

    @Override
    public String descricaoProgresso() {
        if (totalEpisodios == null) {
            return episodiosAssistidos + " episódios assistidos";
        }
        return episodiosAssistidos + "/" + totalEpisodios + " episódios";
    }
}
