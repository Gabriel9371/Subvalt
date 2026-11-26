package br.com.gabriel.subvalt.model;

import br.com.gabriel.subvalt.model.enums.StatusMidia;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@DiscriminatorValue("JOGO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Jogo extends Midia {

    @Column(name = "horas_jogadas")
    private Integer horasJogadas;

    public Jogo(String titulo, StatusMidia status, int horasJogadas) {
        super(titulo, status);
        setHorasJogadas(horasJogadas);
    }

    public void setHorasJogadas(int horasJogadas) {
        if (horasJogadas < 0) {
            throw new IllegalArgumentException("As horas jogadas não podem ser negativas.");
        }
        this.horasJogadas = horasJogadas;
    }

    public void registrarHoras(int horas) {
        if (horas <= 0) {
            throw new IllegalArgumentException("Informe uma quantidade de horas maior que zero.");
        }
        this.horasJogadas += horas;
        if (getStatus() == StatusMidia.QUERO_CONSUMIR) {
            setStatus(StatusMidia.EM_ANDAMENTO);
        }
    }

    @Override
    public String descricaoProgresso() {
        return horasJogadas + "h jogadas";
    }
}
