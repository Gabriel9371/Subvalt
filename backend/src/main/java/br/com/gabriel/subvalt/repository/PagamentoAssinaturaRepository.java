package br.com.gabriel.subvalt.repository;

import br.com.gabriel.subvalt.model.PagamentoAssinatura;
import br.com.gabriel.subvalt.model.enums.StatusPagamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PagamentoAssinaturaRepository extends JpaRepository<PagamentoAssinatura, Long> {

    boolean existsByAssinaturaIdAndDataVencimento(Long assinaturaId, LocalDate dataVencimento);

    Optional<PagamentoAssinatura> findByAssinaturaIdAndDataVencimento(
            Long assinaturaId, LocalDate dataVencimento);

    List<PagamentoAssinatura> findByStatusAndDataVencimentoBefore(
            StatusPagamento status, LocalDate data);

    @Modifying
    @Query("""
            delete from PagamentoAssinatura p
            where p.assinatura.id = :assinaturaId
              and p.previsao = true
              and p.status = :status
              and p.dataVencimento > :data
            """)
    int excluirPrevisoesFuturas(@Param("assinaturaId") Long assinaturaId,
                                @Param("status") StatusPagamento status,
                                @Param("data") LocalDate data);

    List<PagamentoAssinatura> findByAssinaturaId(Long assinaturaId);
}
