package br.com.gabriel.subvalt.model;

import br.com.gabriel.subvalt.model.enums.CicloCobranca;
import br.com.gabriel.subvalt.model.enums.StatusPagamento;
import br.com.gabriel.subvalt.model.enums.TipoAssinatura;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PagamentoAssinaturaTest {

    @Test
    void previsaoVencidaContinuaNaoPagaAteConfirmacaoManual() {
        Assinatura assinatura = new AssinaturaStreaming(
                "Serviço", new BigDecimal("19.90"), CicloCobranca.MENSAL,
                LocalDate.now(), 1);
        PagamentoAssinatura pagamento = PagamentoAssinatura.previsao(
                assinatura, LocalDate.now().minusDays(1));

        pagamento.marcarAtrasado();

        assertEquals(StatusPagamento.ATRASADO, pagamento.getStatus());
        assertNull(pagamento.getDataPagamento());
        assertNull(pagamento.getValorPago());

        pagamento.confirmar(LocalDate.now(), new BigDecimal("21.50"), "Cobrança ajustada");

        assertEquals(StatusPagamento.PAGO, pagamento.getStatus());
        assertEquals(new BigDecimal("21.50"), pagamento.getValorPago());
        assertEquals(new BigDecimal("19.90"), pagamento.getValorPrevisto());
        assertEquals("Cobrança ajustada", pagamento.getObservacoes());
    }

    @Test
    void preservaSnapshotEImpedeConfirmacaoDuplicada() {
        Assinatura assinatura = new AssinaturaStreaming(
                "Serviço antigo", new BigDecimal("10.00"), CicloCobranca.MENSAL,
                LocalDate.now(), 1);
        PagamentoAssinatura pagamento = PagamentoAssinatura.pagamentoManual(
                assinatura, LocalDate.now(), LocalDate.now(), new BigDecimal("10.00"), null);

        assinatura.setNome("Serviço novo");
        pagamento.setAssinatura(null);

        assertEquals("Serviço antigo", pagamento.getAssinaturaNome());
        assertEquals(TipoAssinatura.STREAMING, pagamento.getTipoAssinatura());
        assertThrows(IllegalStateException.class,
                () -> pagamento.confirmar(LocalDate.now(), new BigDecimal("10.00"), null));
    }
}
