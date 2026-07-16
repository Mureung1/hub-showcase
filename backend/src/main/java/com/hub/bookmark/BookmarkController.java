package com.hub.bookmark;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Express의 라우트에 해당하는 계층.
 *   GET    /api/bookmarks?userId=1   → 조회
 *   POST   /api/bookmarks            → 생성 (201)
 *   DELETE /api/bookmarks/{id}       → 삭제 (204)
 */
@RestController
@RequestMapping("/api/bookmarks")
@CrossOrigin(origins = "${lineup.client-origin:http://localhost:5173}")
public class BookmarkController {

    private final BookmarkService service;

    public BookmarkController(BookmarkService service) {
        this.service = service;
    }

    @GetMapping
    public List<BookmarkResponse> list(@RequestParam Long userId) {
        // userId가 없으면 Spring이 자동으로 400을 낸다 (required=true 기본)
        return service.list(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED) // 201
    public Bookmark create(@Valid @RequestBody BookmarkDtos.CreateRequest req) {
        // @Valid 덕분에 userId/postingId가 null이면 여기 오기 전에 400
        return service.add(req.userId(), req.postingId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT) // 204
    public void delete(@PathVariable Long id) {
        service.remove(id);
    }

    // ── 예외 → HTTP 상태 매핑 ─────────────────────────────────
    // Express에서 if (error.code === '23505') res.status(409) 하던 것을
    // Spring에서는 예외 핸들러로 선언적으로 처리한다.
    @ExceptionHandler(BookmarkService.DuplicateBookmarkException.class)
    @ResponseStatus(HttpStatus.CONFLICT) // 409
    public Object duplicate() {
        return java.util.Map.of("error", "이미 저장한 공고입니다.");
    }

    @ExceptionHandler(BookmarkService.BookmarkNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND) // 404
    public Object notFound() {
        return java.util.Map.of("error", "해당 북마크가 없습니다.");
    }
}
