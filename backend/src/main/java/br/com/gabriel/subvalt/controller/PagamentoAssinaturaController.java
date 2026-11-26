package br.com.gabriel.subvalt.controller;

import br.com.gabriel.subvalt.dto.request.ConfirmarPagamentoRequestDTO;
import br.com.gabriel.subvalt.dto.request.RegistrarPagamentoRequestDTO;
import br.com.gabriel.subvalt.dto.response.PagamentoResponseDTO;
import br.com.gabriel.subvalt.dto.response.ResumoPagamentoAssinaturaDTO;
import br.com.gabriel.subvalt.model.enums.StatusPagamento;
import br.com.gabriel.subvalt.service.PagamentoAssinaturaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/pagamentos")
@RequiredArgsConstructor
public class PagamentoAssinaturaController {

    private final PagamentoAssinaturaService pagamentoService;

    @GetMapping
    public ResponseEntity<List<PagamentoResponseDTO>> listar(
            @RequestParam(required = false) LocalDate inicio,
            @RequestParam(required = false) LocalDate fim,
            @RequestParam(required = false) Long assinaturaId,
            @RequestParam(required = false) StatusPagamento status) {
        return ResponseEntity.ok(pagamentoService.listar(inicio, fim, assinaturaId, status));
    }

    @PostMapping
    public ResponseEntity<PagamentoResponseDTO> registrar(
            @Valid @RequestBody RegistrarPagamentoRequestDTO dto) {
        return ResponseEntity.status(201).body(pagamentoService.registrar(dto));
    }

    @PatchMapping("/{id}/confirmar")
    public ResponseEntity<PagamentoResponseDTO> confirmar(
            @PathVariable Long id, @Valid @RequestBody ConfirmarPagamentoRequestDTO dto) {
        return ResponseEntity.ok(pagamentoService.confirmar(id, dto));
    }

    @GetMapping("/resumo-assinaturas")
    public ResponseEntity<List<ResumoPagamentoAssinaturaDTO>> resumosPorAssinatura() {
        return ResponseEntity.ok(pagamentoService.resumosPorAssinatura());
    }
}
