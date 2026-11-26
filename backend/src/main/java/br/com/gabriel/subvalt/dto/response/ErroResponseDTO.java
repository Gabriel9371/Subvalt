package br.com.gabriel.subvalt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErroResponseDTO {

    private LocalDateTime timestamp;
    private int status;
    private String erro;
    private String mensagem;

    // Preenchido só nos erros de validação: nome do campo → mensagem
    private Map<String, String> campos;
}
