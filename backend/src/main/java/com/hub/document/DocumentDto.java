package com.hub.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class DocumentDto {

    public record GenerateRequest(
            @NotNull Long postingId,
            @NotNull DocType type
    ) {}

    /** 202 응답 — 프론트는 이 id로 폴링한다. */
    public record JobResponse(Long id, DocStatus status) {}

    public record Response(
            Long id,
            Long postingId,
            DocType type,
            DocStatus status,
            String content,
            String errorMessage
    ) {
        public static Response from(GeneratedDoc doc) {
            return new Response(doc.getId(), doc.getPostingId(), doc.getType(),
                    doc.getStatus(), doc.getContent(), doc.getErrorMessage());
        }
    }

    public record EditRequest(@NotBlank String content) {}
}
