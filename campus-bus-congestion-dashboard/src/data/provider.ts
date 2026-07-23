import type { Campus } from '../types';

export type ProviderStatus = 'ready' | 'partial' | 'pending';

export interface BusDataProvider {
  id: string;
  label: string;
  status: ProviderStatus;
  campuses: Campus[];
  notice: string;
}

export const sharedProvider: BusDataProvider = {
  id: 'shared',
  label: '공통 기준선',
  status: 'pending',
  campuses: [],
  notice: '이 브랜치는 공통 UI와 데이터 공급자 인터페이스만 관리합니다. 데모 또는 경북대 실사용 브랜치에서 실행하세요.',
};
