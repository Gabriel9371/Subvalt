package br.com.gabriel.subvalt.exception;

import br.com.gabriel.subvalt.dto.response.ErroResponseDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 404: o id pedido não existe
    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ErroResponseDTO> tratarNaoEncontrado(RecursoNaoEncontradoException ex) {
        return montar(HttpStatus.NOT_FOUND, ex.getMessage(), null);
    }

    // 400: as anotações do DTO (@NotBlank, @Positive...) reprovaram o corpo da requisição
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponseDTO> tratarValidacao(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(erro -> campos.putIfAbsent(erro.getField(), erro.getDefaultMessage()));
        return montar(HttpStatus.BAD_REQUEST, "Dados inválidos.", campos);
    }

    // 400: regra violada dentro das entidades ou dos mappers
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErroResponseDTO> tratarArgumentoInvalido(IllegalArgumentException ex) {
        return montar(HttpStatus.BAD_REQUEST, ex.getMessage(), null);
    }

    // 409: a operação é válida, mas o estado atual do objeto não permite (ex.: renovar assinatura cancelada)
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErroResponseDTO> tratarEstadoInvalido(IllegalStateException ex) {
        return montar(HttpStatus.CONFLICT, ex.getMessage(), null);
    }

    // 400: JSON malformado, enum desconhecido ou data em formato errado
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroResponseDTO> tratarCorpoIlegivel(HttpMessageNotReadableException ex) {
        return montar(HttpStatus.BAD_REQUEST,
                "Corpo da requisição inválido. Verifique o JSON, os valores dos enums e o formato das datas (AAAA-MM-DD).",
                null);
    }

    // 400: parâmetro de URL com valor inválido (ex.: ?status=XYZ)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErroResponseDTO> tratarParametroInvalido(MethodArgumentTypeMismatchException ex) {
        return montar(HttpStatus.BAD_REQUEST,
                "Valor inválido para o parâmetro '" + ex.getName() + "'.", null);
    }

    private ResponseEntity<ErroResponseDTO> montar(HttpStatus status, String mensagem, Map<String, String> campos) {
        ErroResponseDTO corpo = ErroResponseDTO.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .erro(status.getReasonPhrase())
                .mensagem(mensagem)
                .campos(campos)
                .build();
        return ResponseEntity.status(status).body(corpo);
    }
}
