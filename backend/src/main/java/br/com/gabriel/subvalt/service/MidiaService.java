package br.com.gabriel.subvalt.service;

import br.com.gabriel.subvalt.dto.request.MidiaRequestDTO;
import br.com.gabriel.subvalt.dto.response.MidiaResponseDTO;
import br.com.gabriel.subvalt.exception.RecursoNaoEncontradoException;
import br.com.gabriel.subvalt.mapper.MidiaMapper;
import br.com.gabriel.subvalt.model.Anime;
import br.com.gabriel.subvalt.model.Assinatura;
import br.com.gabriel.subvalt.model.Jogo;
import br.com.gabriel.subvalt.model.Midia;
import br.com.gabriel.subvalt.model.enums.StatusMidia;
import br.com.gabriel.subvalt.repository.AssinaturaRepository;
import br.com.gabriel.subvalt.repository.MidiaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MidiaService {

    private final MidiaRepository midiaRepository;
    private final AssinaturaRepository assinaturaRepository;
    private final MidiaMapper midiaMapper;

    @Transactional
    public MidiaResponseDTO criar(MidiaRequestDTO dto) {
        Assinatura assinatura = resolverAssinatura(dto.getAssinaturaId());
        Midia midia = midiaMapper.toEntity(dto, assinatura);
        return midiaMapper.toResponse(midiaRepository.save(midia));
    }

    /** Filtros opcionais: com os dois nulos, devolve tudo. */
    @Transactional(readOnly = true)
    public List<MidiaResponseDTO> listar(StatusMidia status, Long assinaturaId) {
        List<Midia> midias;

        if (assinaturaId != null) {
            midias = midiaRepository.findByAssinaturaId(assinaturaId);
            if (status != null) {
                midias = midias.stream()
                        .filter(m -> m.getStatus() == status)
                        .toList();
            }
        } else if (status != null) {
            midias = midiaRepository.findByStatus(status);
        } else {
            midias = midiaRepository.findAll();
        }

        return midias.stream().map(midiaMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public MidiaResponseDTO buscarPorId(Long id) {
        return midiaMapper.toResponse(buscarEntidade(id));
    }

    @Transactional
    public MidiaResponseDTO atualizar(Long id, MidiaRequestDTO dto) {
        Midia midia = buscarEntidade(id);
        Assinatura assinatura = resolverAssinatura(dto.getAssinaturaId());
        midiaMapper.atualizarEntidade(midia, dto, assinatura);
        return midiaMapper.toResponse(midia);
    }

    @Transactional
    public void excluir(Long id) {
        midiaRepository.delete(buscarEntidade(id));
    }

    /** Soma um episódio ao anime. A própria entidade ajusta o status. */
    @Transactional
    public MidiaResponseDTO assistirEpisodio(Long id) {
        Midia midia = buscarEntidade(id);
        if (!(midia instanceof Anime anime)) {
            throw new IllegalArgumentException("Esta mídia não é um anime.");
        }
        anime.assistirEpisodio();
        return midiaMapper.toResponse(anime);
    }

    /** Soma horas de jogo. */
    @Transactional
    public MidiaResponseDTO registrarHoras(Long id, int quantidade) {
        Midia midia = buscarEntidade(id);
        if (!(midia instanceof Jogo jogo)) {
            throw new IllegalArgumentException("Esta mídia não é um jogo.");
        }
        jogo.registrarHoras(quantidade);
        return midiaMapper.toResponse(jogo);
    }

    // ---------- Auxiliares ----------

    private Midia buscarEntidade(Long id) {
        return midiaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Mídia não encontrada: " + id));
    }

    /** A assinatura é opcional: sem id, a mídia fica sem assinatura. */
    private Assinatura resolverAssinatura(Long assinaturaId) {
        if (assinaturaId == null) {
            return null;
        }
        return assinaturaRepository.findById(assinaturaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Assinatura não encontrada: " + assinaturaId));
    }
}
