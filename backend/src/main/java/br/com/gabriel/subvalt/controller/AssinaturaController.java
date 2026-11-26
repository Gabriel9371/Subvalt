package br.com.gabriel.subvalt.controller;

import br.com.gabriel.subvalt.dto.request.AssinaturaRequestDTO;
import br.com.gabriel.subvalt.dto.response.AssinaturaResponseDTO;
import br.com.gabriel.subvalt.dto.response.ResumoAssinaturasResponseDTO;
import br.com.gabriel.subvalt.service.AssinaturaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/assinaturas")
@RequiredArgsConstructor
public class AssinaturaController {

    private final AssinaturaService assinaturaService;

    @PostMapping
    public ResponseEntity<AssinaturaResponseDTO> criar(@Valid @RequestBody AssinaturaRequestDTO dto) {
        AssinaturaResponseDTO criada = assinaturaService.criar(dto);
        URI local = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(criada.getId())
                .toUri();
        return ResponseEntity.created(local).body(criada);
    }

    @GetMapping
    public ResponseEntity<List<AssinaturaResponseDTO>> listar() {
        return ResponseEntity.ok(assinaturaService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssinaturaResponseDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(assinaturaService.buscarPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AssinaturaResponseDTO> atualizar(@PathVariable Long id,
                                                           @Valid @RequestBody AssinaturaRequestDTO dto) {
        return ResponseEntity.ok(assinaturaService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        assinaturaService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // ---------- Ações ----------

    @PatchMapping("/{id}/renovar")
    public ResponseEntity<AssinaturaResponseDTO> renovar(@PathVariable Long id) {
        return ResponseEntity.ok(assinaturaService.renovar(id));
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<AssinaturaResponseDTO> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(assinaturaService.cancelar(id));
    }

    @PatchMapping("/{id}/reativar")
    public ResponseEntity<AssinaturaResponseDTO> reativar(@PathVariable Long id) {
        return ResponseEntity.ok(assinaturaService.reativar(id));
    }

    // ---------- Painel ----------

    @GetMapping("/resumo")
    public ResponseEntity<ResumoAssinaturasResponseDTO> resumo() {
        return ResponseEntity.ok(assinaturaService.resumo());
    }

    @GetMapping("/vencimentos")
    public ResponseEntity<List<AssinaturaResponseDTO>> vencimentos(
            @RequestParam(defaultValue = "7") int dias) {
        return ResponseEntity.ok(assinaturaService.vencimentos(dias));
    }

    @GetMapping("/sem-uso")
    public ResponseEntity<List<AssinaturaResponseDTO>> semUso() {
        return ResponseEntity.ok(assinaturaService.semUso());
    }
}
