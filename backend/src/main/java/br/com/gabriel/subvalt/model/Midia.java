package br.com.gabriel.subvalt.model;

import br.com.gabriel.subvalt.model.enums.StatusMidia;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "midias")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "tipo", discriminatorType = DiscriminatorType.STRING, length = 20)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public abstract class Midia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusMidia status = StatusMidia.QUERO_CONSUMIR;

    private Double nota;

    @Column(name = "imagem_key", length = 80)
    private String imagemKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assinatura_id")
    private Assinatura assinatura;

    protected Midia(String titulo, StatusMidia status) {
        setTitulo(titulo);
        if (status != null) {
            setStatus(status);
        }
    }

    // ---------- Setters com regra ----------

    public void setTitulo(String titulo) {
        if (titulo == null || titulo.isBlank()) {
            throw new IllegalArgumentException("O título é obrigatório.");
        }
        this.titulo = titulo.trim();
    }

    public void setNota(Double nota) {
        if (nota != null && (nota < 0 || nota > 10)) {
            throw new IllegalArgumentException("A nota deve estar entre 0 e 10.");
        }
        this.nota = nota;
    }

    /** Cada tipo de mídia descreve o próprio progresso. */
    public abstract String descricaoProgresso();
}
