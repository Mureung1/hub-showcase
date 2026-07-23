/**
 * Pattern Service
 * 요일별/시간대별 판매 패턴 (data/master/weekday_sales.csv, hourly_sales.csv) 로드 & 조회
 */

import fs from 'fs';
import path from 'path';
import { WeekdayPatternRecord, HourlyPatternRecord } from '../types/pattern';

class PatternService {
  private weekdayData: WeekdayPatternRecord[] = [];
  private hourlyData: HourlyPatternRecord[] = [];
  private loaded = false;

  private getCsvPath(filename: string): string {
    return path.join(__dirname, '../../..', 'data/master', filename);
  }

  async loadData(): Promise<void> {
    if (this.loaded) return;

    this.weekdayData = this.loadWeekdayCsv();
    this.hourlyData = this.loadHourlyCsv();

    this.loaded = true;
    console.log(
      `[Pattern] Loaded ${this.weekdayData.length} weekday records, ${this.hourlyData.length} hourly records`
    );
  }

  async reloadData(): Promise<void> {
    this.loaded = false;
    await this.loadData();
  }

  private loadWeekdayCsv(): WeekdayPatternRecord[] {
    const csvPath = this.getCsvPath('weekday_sales.csv');

    if (!fs.existsSync(csvPath)) {
      throw new Error(`Weekday pattern dataset not found at ${csvPath}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');

    const records: WeekdayPatternRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) continue;

      records.push({
        month: values[0],
        category: values[1],
        weekday: values[2],
        avg_sales_amount: parseInt(values[3], 10),
      });
    }

    return records;
  }

  private loadHourlyCsv(): HourlyPatternRecord[] {
    const csvPath = this.getCsvPath('hourly_sales.csv');

    if (!fs.existsSync(csvPath)) {
      throw new Error(`Hourly pattern dataset not found at ${csvPath}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');

    const records: HourlyPatternRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) continue;

      records.push({
        month: values[0],
        category: values[1],
        hour: parseInt(values[2], 10),
        avg_sales_amount: parseInt(values[3], 10),
      });
    }

    return records;
  }

  // 카테고리별로 실제 존재하는 가장 최신 월을 고른다 (여러 달이 쌓여도 프론트는 최신월 스냅샷만 봄)
  private latestMonthFor(records: { month: string; category: string }[], category: string): string | undefined {
    const months = records.filter((r) => r.category === category).map((r) => r.month);
    if (months.length === 0) return undefined;
    return months.reduce((a, b) => (b > a ? b : a));
  }

  getWeekdayPattern(category: string): { month: string | null; data: WeekdayPatternRecord[] } {
    if (!this.loaded) {
      throw new Error('Data not loaded. Call loadData() first.');
    }

    const month = this.latestMonthFor(this.weekdayData, category);
    if (!month) return { month: null, data: [] };

    return { month, data: this.weekdayData.filter((r) => r.category === category && r.month === month) };
  }

  getHourlyPattern(category: string): { month: string | null; data: HourlyPatternRecord[] } {
    if (!this.loaded) {
      throw new Error('Data not loaded. Call loadData() first.');
    }

    const month = this.latestMonthFor(this.hourlyData, category);
    if (!month) return { month: null, data: [] };

    return { month, data: this.hourlyData.filter((r) => r.category === category && r.month === month) };
  }
}

export default new PatternService();
