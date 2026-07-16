package com.spendmate.service;

import com.spendmate.domain.Category;
import com.spendmate.domain.Expense;
import com.spendmate.domain.ExpenseInputType;
import com.spendmate.domain.User;
import com.spendmate.repository.ExpenseRepository;
import com.spendmate.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExpenseService {

    private static final Long SEED_USER_ID = 1L; // TODO: 로그인 붙으면 실제 로그인 유저로 교체
    private static final List<String> DAY_LABELS = List.of("일", "월", "화", "수", "목", "금", "토");

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    public record CategorySummary(Category category, Integer amount, Integer percent) {}
    public record ExpenseSummary(Integer total, List<CategorySummary> categories) {}
    public record DailyAmount(String day, Integer amount) {}

    public ExpenseService(ExpenseRepository expenseRepository, UserRepository userRepository) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
    }

    /**
     * 영수증/캡처 없이 사용자가 직접 입력한 지출을 저장한다 (F12).
     */
    public Expense createManual(Integer amount, Category category, String memo, LocalDateTime spentAt) {
        if (amount == null || amount == 0) {
            throw new IllegalArgumentException("금액을 입력해주세요.");
        }
        User user = userRepository.findById(SEED_USER_ID)
                .orElseThrow(() -> new IllegalStateException("시드 유저가 없습니다. psql로 users 테이블 확인해보세요."));

        Expense expense = new Expense(user, null, null, memo, amount,
                category != null ? category : Category.OTHER,
                spentAt != null ? spentAt : LocalDateTime.now(),
                ExpenseInputType.MANUAL);
        return expenseRepository.save(expense);
    }

    /**
     * 카테고리별 지출 합계 (F5 도넛차트/카테고리 목록용).
     */
    public ExpenseSummary getSummary(String period) {
        LocalDateTime start = resolveStart(period);
        List<Expense> expenses = expenseRepository.findByUserIdAndSpentAtBetween(SEED_USER_ID, start, LocalDateTime.now());

        Map<Category, Integer> totals = new EnumMap<>(Category.class);
        int total = 0;
        for (Expense expense : expenses) {
            totals.merge(expense.getCategory(), expense.getAmount(), Integer::sum);
            total += expense.getAmount();
        }

        int finalTotal = total;
        List<CategorySummary> categories = totals.entrySet().stream()
                .map(entry -> new CategorySummary(entry.getKey(), entry.getValue(),
                        finalTotal == 0 ? 0 : Math.round(entry.getValue() * 100f / finalTotal)))
                .sorted((a, b) -> b.amount() - a.amount())
                .toList();

        return new ExpenseSummary(total, categories);
    }

    /**
     * 최근 7일 일별 지출 합계 (F5 바차트용). 지출 없는 날도 0으로 채워서 반환한다.
     */
    public List<DailyAmount> getDailySummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.minusDays(6).atStartOfDay();
        List<Expense> expenses = expenseRepository.findByUserIdAndSpentAtBetween(SEED_USER_ID, start, LocalDateTime.now());

        Map<LocalDate, Integer> byDate = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            byDate.put(today.minusDays(i), 0);
        }
        for (Expense expense : expenses) {
            LocalDate date = expense.getSpentAt().toLocalDate();
            byDate.computeIfPresent(date, (d, amount) -> amount + expense.getAmount());
        }

        List<DailyAmount> result = new ArrayList<>();
        for (Map.Entry<LocalDate, Integer> entry : byDate.entrySet()) {
            DayOfWeek dayOfWeek = entry.getKey().getDayOfWeek();
            result.add(new DailyAmount(DAY_LABELS.get(dayOfWeek.getValue() % 7), entry.getValue()));
        }
        return result;
    }

    private LocalDateTime resolveStart(String period) {
        LocalDateTime now = LocalDateTime.now();
        return switch (period) {
            case "week" -> now.minusDays(7);
            case "3months" -> now.minusDays(90);
            default -> now.toLocalDate().withDayOfMonth(1).atStartOfDay(); // "month"
        };
    }
}
