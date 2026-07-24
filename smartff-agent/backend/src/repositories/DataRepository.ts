import { FinancialRecord } from '../types/financial';

// v2.0: PostgresDataRepository로 교체 예정
export interface DataRepository {
  load(): Promise<FinancialRecord[]>;
}
