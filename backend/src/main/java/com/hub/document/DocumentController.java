package com.hub.document;

import com.hub.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService service;

    /** POST /api/documents → 202. 완료를 기다리지 않는다. */
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public DocumentDto.JobResponse generate(@Valid @RequestBody DocumentDto.GenerateRequest req) {
        return service.enqueue(CurrentUser.id(), req);
    }

    /** GET /api/documents/{id} — 프론트가 DONE 될 때까지 폴링 */
    @GetMapping("/{id}")
    public DocumentDto.Response get(@PathVariable Long id) {
        return service.get(CurrentUser.id(), id);
    }

    /** GET /api/documents?positionId= */
    @GetMapping
    public List<DocumentDto.Response> listByPosting(@RequestParam Long positionId) {
        return service.listByPosting(CurrentUser.id(), positionId);
    }

    /** PATCH /api/documents/{id} — 사용자 편집 저장 */
    @PatchMapping("/{id}")
    public DocumentDto.Response edit(@PathVariable Long id,
                                     @Valid @RequestBody DocumentDto.EditRequest req) {
        return service.edit(CurrentUser.id(), id, req);
    }
}
