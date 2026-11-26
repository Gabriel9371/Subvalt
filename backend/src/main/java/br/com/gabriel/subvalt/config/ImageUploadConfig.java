package br.com.gabriel.subvalt.config;

import jakarta.servlet.MultipartConfigElement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ImageUploadConfig {

    private static final long TAMANHO_MAXIMO_ARQUIVO = 5L * 1024 * 1024;
    private static final long TAMANHO_MAXIMO_REQUISICAO = 6L * 1024 * 1024;

    @Bean
    public MultipartConfigElement multipartConfigElement() {
        return new MultipartConfigElement(
                "", TAMANHO_MAXIMO_ARQUIVO, TAMANHO_MAXIMO_REQUISICAO, 0);
    }
}
