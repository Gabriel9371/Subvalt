package br.com.gabriel.subvalt.controller;

import br.com.gabriel.subvalt.dto.request.MidiaRequestDTO;
import br.com.gabriel.subvalt.dto.response.MidiaResponseDTO;
import br.com.gabriel.subvalt.model.enums.StatusMidia;
import br.com.gabriel.subvalt.service.MidiaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
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
@RequestMapping("/api/midias")
@RequiredArgsConstructor
public class MidiaController {

    private final MidiaService midiaService;

    @PostMapping
    public ResponseEntity<MidiaResponseDTO> criar(@Valid @RequestBody MidiaRequestDTO dto) {
        MidiaResponseDTO criada = midiaService.criar(dto);
        URI local = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(criada.getId())
                .toUri();
        return ResponseEntity.created(local).body(criada);
    }

    // Exemplos: /api/midias?status=EM_ANDAMENTO  e  /api/midias?assinaturaId=1
    @GetMapping
    public ResponseEntity<List<MidiaResponseDTO>> listar(
            @RequestParam(required = false) StatusMidia status,
            @RequestParam(required = false) Long assinaturaId) {
        return ResponseEntity.ok(midiaService.listar(status, assinaturaId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MidiaResponseDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(midiaService.buscarPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MidiaResponseDTO> atualizar(@PathVariable Long id,
                                                      @Valid @RequestBody MidiaRequestDTO dto) {
        return ResponseEntity.ok(midiaService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        midiaService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/imagem", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MidiaResponseDTO> atualizarImagem(
            @PathVariable Long id, @RequestParam(value = "arquivo", required = false) MultipartFile arquivo) {
        return ResponseEntity.ok(midiaService.atualizarImagem(id, arquivo));
    }

    @DeleteMapping("/{id}/imagem")
    public ResponseEntity<MidiaResponseDTO> removerImagem(@PathVariable Long id) {
        return ResponseEntity.ok(midiaService.removerImagem(id));
    }

    @GetMapping("/{id}/imagem")
    public ResponseEntity<byte[]> buscarImagem(@PathVariable Long id) {
        var imagem = midiaService.buscarImagem(id);
        return ResponseEntity.ok()
                .contentType(imagem.tipoConteudo())
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(imagem.conteudo());
    }

    // ---------- Ações ----------

    @PatchMapping("/{id}/episodio")
    public ResponseEntity<MidiaResponseDTO> assistirEpisodio(@PathVariable Long id) {
        return ResponseEntity.ok(midiaService.assistirEpisodio(id));
    }

    @PatchMapping("/{id}/horas")
    public ResponseEntity<MidiaResponseDTO> registrarHoras(@PathVariable Long id,
                                                           @RequestParam int quantidade) {
        return ResponseEntity.ok(midiaService.registrarHoras(id, quantidade));
    }
}
