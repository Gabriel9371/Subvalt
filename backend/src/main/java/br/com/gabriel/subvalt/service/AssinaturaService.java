package br.com.gabriel.subvalt.service;

import br.com.gabriel.subvalt.dto.request.AssinaturaRequestDTO;
import br.com.gabriel.subvalt.dto.response.AssinaturaResponseDTO;
import br.com.gabriel.subvalt.dto.response.ResumoAssinaturasResponseDTO;
import br.com.gabriel.subvalt.exception.RecursoNaoEncontradoException;
import br.com.gabriel.subvalt.mapper.AssinaturaMapper;
import br.com.gabriel.subvalt.model.Assinatura;
import br.com.gabriel.subvalt.model.enums.StatusMidia;
import br.com.gabriel.subvalt.repository.AssinaturaRepository;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssinaturaService {

    private static final int DIAS_ALERTA_VENCIMENTO = 7;

    private final AssinaturaRepository assinaturaRepository;
    private final AssinaturaMapper assinaturaMapper;
    private final ImageStorageService imageStorageService;
    private final PagamentoAssinaturaService pagamentoService;

    // Todo método roda dentro de uma transação, e a conversão para DTO acontece aqui dentro.
    // Com open-in-view=false, é só nesse intervalo que os relacionamentos lazy podem ser lidos.

    @Transactional
    public AssinaturaResponseDTO criar(AssinaturaRequestDTO dto) {
        Assinatura assinatura = assinaturaMapper.toEntity(dto);
        Assinatura salva = assinaturaRepository.save(assinatura);
        pagamentoService.gerarPrevisoes(salva);
        return assinaturaMapper.toResponse(salva);
    }

    @Transactional(readOnly = true)
    public List<AssinaturaResponseDTO> listar() {
        return assinaturaRepository.findAll().stream()
                .map(assinaturaMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssinaturaResponseDTO buscarPorId(Long id) {
        return assinaturaMapper.toResponse(buscarEntidade(id));
    }

    @Transactional
    public AssinaturaResponseDTO atualizar(Long id, AssinaturaRequestDTO dto) {
        Assinatura assinatura = buscarEntidade(id);
        assinaturaMapper.atualizarEntidade(assinatura, dto);
        pagamentoService.reconciliarPrevisoes(assinatura);
        // Sem save(): a entidade já está gerenciada, então o Hibernate
        // detecta a mudança e grava o UPDATE sozinho ao final da transação
        return assinaturaMapper.toResponse(assinatura);
    }

    @Transactional
    public void excluir(Long id) {
        Assinatura assinatura = buscarEntidade(id);
        pagamentoService.cancelarPrevisoesFuturas(assinatura);
        imageStorageService.removerAposCommit(ImageCategory.ASSINATURA, assinatura.getImagemKey());
        assinatura.desvincularMidias();
        assinatura.desvincularPagamentos();
        assinaturaRepository.delete(assinatura);
    }

    @Transactional
    public AssinaturaResponseDTO atualizarImagem(Long id, MultipartFile arquivo) {
        Assinatura assinatura = buscarEntidade(id);
        assinatura.setImagemKey(imageStorageService.substituir(
                arquivo, ImageCategory.ASSINATURA, assinatura.getImagemKey()));
        return assinaturaMapper.toResponse(assinatura);
    }

    @Transactional
    public AssinaturaResponseDTO removerImagem(Long id) {
        Assinatura assinatura = buscarEntidade(id);
        imageStorageService.removerAposCommit(ImageCategory.ASSINATURA, assinatura.getImagemKey());
        assinatura.setImagemKey(null);
        return assinaturaMapper.toResponse(assinatura);
    }

    @Transactional(readOnly = true)
    public ImageStorageService.ArquivoImagem buscarImagem(Long id) {
        Assinatura assinatura = buscarEntidade(id);
        if (assinatura.getImagemKey() == null) {
            throw new RecursoNaoEncontradoException("Imagem não encontrada para a assinatura: " + id);
        }
        return imageStorageService.carregar(ImageCategory.ASSINATURA, assinatura.getImagemKey());
    }

    @Transactional
    public AssinaturaResponseDTO renovar(Long id) {
        Assinatura assinatura = buscarEntidade(id);
        LocalDate vencimentoAnterior = assinatura.getProximoVencimento();
        assinatura.renovar();
        pagamentoService.manterPrevisoesAposRenovacao(assinatura, vencimentoAnterior);
        return assinaturaMapper.toResponse(assinatura);
    }

    @Transactional
    public AssinaturaResponseDTO cancelar(Long id) {
        Assinatura assinatura = buscarEntidade(id);
        assinatura.setAtiva(false);
        pagamentoService.cancelarPrevisoesFuturas(assinatura);
        return assinaturaMapper.toResponse(assinatura);
    }

    @Transactional
    public AssinaturaResponseDTO reativar(Long id) {
        Assinatura assinatura = buscarEntidade(id);
        assinatura.setAtiva(true);
        pagamentoService.gerarPrevisoes(assinatura);
        return assinaturaMapper.toResponse(assinatura);
    }

    /** Totais do painel: só as assinaturas ativas entram na conta. */
    @Transactional
    public ResumoAssinaturasResponseDTO resumo() {
        List<Assinatura> ativas = assinaturaRepository.findByAtivaTrue();

        // Cada item calcula o próprio custo (polimorfismo); aqui só somamos
        BigDecimal mensal = ativas.stream()
                .map(Assinatura::custoMensal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDate hoje = LocalDate.now();
        int vencendo = assinaturaRepository
                .findByAtivaTrueAndProximoVencimentoBetween(hoje, hoje.plusDays(DIAS_ALERTA_VENCIMENTO))
                .size();

        return ResumoAssinaturasResponseDTO.builder()
                .gastoMensalTotal(mensal)
                .gastoAnualEstimado(mensal.multiply(BigDecimal.valueOf(12)))
                .quantidadeAtivas(ativas.size())
                .quantidadeVencendoEm7Dias(vencendo)
                .financeiro(pagamentoService.resumoFinanceiro())
                .build();
    }

    /** Assinaturas ativas que vencem de hoje até daqui a N dias, da mais próxima à mais distante. */
    @Transactional(readOnly = true)
    public List<AssinaturaResponseDTO> vencimentos(int dias) {
        if (dias < 1) {
            throw new IllegalArgumentException("O número de dias deve ser pelo menos 1.");
        }
        LocalDate hoje = LocalDate.now();
        return assinaturaRepository
                .findByAtivaTrueAndProximoVencimentoBetween(hoje, hoje.plusDays(dias))
                .stream()
                .sorted(Comparator.comparing(Assinatura::getProximoVencimento))
                .map(assinaturaMapper::toResponse)
                .toList();
    }

    /**
     * Assinaturas ativas sem nenhuma mídia em andamento: candidatas a cancelamento.
     * (Para esta escala, ler a lista de mídias de cada assinatura é suficiente.)
     */
    @Transactional(readOnly = true)
    public List<AssinaturaResponseDTO> semUso() {
        return assinaturaRepository.findByAtivaTrue().stream()
                .filter(a -> a.getMidias().stream()
                        .noneMatch(m -> m.getStatus() == StatusMidia.EM_ANDAMENTO))
                .map(assinaturaMapper::toResponse)
                .toList();
    }

    private Assinatura buscarEntidade(Long id) {
        return assinaturaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Assinatura não encontrada: " + id));
    }
}
