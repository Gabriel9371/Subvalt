package br.com.gabriel.subvalt.service;

import br.com.gabriel.subvalt.exception.ImageStorageException;
import br.com.gabriel.subvalt.exception.RecursoNaoEncontradoException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageReadParam;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Iterator;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ImageStorageService {

    public static final long TAMANHO_MAXIMO = 5L * 1024 * 1024;
    private static final Pattern IDENTIFICADOR_VALIDO = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$");

    private final Path diretorioRaiz;

    public ImageStorageService(
            @Value("${subvalt.storage.images-dir:./uploads/images}") String diretorio) {
        this.diretorioRaiz = Path.of(diretorio).toAbsolutePath().normalize();
    }

    public String substituir(MultipartFile arquivo, ImageCategory categoria, String identificadorAntigo) {
        String novoIdentificador = armazenar(arquivo, categoria);
        try {
            registrarSubstituicao(categoria, identificadorAntigo, novoIdentificador);
        } catch (RuntimeException ex) {
            removerSilenciosamente(categoria, novoIdentificador);
            throw ex;
        }
        return novoIdentificador;
    }

    public void removerAposCommit(ImageCategory categoria, String identificador) {
        if (identificador == null) {
            return;
        }
        exigirTransacaoAtiva();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                removerSilenciosamente(categoria, identificador);
            }
        });
    }

    public ArquivoImagem carregar(ImageCategory categoria, String identificador) {
        Path caminho = resolverCaminho(categoria, identificador);
        try {
            if (!Files.isRegularFile(caminho, LinkOption.NOFOLLOW_LINKS)) {
                throw new RecursoNaoEncontradoException("Imagem não encontrada.");
            }
            return new ArquivoImagem(Files.readAllBytes(caminho), tipoConteudo(identificador));
        } catch (IOException ex) {
            throw new ImageStorageException("Não foi possível ler a imagem armazenada.", ex);
        }
    }

    public String armazenar(MultipartFile arquivo, ImageCategory categoria) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Selecione uma imagem para enviar.");
        }
        if (arquivo.getSize() > TAMANHO_MAXIMO) {
            throw new ImageTooLargeException();
        }

        try {
            byte[] conteudo = arquivo.getBytes();
            if (conteudo.length == 0) {
                throw new IllegalArgumentException("O arquivo enviado está vazio.");
            }
            if (conteudo.length > TAMANHO_MAXIMO) {
                throw new ImageTooLargeException();
            }
            TipoImagem tipo = validarImagem(conteudo);
            String identificador = UUID.randomUUID() + "." + tipo.extensao();
            Path diretorio = resolverDiretorio(categoria);
            Files.write(diretorio.resolve(identificador), conteudo, StandardOpenOption.CREATE_NEW);
            return identificador;
        } catch (IOException ex) {
            throw new ImageStorageException("Não foi possível armazenar a imagem.", ex);
        }
    }

    public void remover(ImageCategory categoria, String identificador) {
        if (identificador == null) {
            return;
        }
        Path caminho = resolverCaminho(categoria, identificador);
        try {
            Files.deleteIfExists(caminho);
        } catch (IOException ex) {
            throw new ImageStorageException("Não foi possível remover a imagem armazenada.", ex);
        }
    }

    private void registrarSubstituicao(ImageCategory categoria, String antigo, String novo) {
        exigirTransacaoAtiva();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                removerSilenciosamente(categoria, antigo);
            }

            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    removerSilenciosamente(categoria, novo);
                }
            }
        });
    }

    private void exigirTransacaoAtiva() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("O gerenciamento da imagem exige uma transação ativa.");
        }
    }

    private void removerSilenciosamente(ImageCategory categoria, String identificador) {
        try {
            remover(categoria, identificador);
        } catch (ImageStorageException ex) {
            System.getLogger(ImageStorageService.class.getName()).log(
                    System.Logger.Level.WARNING, "Falha ao remover imagem armazenada.", ex);
        }
    }

    private Path resolverCaminho(ImageCategory categoria, String identificador) {
        if (identificador == null || !IDENTIFICADOR_VALIDO.matcher(identificador).matches()) {
            throw new IllegalArgumentException("Identificador de imagem inválido.");
        }
        try {
            Path diretorio = resolverDiretorio(categoria);
            Path caminho = diretorio.resolve(identificador).normalize();
            if (!caminho.startsWith(diretorio)) {
                throw new IllegalArgumentException("Identificador de imagem inválido.");
            }
            return caminho;
        } catch (IOException ex) {
            throw new ImageStorageException("Não foi possível acessar o armazenamento de imagens.", ex);
        }
    }

    private Path resolverDiretorio(ImageCategory categoria) throws IOException {
        Files.createDirectories(diretorioRaiz);
        Path raizReal = diretorioRaiz.toRealPath();
        Path diretorio = raizReal.resolve(categoria.diretorio()).normalize();
        if (!diretorio.startsWith(raizReal)) {
            throw new IllegalArgumentException("Categoria de imagem inválida.");
        }
        Files.createDirectories(diretorio);
        Path diretorioReal = diretorio.toRealPath();
        if (!diretorioReal.startsWith(raizReal)) {
            throw new IllegalArgumentException("Diretório de imagem inválido.");
        }
        return diretorioReal;
    }

    private TipoImagem validarImagem(byte[] conteudo) {
        if (comecaCom(conteudo, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF})) {
            validarComImageIo(conteudo, "JPEG");
            return new TipoImagem("jpg");
        }
        if (comecaCom(conteudo, new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        })) {
            validarComImageIo(conteudo, "PNG");
            return new TipoImagem("png");
        }
        if (ehWebp(conteudo)) {
            return new TipoImagem("webp");
        }
        throw new IllegalArgumentException("Formato inválido. Envie uma imagem JPEG, PNG ou WEBP.");
    }

    private void validarComImageIo(byte[] conteudo, String formatoEsperado) {
        try (ImageInputStream entrada = ImageIO.createImageInputStream(new ByteArrayInputStream(conteudo))) {
            if (entrada == null) {
                throw new IllegalArgumentException("O conteúdo enviado não é uma imagem válida.");
            }
            Iterator<ImageReader> leitores = ImageIO.getImageReaders(entrada);
            if (!leitores.hasNext()) {
                throw new IllegalArgumentException("O conteúdo enviado não é uma imagem válida.");
            }
            ImageReader leitor = leitores.next();
            try {
                leitor.setInput(entrada, true, true);
                int largura = leitor.getWidth(0);
                int altura = leitor.getHeight(0);
                if (!formatoEsperado.equalsIgnoreCase(leitor.getFormatName())
                        || largura < 1 || altura < 1 || (long) largura * altura > 100_000_000L) {
                    throw new IllegalArgumentException("O conteúdo enviado não é uma imagem válida.");
                }
                int amostragem = (int) Math.max(1L,
                        (Math.max((long) largura, altura) + 2047) / 2048);
                ImageReadParam parametros = leitor.getDefaultReadParam();
                parametros.setSourceSubsampling(amostragem, amostragem, 0, 0);
                if (leitor.read(0, parametros) == null) {
                    throw new IllegalArgumentException("O conteúdo enviado não é uma imagem válida.");
                }
            } finally {
                leitor.dispose();
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("O conteúdo enviado não é uma imagem válida.", ex);
        }
    }

    private boolean ehWebp(byte[] conteudo) {
        if (conteudo.length < 20
                || !asciiIgual(conteudo, 0, "RIFF")
                || !asciiIgual(conteudo, 8, "WEBP")
                || inteiroSemSinalLittleEndian(conteudo, 4) != conteudo.length - 8L) {
            return false;
        }

        int deslocamento = 12;
        boolean dadosDeImagem = false;
        while (deslocamento + 8 <= conteudo.length) {
            String bloco = new String(conteudo, deslocamento, 4, java.nio.charset.StandardCharsets.US_ASCII);
            long tamanhoBloco = inteiroSemSinalLittleEndian(conteudo, deslocamento + 4);
            long fimBloco = deslocamento + 8L + tamanhoBloco + (tamanhoBloco & 1);
            if (fimBloco > conteudo.length) {
                return false;
            }
            int dados = deslocamento + 8;
            if (("VP8 ".equals(bloco) && tamanhoBloco >= 10
                    && conteudo[dados + 3] == (byte) 0x9D
                    && conteudo[dados + 4] == 0x01
                    && conteudo[dados + 5] == 0x2A)
                    || ("VP8L".equals(bloco) && tamanhoBloco >= 5 && conteudo[dados] == 0x2F)
                    || ("ANMF".equals(bloco) && frameWebpValido(conteudo, dados, (int) tamanhoBloco))) {
                dadosDeImagem = true;
            }
            deslocamento = (int) fimBloco;
        }
        return deslocamento == conteudo.length && dadosDeImagem;
    }

    private boolean frameWebpValido(byte[] conteudo, int inicio, int tamanho) {
        if (tamanho < 24) {
            return false;
        }
        int deslocamento = inicio + 16;
        int fim = inicio + tamanho;
        boolean dadosDeImagem = false;
        while (deslocamento + 8 <= fim) {
            String bloco = new String(conteudo, deslocamento, 4, java.nio.charset.StandardCharsets.US_ASCII);
            long tamanhoBloco = inteiroSemSinalLittleEndian(conteudo, deslocamento + 4);
            long fimBloco = deslocamento + 8L + tamanhoBloco + (tamanhoBloco & 1);
            if (fimBloco > fim) {
                return false;
            }
            int dados = deslocamento + 8;
            if (("VP8 ".equals(bloco) && tamanhoBloco >= 10
                    && conteudo[dados + 3] == (byte) 0x9D
                    && conteudo[dados + 4] == 0x01
                    && conteudo[dados + 5] == 0x2A)
                    || ("VP8L".equals(bloco) && tamanhoBloco >= 5 && conteudo[dados] == 0x2F)) {
                dadosDeImagem = true;
            }
            deslocamento = (int) fimBloco;
        }
        return deslocamento == fim && dadosDeImagem;
    }

    private long inteiroSemSinalLittleEndian(byte[] conteudo, int deslocamento) {
        return Integer.toUnsignedLong(ByteBuffer.wrap(conteudo, deslocamento, 4)
                .order(ByteOrder.LITTLE_ENDIAN).getInt());
    }

    private boolean asciiIgual(byte[] conteudo, int deslocamento, String esperado) {
        for (int i = 0; i < esperado.length(); i++) {
            if (conteudo[deslocamento + i] != (byte) esperado.charAt(i)) {
                return false;
            }
        }
        return true;
    }

    private boolean comecaCom(byte[] conteudo, byte[] assinatura) {
        if (conteudo.length < assinatura.length) {
            return false;
        }
        for (int i = 0; i < assinatura.length; i++) {
            if (conteudo[i] != assinatura[i]) {
                return false;
            }
        }
        return true;
    }

    private MediaType tipoConteudo(String identificador) {
        String extensao = identificador.substring(identificador.lastIndexOf('.') + 1)
                .toLowerCase(Locale.ROOT);
        return switch (extensao) {
            case "jpg" -> MediaType.IMAGE_JPEG;
            case "png" -> MediaType.IMAGE_PNG;
            case "webp" -> MediaType.parseMediaType("image/webp");
            default -> throw new IllegalArgumentException("Formato de imagem inválido.");
        };
    }

    private record TipoImagem(String extensao) {
    }

    public record ArquivoImagem(byte[] conteudo, MediaType tipoConteudo) {
    }

    public static class ImageTooLargeException extends RuntimeException {
        public ImageTooLargeException() {
            super("A imagem deve ter no máximo 5 MB.");
        }
    }
}
