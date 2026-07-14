package com.hub.document;

import com.hub.common.ApiException;
import com.hub.credential.CredentialRepository;
import com.hub.matching.MatchingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * F6 — AI 문서 생성 (비동기 잡)
 *
 *   POST /api/documents  →  202 { id, status: PENDING }   ← 즉시 반환
 *   GET  /api/documents/{id} → 폴링 → status: DONE, content
 *
 * LLM 호출은 수십 초가 걸려 요청 스레드를 잡아두면 안 된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final GeneratedDocRepository docRepository;
    private final CredentialRepository credentialRepository;
    private final MatchingService matchingService;
    private final LlmClient llmClient;

    /** 잡을 만들고 바로 반환한다. */
    @Transactional
    public DocumentDto.JobResponse enqueue(Long userId, DocumentDto.GenerateRequest req) {
        GeneratedDoc doc = docRepository.save(GeneratedDoc.builder()
                .userId(userId)
                .postingId(req.postingId())
                .type(req.type())
                .build());

        runAsync(doc.getId(), userId);      // 트랜잭션 커밋 후 별도 스레드에서 실행
        return new DocumentDto.JobResponse(doc.getId(), doc.getStatus());
    }

    /** llmExecutor 풀에서 돈다. 실패해도 요청 흐름에는 영향이 없다. */
    @Async("llmExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void runAsync(Long docId, Long userId) {
        GeneratedDoc doc = docRepository.findById(docId).orElseThrow();

        try {
            doc.start();

            var position = matchingService.detail(userId, doc.getPostingId());
            var credentials = credentialRepository.findByUserIdOrderByStartedOnDesc(userId);

            String prompt = PromptBuilder.build(doc.getType(), position, credentials);
            doc.complete(llmClient.generate(prompt));

        } catch (Exception e) {
            log.error("문서 생성 실패: docId={}", docId, e);
            doc.fail("문서를 만들지 못했습니다. 다시 시도해 주세요.");
        }
    }

    @Transactional(readOnly = true)
    public DocumentDto.Response get(Long userId, Long docId) {
        return docRepository.findByIdAndUserId(docId, userId)
                .map(DocumentDto.Response::from)
                .orElseThrow(() -> ApiException.notFound("문서"));
    }

    @Transactional(readOnly = true)
    public List<DocumentDto.Response> listByPosting(Long userId, Long postingId) {
        return docRepository.findByUserIdAndPostingId(userId, postingId).stream()
                .map(DocumentDto.Response::from)
                .toList();
    }

    /** 사용자 검수·편집 (기획서 8장: 생성물은 반드시 사람이 확인한다) */
    @Transactional
    public DocumentDto.Response edit(Long userId, Long docId, DocumentDto.EditRequest req) {
        GeneratedDoc doc = docRepository.findByIdAndUserId(docId, userId)
                .orElseThrow(() -> ApiException.notFound("문서"));
        doc.edit(req.content());
        return DocumentDto.Response.from(doc);
    }
}
