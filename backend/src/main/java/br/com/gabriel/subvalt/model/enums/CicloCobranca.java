package br.com.gabriel.subvalt.model.enums;

import lombok.Getter;

@Getter
public enum CicloCobranca {

    MENSAL(1),
    TRIMESTRAL(3),
    ANUAL(12);

    private final int meses;

    CicloCobranca(int meses) {
        this.meses = meses;
    }
}
