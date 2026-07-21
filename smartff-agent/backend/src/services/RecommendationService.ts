/**
 * Recommendation Service
 * Rule Engine V1 — Financial Master Dataset 기반 규칙 평가
 */

import financialService from './financialService';
import { FinancialRecord } from '../types/financial';
import { Recommendation } from '../types/recommendation';

interface Averages {
  categoryAvgWaste: number;
  overallAvgMargin: number;
}

class RecommendationService {
  private calculateCategoryAverageWaste(
    records: FinancialRecord[]
  ): Map<string, number> {
    const byCategory = new Map<string, number[]>();

    for (const r of records) {
      const list = byCategory.get(r.category) ?? [];
      list.push(r.waste_rate);
      byCategory.set(r.category, list);
    }

    const result = new Map<string, number>();
    for (const [category, rates] of byCategory) {
      const avg = rates.reduce((sum, v) => sum + v, 0) / rates.length;
      result.set(category, avg);
    }

    return result;
  }

  private calculateOverallAverageMargin(records: FinancialRecord[]): number {
    return (
      records.reduce((sum, r) => sum + r.margin_rate, 0) / records.length
    );
  }

  private buildMetrics(
    record: FinancialRecord,
    prev: FinancialRecord | undefined,
    averages: Averages
  ): Recommendation['metrics'] {
    return {
      sales_qty: record.sales_qty,
      sales_qty_prev: prev?.sales_qty ?? 0,
      waste_rate: record.waste_rate,
      waste_rate_prev: prev?.waste_rate ?? 0,
      category_avg_waste_rate: Math.round(averages.categoryAvgWaste * 10) / 10,
      margin_rate: record.margin_rate,
      overall_avg_margin_rate: Math.round(averages.overallAvgMargin * 10) / 10,
      net_income: record.net_income,
      net_income_prev: prev?.net_income ?? 0,
    };
  }

  private evaluateSalesUpWasteLow(
    record: FinancialRecord,
    prev: FinancialRecord,
    averages: Averages
  ): Recommendation | null {
    if (
      record.sales_qty > prev.sales_qty &&
      record.waste_rate < averages.categoryAvgWaste &&
      record.net_income > prev.net_income
    ) {
      return {
        category: record.category,
        month: record.month,
        rule: 'SALES_UP_WASTE_LOW',
        severity: 'low',
        title: '발주 확대 검토',
        reason: `${record.category}: 판매량이 늘고, 폐기율(${record.waste_rate.toFixed(
          1
        )}%)은 카테고리 평균(${averages.categoryAvgWaste.toFixed(
          1
        )}%)보다 낮으며, 순이익도 증가했습니다.`,
        metrics: this.buildMetrics(record, prev, averages),
      };
    }

    return null;
  }

  private evaluateSalesDownWasteUp(
    record: FinancialRecord,
    prev: FinancialRecord,
    averages: Averages
  ): Recommendation | null {
    if (
      record.sales_qty < prev.sales_qty &&
      record.waste_rate > prev.waste_rate &&
      record.net_income < prev.net_income
    ) {
      return {
        category: record.category,
        month: record.month,
        rule: 'SALES_DOWN_WASTE_UP',
        severity: 'high',
        title: '발주 축소 검토',
        reason: `${record.category}: 판매량은 줄고 폐기율(${prev.waste_rate.toFixed(
          1
        )}% → ${record.waste_rate.toFixed(1)}%)은 늘었으며, 순이익도 감소했습니다.`,
        metrics: this.buildMetrics(record, prev, averages),
      };
    }

    return null;
  }

  private evaluateLowMargin(
    record: FinancialRecord,
    prev: FinancialRecord | undefined,
    averages: Averages
  ): Recommendation | null {
    if (record.margin_rate < averages.overallAvgMargin) {
      return {
        category: record.category,
        month: record.month,
        rule: 'LOW_MARGIN',
        severity: 'medium',
        title: '수익성 점검 필요',
        reason: `${record.category}: 마진율(${record.margin_rate.toFixed(
          1
        )}%)이 전체 평균(${averages.overallAvgMargin.toFixed(1)}%)보다 낮습니다.`,
        metrics: this.buildMetrics(record, prev, averages),
      };
    }

    return null;
  }

  getRecommendations(): { month: number; data: Recommendation[] } {
    const records = financialService.getAllRecords();

    const latestMonth = Math.max(...records.map((r) => r.month));
    const prevMonth = latestMonth - 1;

    const categoryAvgWasteMap = this.calculateCategoryAverageWaste(records);
    const overallAvgMargin = this.calculateOverallAverageMargin(records);

    const categories = [...new Set(records.map((r) => r.category))];
    const results: Recommendation[] = [];

    for (const category of categories) {
      const current = records.find(
        (r) => r.category === category && r.month === latestMonth
      );
      const prev = records.find(
        (r) => r.category === category && r.month === prevMonth
      );

      if (!current) continue;

      const averages: Averages = {
        categoryAvgWaste: categoryAvgWasteMap.get(category) ?? 0,
        overallAvgMargin,
      };

      if (prev) {
        const expand = this.evaluateSalesUpWasteLow(current, prev, averages);
        if (expand) results.push(expand);

        const reduce = this.evaluateSalesDownWasteUp(current, prev, averages);
        if (reduce) results.push(reduce);
      }

      const lowMargin = this.evaluateLowMargin(current, prev, averages);
      if (lowMargin) results.push(lowMargin);
    }

    return { month: latestMonth, data: results };
  }
}

export default new RecommendationService();
