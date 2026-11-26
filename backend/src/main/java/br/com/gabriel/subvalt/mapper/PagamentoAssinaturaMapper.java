package br.com.gabriel.subvalt.mapper;

import br.com.gabriel.subvalt.dto.response.PagamentoResponseDTO;
import br.com.gabriel.subvalt.model.Assinatura;
import br.com.gabriel.subvalt.model.PagamentoAssinatura;
import org.springframework.stereotype.Component;

@Component
public class PagamentoAssinaturaMapper {

    public PagamentoResponseDTO toResponse(PagamentoAssinatura pagamento) {
        Assinatura assinatura = pagamento.getAssinatura();
        String imagemUrl = assinatura == null || assinatura.getImagemKey() == null
                ? null
                : "/api/assinaturas/" + assinatura.getId() + "/imagem?v=" + assinatura.getImagemKey();
        return PagamentoResponseDTO.builder()
                .id(pagamento.getId())
                .assinaturaId(pagamento.getAssinaturaIdOrigem())
                .assinaturaNome(pagamento.getAssinaturaNome())
                .tipoAssinatura(pagamento.getTipoAssinatura())
                .imagemUrl(imagemUrl)
                .dataVencimento(pagamento.getDataVencimento())
                .dataPagamento(pagamento.getDataPagamento())
                .valorPrevisto(pagamento.getValorPrevisto())
                .valorPago(pagamento.getValorPago())
                .status(pagamento.getStatus())
                .previsao(pagamento.isPrevisao())
                .observacoes(pagamento.getObservacoes())
                .build();
    }
}
