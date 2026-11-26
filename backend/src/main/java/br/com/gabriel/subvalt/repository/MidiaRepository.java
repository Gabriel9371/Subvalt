package br.com.gabriel.subvalt.repository;

import br.com.gabriel.subvalt.model.Midia;
import br.com.gabriel.subvalt.model.enums.StatusMidia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MidiaRepository extends JpaRepository<Midia, Long> {

    // Navega pela relação: midia.assinatura.id
    List<Midia> findByAssinaturaId(Long assinaturaId);

    List<Midia> findByStatus(StatusMidia status);
}
