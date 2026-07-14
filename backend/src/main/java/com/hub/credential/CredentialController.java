package com.hub.credential;

import com.hub.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/credentials")
@RequiredArgsConstructor
public class CredentialController {

    private final CredentialService service;

    @GetMapping
    public List<CredentialDto.Response> list() {
        return service.list(CurrentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CredentialDto.Response create(@Valid @RequestBody CredentialDto.SaveRequest req) {
        return service.create(CurrentUser.id(), req);
    }

    @PutMapping("/{id}")
    public CredentialDto.Response update(@PathVariable Long id,
                                         @Valid @RequestBody CredentialDto.SaveRequest req) {
        return service.update(CurrentUser.id(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(CurrentUser.id(), id);
    }

    /** 사이드바 "이력 완성도" 패널용 */
    @GetMapping("/completeness")
    public CredentialDto.CompletenessResponse completeness() {
        return service.completeness(CurrentUser.id());
    }
}
