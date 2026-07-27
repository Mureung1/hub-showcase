package com.hub.document;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class DocGenerationListener {

    private final DocumentService documentService;

    /** enqueue 트랜잭션이 커밋된 뒤, llmExecutor 풀의 별도 스레드에서 실행된다. */
    @Async("llmExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(DocGenerationRequested event) {
        documentService.runGeneration(event.docId(), event.userId());
    }
}
