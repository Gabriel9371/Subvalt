package br.com.gabriel.subvalt.mapper;

import br.com.gabriel.subvalt.dto.request.MidiaRequestDTO;
import br.com.gabriel.subvalt.dto.response.MidiaResponseDTO;
import br.com.gabriel.subvalt.model.Anime;
import br.com.gabriel.subvalt.model.Assinatura;
import br.com.gabriel.subvalt.model.Jogo;
import br.com.gabriel.subvalt.model.Midia;
import br.com.gabriel.subvalt.model.enums.TipoMidia;
import org.springframework.stereotype.Component;

@Component
public class MidiaMapper {

    /**
     * DTO → entidade nova. A assinatura já chega resolvida (ou nula):
     * quem busca no banco é o service, o mapper só converte.
     */
    public Midia toEntity(MidiaRequestDTO dto, Assinatura assinatura) {
        Midia midia = switch (dto.getTipo()) {
            case ANIME -> new Anime(
                    dto.getTitulo(),
                    dto.getStatus(),
                    valorOuZero(dto.getEpisodiosAssistidos()),
                    dto.getTotalEpisodios());
            case JOGO -> new Jogo(
                    dto.getTitulo(),
                    dto.getStatus(),
                    valorOuZero(dto.getHorasJogadas()));
        };

        midia.setNota(dto.getNota());
        midia.setAssinatura(assinatura);
        return midia;
    }

    /** Copia os dados do DTO para uma entidade que já existe (usado no PUT). */
    public void atualizarEntidade(Midia entidade, MidiaRequestDTO dto, Assinatura assinatura) {
        if (tipoDe(entidade) != dto.getTipo()) {
            throw new IllegalArgumentException(
                    "Não é possível alterar o tipo de uma mídia já criada.");
        }

        entidade.setTitulo(dto.getTitulo());
        if (dto.getStatus() != null) {
            entidade.setStatus(dto.getStatus());
        }
        entidade.setNota(dto.getNota());
        entidade.setAssinatura(assinatura);

        if (entidade instanceof Anime anime) {
            // A ordem importa: o total é definido antes, porque a validação
            // dos episódios assistidos compara com ele
            anime.setTotalEpisodios(dto.getTotalEpisodios());
            anime.setEpisodiosAssistidos(valorOuZero(dto.getEpisodiosAssistidos()));
        } else if (entidade instanceof Jogo jogo) {
            jogo.setHorasJogadas(valorOuZero(dto.getHorasJogadas()));
        }
    }

    /** Entidade → DTO de resposta. */
    public MidiaResponseDTO toResponse(Midia entidade) {
        var resposta = MidiaResponseDTO.builder()
                .id(entidade.getId())
                .tipo(tipoDe(entidade))
                .titulo(entidade.getTitulo())
                .status(entidade.getStatus())
                .nota(entidade.getNota())
                .imagemUrl(entidade.getImagemKey() == null
                        ? null
                        : "/api/midias/" + entidade.getId() + "/imagem?v=" + entidade.getImagemKey())
                .descricaoProgresso(entidade.descricaoProgresso());

        Assinatura assinatura = entidade.getAssinatura();
        if (assinatura != null) {
            resposta.assinaturaId(assinatura.getId());
            resposta.assinaturaNome(assinatura.getNome());
        }

        if (entidade instanceof Anime anime) {
            resposta.episodiosAssistidos(anime.getEpisodiosAssistidos());
            resposta.totalEpisodios(anime.getTotalEpisodios());
        } else if (entidade instanceof Jogo jogo) {
            resposta.horasJogadas(jogo.getHorasJogadas());
        }

        return resposta.build();
    }

    // ---------- Auxiliares ----------

    private TipoMidia tipoDe(Midia midia) {
        if (midia instanceof Anime) {
            return TipoMidia.ANIME;
        }
        if (midia instanceof Jogo) {
            return TipoMidia.JOGO;
        }
        throw new IllegalStateException(
                "Tipo de mídia desconhecido: " + midia.getClass().getSimpleName());
    }

    private int valorOuZero(Integer valor) {
        return valor == null ? 0 : valor;
    }
}
