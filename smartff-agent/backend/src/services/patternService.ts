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
        category: values[0],
        weekday: values[1],
        avg_sales_amount: parseInt(values[2], 10),
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
        category: values[0],
        hour: parseInt(values[1], 10),
        avg_sales_amount: parseInt(values[2], 10),
      });
    }

    return records;
  }

  getWeekdayPattern(category: string): WeekdayPatternRecord[] {
    if (!this.loaded) {
      throw new Error('Data not loaded. Call loadData() first.');
    }

    return this.weekdayData.filter((r) => r.category === category);
  }

  getHourlyPattern(category: string): HourlyPatternRecord[] {
    if (!this.loaded) {
      throw new Error('Data not loaded. Call loadData() first.');
    }

    return this.hourlyData.filter((r) => r.category === category);
  }
}

export default new PatternService();
