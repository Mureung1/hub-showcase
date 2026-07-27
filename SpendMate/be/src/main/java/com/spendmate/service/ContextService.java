package com.spendmate.service;

import com.spendmate.domain.Category;
import com.spendmate.domain.Expense;
import com.spendmate.domain.Subscription;
import com.spendmate.domain.User;
import com.spendmate.repository.BudgetRepository;
import com.spendmate.repository.ExpenseRepository;
import com.spendmate.repository.SubscriptionRepository;
import com.spendmate.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ContextService {

    private final ExpenseRepository expenseRepository;
    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;

    public ContextService(ExpenseRepository expenseRepository, BudgetRepository budgetRepository,
                           UserRepository userRepository, SubscriptionRepository subscriptionRepository) {
        this.expenseRepository = expenseRepository;
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    /**
     * 배달비 증가율(%) — 이번 달 배달비 대비 지난 달 배달비 증감률.
     * 지난 달 배달비가 0원이면 비교 기준이 없어 null을 반환한다.
     */
    public Double getDeliveryIncreaseRate(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thisMonthStart = now.toLocalDate().withDayOfMonth(1).atStartOfDay();
        LocalDateTime lastMonthStart = thisMonthStart.minusMonths(1);

        int thisMonthDelivery = sumDelivery(userId, thisMonthStart, now);
        int lastMonthDelivery = sumDelivery(userId, lastMonthStart, thisMonthStart);

        if (lastMonthDelivery == 0) {
            return null;
        }
        return (thisMonthDelivery - lastMonthDelivery) * 100.0 / lastMonthDelivery;
    }

    /**
     * 예산 대비 지출률(%) — 이번 달 누적 지출 / 총예산.
     * 예산이 설정되지 않았으면 null을 반환한다.
     */
    public Double getBudgetUsageRate(Long userId) {
        var budget = budgetRepository.findByUserIdAndCategoryIsNull(userId).orElse(null);
        if (budget == null || budget.getAmount() == null || budget.getAmount() == 0) {
            return null;
        }

        LocalDateTime thisMonthStart = LocalDateTime.now().toLocalDate().withDayOfMonth(1).atStartOfDay();
        List<Expense> expenses = expenseRepository.findByUserIdAndSpentAtBetween(userId, thisMonthStart, LocalDateTime.now());
        int total = expenses.stream().mapToInt(Expense::getAmount).sum();

        return total * 100.0 / budget.getAmount();
    }

    private int sumDelivery(Long userId, LocalDateTime start, LocalDateTime end) {
        return expenseRepository.findByUserIdAndSpentAtBetween(userId, start, end).stream()
                .filter(e -> e.getCategory() == Category.DELIVERY)
                .mapToInt(Expense::getAmount)
                .sum();
    }

    public enum Trend { UP, DOWN, FLAT }
    public record CategoryComposition(Category category, Integer percent) {}
    public record CategoryTrend(Category category, Trend trend) {}
    public record SubscriptionStatus(int count, int totalAmount) {}

    /**
     * 카테고리별 소비 구성 비율 — 가입일부터 오늘까지(최대 90일) 기준.
     */
    public List<CategoryComposition> getCategoryComposition(Long userId) {
        LocalDateTime start = resolveAnalysisWindowStart(userId);
        List<Expense> expenses = expenseRepository.findByUserIdAndSpentAtBetween(userId, start, LocalDateTime.now());
        int total = expenses.stream().mapToInt(Expense::getAmount).sum();
        if (total == 0) {
            return List.of();
        }

        Map<Category, Integer> totals = new EnumMap<>(Category.class);
        for (Expense e : expenses) {
            totals.merge(e.getCategory(), e.getAmount(), Integer::sum);
        }
        return totals.entrySet().stream()
                .map(entry -> new CategoryComposition(entry.getKey(), Math.round(entry.getValue() * 100f / total)))
                .sorted((a, b) -> b.percent() - a.percent())
                .toList();
    }

    /**
     * 카테고리별 소비 추세 — 분석 기간을 반으로 나눠 전반/후반 비교.
     */
    public List<CategoryTrend> getCategoryTrend(Long userId) {
        LocalDateTime start = resolveAnalysisWindowStart(userId);
        LocalDateTime now = LocalDateTime.now();
        long totalDays = Math.max(Duration.between(start, now).toDays(), 1);
        LocalDateTime mid = start.plusDays(totalDays / 2);

        Map<Category, Integer> firstHalf = sumByCategory(userId, start, mid);
        Map<Category, Integer> secondHalf = sumByCategory(userId, mid, now);

        Set<Category> categories = new HashSet<>();
        categories.addAll(firstHalf.keySet());
        categories.addAll(secondHalf.keySet());

        List<CategoryTrend> result = new ArrayList<>();
        for (Category c : categories) {
            int before = firstHalf.getOrDefault(c, 0);
            int after = secondHalf.getOrDefault(c, 0);
            Trend trend;
            if (after > before * 1.1) trend = Trend.UP;
            else if (after < before * 0.9) trend = Trend.DOWN;
            else trend = Trend.FLAT;
            result.add(new CategoryTrend(c, trend));
        }
        return result;
    }

    /**
     * 구독 상태 — 등록된 구독 개수와 합계 금액.
     */
    public SubscriptionStatus getSubscriptionStatus(Long userId) {
        List<Subscription> subs = subscriptionRepository.findByUserId(userId);
        int total = subs.stream().mapToInt(Subscription::getAmount).sum();
        return new SubscriptionStatus(subs.size(), total);
    }

    private Map<Category, Integer> sumByCategory(Long userId, LocalDateTime start, LocalDateTime end) {
        Map<Category, Integer> totals = new EnumMap<>(Category.class);
        for (Expense e : expenseRepository.findByUserIdAndSpentAtBetween(userId, start, end)) {
            totals.merge(e.getCategory(), e.getAmount(), Integer::sum);
        }
        return totals;
    }

    /**
     * 분석 기간 시작점 — 가입일과 90일 전 중 더 늦은 날짜(즉, 최대 90일로 제한).
     */
    private LocalDateTime resolveAnalysisWindowStart(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        LocalDateTime ninetyDaysAgo = LocalDateTime.now().minusDays(90);
        return user.getCreatedAt().isAfter(ninetyDaysAgo) ? user.getCreatedAt() : ninetyDaysAgo;
    }

    public record LongTermSignal(String qualityNotice, List<CategoryComposition> composition,
                                  List<CategoryTrend> trend, SubscriptionStatus subscriptionStatus) {}

    /**
     * 장기 신호 종합 — 가입 후 경과일수에 따라 노출 범위를 다르게 한다 (plan.md 6.2 데이터 품질 안내 기준).
     * 5일 미만: 구성/추세 노출 안 함, 안내 문구만. 5~13일: 구성 비율만. 14일 이상: 구성 비율+추세.
     * 90일 초과분은 getCategoryComposition/getCategoryTrend 내부의 resolveAnalysisWindowStart에서 이미 제외됨.
     */
    public LongTermSignal getLongTermSignal(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        long daysSinceSignup = Duration.between(user.getCreatedAt(), LocalDateTime.now()).toDays();
        SubscriptionStatus subscriptionStatus = getSubscriptionStatus(userId);

        if (daysSinceSignup < 5) {
            return new LongTermSignal("아직 장기 소비 데이터가 부족해 습관 분석은 제한적이에요.", List.of(), List.of(), subscriptionStatus);
        }
        if (daysSinceSignup < 14) {
            return new LongTermSignal(null, getCategoryComposition(userId), List.of(), subscriptionStatus);
        }
        return new LongTermSignal(null, getCategoryComposition(userId), getCategoryTrend(userId), subscriptionStatus);
    }

    public record Context(Double deliveryIncreaseRate, Double budgetUsageRate, LongTermSignal longTermSignal) {}

    /**
     * 단기 신호(#32)와 장기 신호(#33/#34)를 하나로 합친 최종 Context — Agent(F16)에 그대로 전달될 값.
     */
    public Context getContext(Long userId) {
        return new Context(getDeliveryIncreaseRate(userId), getBudgetUsageRate(userId), getLongTermSignal(userId));
    }
}
