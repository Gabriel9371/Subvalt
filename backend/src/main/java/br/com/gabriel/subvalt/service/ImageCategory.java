package br.com.gabriel.subvalt.service;

public enum ImageCategory {
    ASSINATURA("assinaturas"),
    MIDIA("midias");

    private final String diretorio;

    ImageCategory(String diretorio) {
        this.diretorio = diretorio;
    }

    public String diretorio() {
        return diretorio;
    }
}
