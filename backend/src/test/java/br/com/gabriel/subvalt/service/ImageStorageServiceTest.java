package br.com.gabriel.subvalt.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ImageStorageServiceTest {

    @TempDir
    Path diretorio;

    @AfterEach
    void limparSincronizacao() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void armazenaImagemValidadaESeparaCategorias() throws IOException {
        byte[] png = criarPng();
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "nao-confiar.jpg", "image/jpeg", png);
        ImageStorageService storage = new ImageStorageService(diretorio.toString());

        String chaveMidia = storage.armazenar(arquivo, ImageCategory.MIDIA);
        String chaveAssinatura = storage.armazenar(arquivo, ImageCategory.ASSINATURA);

        assertTrue(chaveMidia.endsWith(".png"));
        assertTrue(Files.exists(diretorio.resolve("midias").resolve(chaveMidia)));
        assertTrue(Files.exists(diretorio.resolve("assinaturas").resolve(chaveAssinatura)));
        ImageStorageService.ArquivoImagem carregada =
                storage.carregar(ImageCategory.MIDIA, chaveMidia);
        assertArrayEquals(png, carregada.conteudo());
        assertEquals(MediaType.IMAGE_PNG, carregada.tipoConteudo());
    }

    @Test
    void rejeitaConteudoFalsoMesmoComExtensaoEContentTypeDeImagem() {
        byte[] conteudoFalso = new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x01, 0x02, 0x03, 0x04
        };
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "capa.png", "image/png", conteudoFalso);
        ImageStorageService storage = new ImageStorageService(diretorio.toString());

        assertThrows(IllegalArgumentException.class,
                () -> storage.armazenar(arquivo, ImageCategory.MIDIA));
    }

    @Test
    void rejeitaArquivosMaioresQueCincoMegabytes() {
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "capa.png", "image/png",
                new byte[(int) ImageStorageService.TAMANHO_MAXIMO + 1]);
        ImageStorageService storage = new ImageStorageService(diretorio.toString());

        assertThrows(ImageStorageService.ImageTooLargeException.class,
                () -> storage.armazenar(arquivo, ImageCategory.MIDIA));
    }

    @Test
    void rejeitaIdentificadoresComTentativaDePathTraversal() {
        ImageStorageService storage = new ImageStorageService(diretorio.toString());

        assertThrows(IllegalArgumentException.class,
                () -> storage.carregar(ImageCategory.MIDIA, "../../etc/passwd"));
    }

    @Test
    void removerUmaImagemNaoAfetaOutrasEntidades() throws IOException {
        ImageStorageService storage = new ImageStorageService(diretorio.toString());
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "capa.png", "image/png", criarPng());
        String midiaExcluida = storage.armazenar(arquivo, ImageCategory.MIDIA);
        String outraMidia = storage.armazenar(arquivo, ImageCategory.MIDIA);
        String assinatura = storage.armazenar(arquivo, ImageCategory.ASSINATURA);

        storage.remover(ImageCategory.MIDIA, midiaExcluida);

        assertFalse(Files.exists(diretorio.resolve("midias").resolve(midiaExcluida)));
        assertTrue(Files.exists(diretorio.resolve("midias").resolve(outraMidia)));
        assertTrue(Files.exists(diretorio.resolve("assinaturas").resolve(assinatura)));
    }

    @Test
    void substituiImagemSomenteDepoisDoCommit() throws IOException {
        ImageStorageService storage = new ImageStorageService(diretorio.toString());
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "capa.png", "image/png", criarPng());
        String antiga = storage.armazenar(arquivo, ImageCategory.MIDIA);
        Path caminhoAntigo = diretorio.resolve("midias").resolve(antiga);
        TransactionSynchronizationManager.initSynchronization();

        String nova = storage.substituir(arquivo, ImageCategory.MIDIA, antiga);
        Path caminhoNovo = diretorio.resolve("midias").resolve(nova);

        assertTrue(Files.exists(caminhoAntigo));
        assertTrue(Files.exists(caminhoNovo));
        List<TransactionSynchronization> sincronizacoes =
                TransactionSynchronizationManager.getSynchronizations();
        sincronizacoes.forEach(TransactionSynchronization::afterCommit);
        sincronizacoes.forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
        TransactionSynchronizationManager.clearSynchronization();

        assertFalse(Files.exists(caminhoAntigo));
        assertTrue(Files.exists(caminhoNovo));
    }

    @Test
    void descartaNovaImagemQuandoTransacaoEhDesfeita() throws IOException {
        ImageStorageService storage = new ImageStorageService(diretorio.toString());
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "capa.png", "image/png", criarPng());
        String antiga = storage.armazenar(arquivo, ImageCategory.MIDIA);
        Path caminhoAntigo = diretorio.resolve("midias").resolve(antiga);
        TransactionSynchronizationManager.initSynchronization();

        String nova = storage.substituir(arquivo, ImageCategory.MIDIA, antiga);
        Path caminhoNovo = diretorio.resolve("midias").resolve(nova);
        List<TransactionSynchronization> sincronizacoes =
                TransactionSynchronizationManager.getSynchronizations();
        sincronizacoes.forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        TransactionSynchronizationManager.clearSynchronization();

        assertTrue(Files.exists(caminhoAntigo));
        assertFalse(Files.exists(caminhoNovo));
    }

    private byte[] criarPng() throws IOException {
        BufferedImage imagem = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        ImageIO.write(imagem, "png", saida);
        return saida.toByteArray();
    }
}
