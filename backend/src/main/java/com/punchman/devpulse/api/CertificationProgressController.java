package com.punchman.devpulse.api;

import com.punchman.devpulse.domain.ProgressStatus;
import com.punchman.devpulse.service.CertificationProgressService;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/certification-progress")
@RequiredArgsConstructor
public class CertificationProgressController {

    private final CertificationProgressService certificationProgressService;

    @GetMapping
    public List<CertificationProgressResponse> search(
            @RequestParam(required = false) List<ProgressStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return certificationProgressService.search(status, from, to).stream()
                .map(CertificationProgressResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CertificationProgressResponse create(@RequestBody CreateCertificationProgressRequest request) {
        if (request.certificationId() == null || request.status() == null) {
            throw new IllegalArgumentException("certificationId, status는 필수 입력 항목입니다.");
        }
        return CertificationProgressResponse.from(
                certificationProgressService.create(
                        request.certificationId(), request.status(), request.targetDate(), request.memo()));
    }

    @PatchMapping("/{id}")
    public CertificationProgressResponse update(
            @PathVariable Long id, @RequestBody UpdateCertificationProgressRequest request) {
        if (request.status() == null) {
            throw new IllegalArgumentException("status는 필수 입력 항목입니다.");
        }
        return CertificationProgressResponse.from(
                certificationProgressService.update(id, request.status(), request.targetDate(), request.memo()));
    }
}
