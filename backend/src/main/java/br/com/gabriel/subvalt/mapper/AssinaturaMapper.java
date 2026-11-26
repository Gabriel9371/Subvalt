package br.com.gabriel.subvalt.mapper;

import br.com.gabriel.subvalt.dto.request.AssinaturaRequestDTO;
import br.com.gabriel.subvalt.dto.response.AssinaturaResponseDTO;
import br.com.gabriel.subvalt.model.Assinatura;
import br.com.gabriel.subvalt.model.AssinaturaSoftware;
import br.com.gabriel.subvalt.model.AssinaturaStreaming;
import br.com.gabriel.subvalt.model.enums.TipoAssinatura;
import org.springframework.stereotype.Component;

@Component
public class AssinaturaMapper {

    /** DTO → entidade nova. O tipo do DTO decide qual subclasse é criada. */
    public Assinatura toEntity(AssinaturaRequestDTO dto) {
        return switch (dto.getTipo()) {
            case STREAMING -> new AssinaturaStreaming(
                    dto.getNome(),
                    dto.getValor(),
                    dto.getCiclo(),
                    dto.getProximoVencimento(),
                    exigir(dto.getPessoasNoPlano(), "pessoasNoPlano", dto.getTipo()));
            case SOFTWARE -> new AssinaturaSoftware(
                    dto.getNome(),
                    dto.getValor(),
                    dto.getCiclo(),
                    dto.getProximoVencimento(),
                    exigir(dto.getPercentualDesconto(), "percentualDesconto", dto.getTipo()));
        };
    }

    /** Copia os dados do DTO para uma entidade que já existe (usado no PUT). */
    public void atualizarEntidade(Assinatura entidade, AssinaturaRequestDTO dto) {
        if (tipoDe(entidade) != dto.getTipo()) {
            throw new IllegalArgumentException(
                    "Não é possível alterar o tipo de uma assinatura já criada.");
        }

        entidade.setNome(dto.getNome());
        entidade.setValor(dto.getValor());
        entidade.setCiclo(dto.getCiclo());
        entidade.setProximoVencimento(dto.getProximoVencimento());

        if (entidade instanceof AssinaturaStreaming streaming) {
            streaming.setPessoasNoPlano(
                    exigir(dto.getPessoasNoPlano(), "pessoasNoPlano", dto.getTipo()));
        } else if (entidade instanceof AssinaturaSoftware software) {
            software.setPercentualDesconto(
                    exigir(dto.getPercentualDesconto(), "percentualDesconto", dto.getTipo()));
        }
    }

    /** Entidade → DTO de resposta. */
    public AssinaturaResponseDTO toResponse(Assinatura entidade) {
        var resposta = AssinaturaResponseDTO.builder()
                .id(entidade.getId())
                .tipo(tipoDe(entidade))
                .nome(entidade.getNome())
                .valor(entidade.getValor())
                .ciclo(entidade.getCiclo())
                .proximoVencimento(entidade.getProximoVencimento())
                .ativa(entidade.isAtiva())
                .imagemUrl(entidade.getImagemKey() == null
                        ? null
                        : "/api/assinaturas/" + entidade.getId() + "/imagem?v=" + entidade.getImagemKey())
                .custoMensal(entidade.custoMensal())
                .diasParaVencer(entidade.diasParaVencer())
                .vencida(entidade.estaVencida());

        if (entidade instanceof AssinaturaStreaming streaming) {
            resposta.pessoasNoPlano(streaming.getPessoasNoPlano());
        } else if (entidade instanceof AssinaturaSoftware software) {
            resposta.percentualDesconto(software.getPercentualDesconto());
        }

        return resposta.build();
    }

    // ---------- Auxiliares ----------

    private TipoAssinatura tipoDe(Assinatura assinatura) {
        if (assinatura instanceof AssinaturaStreaming) {
            return TipoAssinatura.STREAMING;
        }
        if (assinatura instanceof AssinaturaSoftware) {
            return TipoAssinatura.SOFTWARE;
        }
        throw new IllegalStateException(
                "Tipo de assinatura desconhecido: " + assinatura.getClass().getSimpleName());
    }

    /** Garante que o campo específico do tipo veio preenchido. */
    private <T> T exigir(T valor, String campo, TipoAssinatura tipo) {
        if (valor == null) {
            throw new IllegalArgumentException(
                    "O campo '" + campo + "' é obrigatório para assinaturas do tipo " + tipo + ".");
        }
        return valor;
    }
}
