/**
 * Financial Service
 * Master Dataset 로드 & 데이터 변환
 */

import fs from 'fs';
import path from 'path';
import {
  FinancialRecord,
  FinancialSummary,
  FinancialFilter,
  CategorySummary,
} from '../types/financial';

class FinancialService {
  private data: FinancialRecord[] = [];
  private loaded = false;

  private getCsvPath(): string {
    return path.join(__dirname, '../../..', 'data/master/merged_dataset.csv');
  }

  async loadData(): Promise<void> {
    if (this.loaded) return;

    const csvPath = this.getCsvPath();

    if (!fs.existsSync(csvPath)) {
      throw new Error(`Master Dataset not found at ${csvPath}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) {
      throw new Error('Invalid CSV format: no data rows');
    }

    const headers = lines[0].split(',');
    this.data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) continue;

      const record: FinancialRecord = {
        month: parseInt(values[0], 10),
        category: values[1],
        sales_qty: parseInt(values[2], 10),
        sales_amount: parseInt(values[3], 10),
        avg_selling_price: parseInt(values[4], 10),
        waste_qty: parseInt(values[5], 10),
        waste_amount: parseInt(values[6], 10),
        avg_unit_cost: parseInt(values[7], 10),
        avg_cost_rate: parseFloat(values[8]),
        margin_amount: parseInt(values[9], 10),
        margin_rate: parseFloat(values[10]),
        waste_rate: parseFloat(values[11]),
        net_income: parseInt(values[12], 10),
        net_rate: parseFloat(values[13]),
      };

      this.data.push(record);
    }

    if (this.data.length === 0) {
      throw new Error('Invalid dataset: no records found');
    }

    this.loaded = true;
    console.log(`[Financial] Loaded ${this.data.length} records`);
  }

  async reloadData(): Promise<void> {
    this.loaded = false;
    await this.loadData();
  }

  getSummary(filter?: FinancialFilter): FinancialSummary {
    if (!this.loaded) {
      throw new Error('Data not loaded. Call loadData() first.');
    }

    let filtered = [...this.data];

    if (filter?.months && filter.months.length > 0) {
      filtered = filtered.filter((r) => filter.months!.includes(r.month));
    }

    if (filter?.categories && filter.categories.length > 0) {
      filtered = filtered.filter((r) =>
        filter.categories!.includes(r.category)
      );
    }

    const totalSales = filtered.reduce((sum, r) => sum + r.sales_amount, 0);
    const totalWaste = filtered.reduce((sum, r) => sum + r.waste_amount, 0);
    const totalNetIncome = filtered.reduce((sum, r) => sum + r.net_income, 0);

    const avgMarginRate =
      filtered.length > 0
        ? filtered.reduce((sum, r) => sum + r.margin_rate, 0) / filtered.length
        : 0;

    const avgWasteRate =
      filtered.length > 0
        ? filtered.reduce((sum, r) => sum + r.waste_rate, 0) / filtered.length
        : 0;

    const avgNetRate =
      filtered.length > 0
        ? filtered.reduce((sum, r) => sum + r.net_rate, 0) / filtered.length
        : 0;

    const months = filtered.map((r) => r.month);
    const minMonth = months.length > 0 ? Math.min(...months) : 1;
    const maxMonth = months.length > 0 ? Math.max(...months) : 6;
    const pad = (m: number) => String(m).padStart(2, '0');

    return {
      period: {
        start: `2026-${pad(minMonth)}-01`,
        end: `2026-${pad(maxMonth)}-30`,
      },
      data: filtered,
      summary: {
        total_sales: totalSales,
        total_waste: totalWaste,
        total_net_income: totalNetIncome,
        avg_margin_rate: Math.round(avgMarginRate * 10) / 10,
        avg_waste_rate: Math.round(avgWasteRate * 10) / 10,
        avg_net_rate: Math.round(avgNetRate * 10) / 10,
      },
    };
  }

  getCategorySummary(): CategorySummary[] {
    if (!this.loaded) {
      throw new Error('Data not loaded. Call loadData() first.');
    }

    const categories = [...new Set(this.data.map((r) => r.category))];

    return categories.map((cat) => {
      const catData = this.data.filter((r) => r.category === cat);
      const totalSales = catData.reduce((sum, r) => sum + r.sales_amount, 0);
      const avgMarginRate =
        catData.reduce((sum, r) => sum + r.margin_rate, 0) / catData.length;
      const avgWasteRate =
        catData.reduce((sum, r) => sum + r.waste_rate, 0) / catData.length;
      const avgNetRate =
        catData.reduce((sum, r) => sum + r.net_rate, 0) / catData.length;

      return {
        category: cat,
        months: catData.length,
        total_sales: totalSales,
        avg_margin_rate: Math.round(avgMarginRate * 10) / 10,
        avg_waste_rate: Math.round(avgWasteRate * 10) / 10,
        avg_net_rate: Math.round(avgNetRate * 10) / 10,
      };
    });
  }

  getMonthSummary(month: number): FinancialRecord[] {
    if (!this.loaded) {
      throw new Error('Data not loaded. Call loadData() first.');
    }

    return this.data.filter((r) => r.month === month);
  }

  getAllRecords(): FinancialRecord[] {
    if (!this.loaded) {
      throw new Error('Data not loaded. Call loadData() first.');
    }

    return this.data;
  }
}

export default new FinancialService();
