package com.hub.matching;

import com.hub.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/positions")
@RequiredArgsConstructor
public class PositionController {

    private final MatchingService matchingService;

    /** GET /api/positions — 적합도 높은 순 (F4) */
    @GetMapping
    public List<PositionDto.Summary> list() {
        return matchingService.listRanked(CurrentUser.id());
    }

    /** GET /api/positions/{id} — 근거 + 방향 제시 (F5) */
    @GetMapping("/{id}")
    public PositionDto.Detail detail(@PathVariable Long id) {
        return matchingService.detail(CurrentUser.id(), id);
    }

    /** POST /api/positions/recalculate — 이력 수정 후 호출 */
    @PostMapping("/recalculate")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void recalculate() {
        matchingService.recalculate(CurrentUser.id());
    }
}
