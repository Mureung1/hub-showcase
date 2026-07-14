package com.hub.credential;

import com.hub.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** F2 — 이력 입력·관리 */
@Service
@RequiredArgsConstructor
public class CredentialService {

    private final CredentialRepository repository;

    @Transactional(readOnly = true)
    public List<CredentialDto.Response> list(Long userId) {
        return repository.findByUserIdOrderByStartedOnDesc(userId).stream()
                .map(CredentialDto.Response::from)
                .toList();
    }

    @Transactional
    public CredentialDto.Response create(Long userId, CredentialDto.SaveRequest req) {
        Credential saved = repository.save(Credential.builder()
                .userId(userId)
                .type(req.type())
                .title(req.title())
                .detail(req.detail())
                .startedOn(req.startedOn())
                .endedOn(req.endedOn())
                .build());
        return CredentialDto.Response.from(saved);
    }

    @Transactional
    public CredentialDto.Response update(Long userId, Long id, CredentialDto.SaveRequest req) {
        Credential credential = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("이력"));
        credential.update(req.title(), req.detail(), req.startedOn(), req.endedOn());
        return CredentialDto.Response.from(credential);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Credential credential = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("이력"));
        repository.delete(credential);
    }

    /**
     * 이력 완성도 — 4개 유형을 모두 채우면 100%.
     * 사이드바 패널과 이력 관리 화면이 같은 값을 쓴다.
     */
    @Transactional(readOnly = true)
    public CredentialDto.CompletenessResponse completeness(Long userId) {
        Set<CredentialType> filled = repository.findByUserIdOrderByStartedOnDesc(userId).stream()
                .map(Credential::getType)
                .collect(Collectors.toSet());

        List<String> missing = new ArrayList<>();
        for (CredentialType type : CredentialType.values()) {
            if (!filled.contains(type)) missing.add(label(type));
        }

        int total = CredentialType.values().length;
        int percentage = (int) Math.round(filled.size() * 100.0 / total);
        return new CredentialDto.CompletenessResponse(percentage, missing);
    }

    private String label(CredentialType type) {
        return switch (type) {
            case CAREER -> "경력";
            case CERTIFICATE -> "자격증";
            case PORTFOLIO -> "포트폴리오";
            case COMPANY -> "회사";
        };
    }
}
