package com.spendmate.service;

import com.spendmate.domain.Budget;
import com.spendmate.domain.Category;
import com.spendmate.domain.Expense;
import com.spendmate.domain.ExpenseInputType;
import com.spendmate.domain.Subscription;
import com.spendmate.domain.User;
import com.spendmate.repository.BudgetRepository;
import com.spendmate.repository.ExpenseRepository;
import com.spendmate.repository.SubscriptionRepository;
import com.spendmate.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
public class ExpenseService {

    private static final List<String> DAY_LABELS = List.of("일", "월", "화", "수", "목", "금", "토");

    private static final Map<Category, String> SAVINGS_SUGGESTIONS = new EnumMap<>(Category.class);
    static {
        SAVINGS_SUGGESTIONS.put(Category.DELIVERY, "배달 대신 학식이나 집밥으로 대체하기");
        SAVINGS_SUGGESTIONS.put(Category.CAFE, "텀블러 지참으로 카페 비용 줄이기");
        SAVINGS_SUGGESTIONS.put(Category.CONVENIENCE_STORE, "편의점 대신 마트에서 한번에 구매하기");
        SAVINGS_SUGGESTIONS.put(Category.MART, "장보기 전 목록을 정리해서 충동구매 줄이기");
        SAVINGS_SUGGESTIONS.put(Category.MEAL_KIT, "밀키트 대신 재료 직접 사서 요리하기");
        SAVINGS_SUGGESTIONS.put(Category.CAMPUS_MEAL, "학식 횟수를 유지해서 외식비 절약하기");
        SAVINGS_SUGGESTIONS.put(Category.SHOPPING, "이번 달 쇼핑 횟수 줄여보기");
        SAVINGS_SUGGESTIONS.put(Category.OTHER, "기타 지출 내역을 다시 점검해보기");
    }
    private static final double SAVINGS_REDUCTION_RATE = 0.2;

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final BudgetRepository budgetRepository;

    public record CategorySummary(Category category, Integer amount, Integer percent) {}
    public record ExpenseSummary(Integer total, List<CategorySummary> categories) {}
    public record DailyAmount(String day, Integer amount) {}

    public ExpenseService(ExpenseRepository expenseRepository, UserRepository userRepository,
                           SubscriptionRepository subscriptionRepository, BudgetRepository budgetRepository) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.budgetRepository = budgetRepository;
    }

    /**
     * 영수증/캡처 없이 사용자가 직접 입력한 지출을 저장한다 (F12).
     */
    public Expense createManual(Long userId, Integer amount, Category category, String memo, LocalDateTime spentAt) {
        if (amount == null || amount == 0) {
            throw new IllegalArgumentException("금액을 입력해주세요.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        Expense expense = new Expense(user, null, null, memo, amount,
                category != null ? category : Category.OTHER,
                spentAt != null ? spentAt : LocalDateTime.now(),
                ExpenseInputType.MANUAL);
        return expenseRepository.save(expense);
    }

    /**
     * 카테고리별 지출 합계 (F5 도넛차트/카테고리 목록용).
     */
    public ExpenseSummary getSummary(Long userId, String period) {
        LocalDateTime start = resolveStart(period);
        List<Expense> expenses = expenseRepository.findByUserIdAndSpentAtBetween(userId, start, LocalDateTime.now());

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
    public List<DailyAmount> getDailySummary(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.minusDays(6).atStartOfDay();
        List<Expense> expenses = expenseRepository.findByUserIdAndSpentAtBetween(userId, start, LocalDateTime.now());

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

    public record RecentExpense(Long id, String name, Category category, Integer amount, LocalDateTime spentAt) {}

    /**
     * 최근 지출 N건 (홈 화면 "최근 지출" 목록/전체보기용). 영수증 상호명이 있으면 그걸, 없으면(수동입력) 메모를 이름으로 쓴다.
     */
    public List<RecentExpense> getRecent(Long userId, int limit) {
        return expenseRepository.findByUserIdOrderBySpentAtDesc(userId, PageRequest.of(0, limit)).stream()
                .map(e -> new RecentExpense(
                        e.getId(),
                        e.getStoreName() != null ? e.getStoreName() : (e.getItemName() != null ? e.getItemName() : "지출"),
                        e.getCategory(),
                        e.getAmount(),
                        e.getSpentAt()
                ))
                .toList();
    }

    public record DailySpend(int day, Integer amount) {}

    /**
     * 이번 달 1일부터 오늘까지, 지출이 있었던 날짜별 합계 (홈 캘린더 점 표시용). 지출 없는 날은 아예 포함하지 않는다.
     */
    public List<DailySpend> getMonthlyDaily(Long userId) {
        LocalDateTime start = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        List<Expense> expenses = expenseRepository.findByUserIdAndSpentAtBetween(userId, start, LocalDateTime.now());

        Map<Integer, Integer> byDay = new TreeMap<>();
        for (Expense expense : expenses) {
            int day = expense.getSpentAt().getDayOfMonth();
            byDay.merge(day, expense.getAmount(), Integer::sum);
        }

        return byDay.entrySet().stream()
                .map(entry -> new DailySpend(entry.getKey(), entry.getValue()))
                .toList();
    }

    public record SavingsMission(Category category, String suggestion, Integer estimatedSaving) {}
    public record SavingsMissionResponse(List<SavingsMission> missions, Integer totalEstimatedSaving) {}

    /**
     * 이번 달 지출 상위 카테고리를 기준으로 절약 미션을 만든다 (마이페이지 생존모드/생존모드 화면 공용).
     * 규칙 기반 추정 — 카테고리 월 지출의 20%를 절약 가능 금액으로 계산한다(가짜 확신도 숫자가 아니라 실제 지출액 기반 추정).
     */
    public SavingsMissionResponse getSavingsMissions(Long userId) {
        List<CategorySummary> categories = getSummary(userId, "month").categories();
        List<SavingsMission> missions = categories.stream()
                .filter(c -> c.amount() > 0)
                .sorted((a, b) -> b.amount() - a.amount())
                .limit(3)
                .map(c -> {
                    int saving = Math.round(c.amount() * (float) SAVINGS_REDUCTION_RATE / 100) * 100;
                    return new SavingsMission(c.category(), SAVINGS_SUGGESTIONS.get(c.category()), saving);
                })
                .toList();
        int total = missions.stream().mapToInt(SavingsMission::estimatedSaving).sum();
        return new SavingsMissionResponse(missions, total);
    }

    public record CategoryChange(Category category, Integer thisMonthAmount, Integer lastMonthAmount, Integer changePercent) {}

    /**
     * 카테고리별 이번 달 vs 지난달 지출 비교 (통계 화면 AI 인사이트용). 지난달 지출이 없는 카테고리는
     * 증감률을 계산할 기준이 없으므로 비교 대상에서 제외한다(0으로 나누거나 임의로 지어내지 않기 위함).
     */
    public List<CategoryChange> getCategoryChanges(Long userId) {
        LocalDateTime thisMonthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime lastMonthStart = thisMonthStart.minusMonths(1);

        Map<Category, Integer> thisMonth = categoryTotals(userId, thisMonthStart, LocalDateTime.now());
        Map<Category, Integer> lastMonth = categoryTotals(userId, lastMonthStart, thisMonthStart.minusNanos(1));

        List<CategoryChange> changes = new ArrayList<>();
        for (Map.Entry<Category, Integer> entry : thisMonth.entrySet()) {
            Integer last = lastMonth.get(entry.getKey());
            if (last == null || last == 0) continue;
            int changePercent = Math.round((entry.getValue() - last) * 100f / last);
            changes.add(new CategoryChange(entry.getKey(), entry.getValue(), last, changePercent));
        }
        return changes;
    }

    private Map<Category, Integer> categoryTotals(Long userId, LocalDateTime start, LocalDateTime end) {
        Map<Category, Integer> totals = new EnumMap<>(Category.class);
        for (Expense expense : expenseRepository.findByUserIdAndSpentAtBetween(userId, start, end)) {
            totals.merge(expense.getCategory(), expense.getAmount(), Integer::sum);
        }
        return totals;
    }

    /**
     * 이번 달 누적 변동비 일평균 (월초부터 오늘까지 데이터로 계산, F6).
     */
    public double getDailyAverageThisMonth(Long userId) {
        int cumulativeSpend = getSummary(userId, "month").total();
        int daysElapsed = LocalDate.now().getDayOfMonth();
        return cumulativeSpend / (double) daysElapsed;
    }

    /**
     * 예산 - 구독 고정비 - 이번 달 누적 지출을 일평균으로 나눠 소진 예상일을 계산한다 (F6).
     * 예산이 설정되지 않았거나 아직 일평균이 0이면(소비 데이터 없음) 예측할 수 없어 null을 반환한다.
     */
    public LocalDate predictDepletionDate(Long userId) {
        Budget budget = budgetRepository.findByUserIdAndCategoryIsNull(userId).orElse(null);
        if (budget == null || budget.getAmount() == null) {
            return null;
        }

        int fixedCost = subscriptionRepository.findByUserId(userId).stream()
                .mapToInt(Subscription::getAmount)
                .sum();
        int cumulativeSpend = getSummary(userId, "month").total();
        double dailyAverage = getDailyAverageThisMonth(userId);
        if (dailyAverage <= 0) {
            return null;
        }

        int remainingBudget = budget.getAmount() - fixedCost - cumulativeSpend;
        long remainingDays = Math.round(remainingBudget / dailyAverage);
        return LocalDate.now().plusDays(remainingDays);
    }
    public record PredictionResponse(LocalDate depletionDate, Double dailyAverage, Integer remainingBudget, String dataQualityNotice, boolean survivalMode) {}

    /**
     * F6 예측 API 응답용 — 소진 예상일 + 일평균 + 남은 예산(고정비/누적지출 차감 후)을 한 번에 반환한다.
     */
    public PredictionResponse getPrediction(Long userId) {
        Budget budget = budgetRepository.findByUserIdAndCategoryIsNull(userId).orElse(null);
        Integer remainingBudget = null;
        if (budget != null && budget.getAmount() != null) {
            int fixedCost = subscriptionRepository.findByUserId(userId).stream()
                    .mapToInt(Subscription::getAmount)
                    .sum();
            int cumulativeSpend = getSummary(userId, "month").total();
            remainingBudget = budget.getAmount() - fixedCost - cumulativeSpend;
        }

        int daysElapsed = LocalDate.now().getDayOfMonth();
        String dataQualityNotice = daysElapsed < 5
                ? "아직 데이터가 적어 예측 정확도가 낮을 수 있어요. 데이터가 쌓일수록 예측이 더 정확해져요."
                : null;

        LocalDate depletionDate = predictDepletionDate(userId);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        boolean survivalMode = depletionDate != null && !depletionDate.isAfter(endOfMonth);

        return new PredictionResponse(depletionDate, getDailyAverageThisMonth(userId), remainingBudget, dataQualityNotice, survivalMode);
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
