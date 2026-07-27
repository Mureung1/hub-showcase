import fs from 'fs';
import path from 'path';
import { DataRepository } from './DataRepository';
import { FinancialRecord } from '../types/financial';

export class CsvDataRepository implements DataRepository {
  private getCsvPath(): string {
    return path.join(__dirname, '../../..', 'data/master/merged_dataset.csv');
  }

  async load(): Promise<FinancialRecord[]> {
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
    const records: FinancialRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) continue;

      records.push({
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
      });
    }

    if (records.length === 0) {
      throw new Error('Invalid dataset: no records found');
    }

    return records;
  }
}
