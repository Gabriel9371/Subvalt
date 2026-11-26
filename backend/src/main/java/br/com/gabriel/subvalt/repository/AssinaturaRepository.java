package br.com.gabriel.subvalt.repository;

import br.com.gabriel.subvalt.model.Assinatura;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AssinaturaRepository extends JpaRepository<Assinatura, Long> {

    // Usada para somar o gasto mensal só das assinaturas ativas
    List<Assinatura> findByAtivaTrue();

    // Usada para listar o que vence em um intervalo (por exemplo, esta semana)
    List<Assinatura> findByAtivaTrueAndProximoVencimentoBetween(LocalDate inicio, LocalDate fim);
}
