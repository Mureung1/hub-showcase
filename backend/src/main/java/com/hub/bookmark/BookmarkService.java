package com.hub.bookmark;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BookmarkService {

    private final BookmarkRepository repository;

    public BookmarkService(BookmarkRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<BookmarkResponse> list(Long userId) {
        return repository.findResponsesByUserId(userId);
    }

    @Transactional
    public Bookmark add(Long userId, Long postingId) {
        // 중복 저장은 예외로 던지고, 컨트롤러에서 409로 변환한다.
        if (repository.existsByUserIdAndPostingId(userId, postingId)) {
            throw new DuplicateBookmarkException();
        }
        return repository.save(new Bookmark(userId, postingId));
    }

    @Transactional
    public void remove(Long id) {
        if (!repository.existsById(id)) {
            throw new BookmarkNotFoundException();
        }
        repository.deleteById(id);
    }

    // 도메인 예외 — 컨트롤러 밖에서 HTTP를 모른 채 의미만 표현한다
    static class DuplicateBookmarkException extends RuntimeException {}
    static class BookmarkNotFoundException extends RuntimeException {}
}
