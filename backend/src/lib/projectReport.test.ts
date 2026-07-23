import { describe, it, expect, vi } from 'vitest';

// Supabase 클라이언트 모듈 모킹 (테스트 실행 시 실제 DB 연결 방지 및 env 검사 우회)
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { filterReportByHypothesisIds, type ProjectReport } from './projectReport';

describe('filterReportByHypothesisIds', () => {
  // 테스트용 Mock 데이터 정의
  const mockReport: ProjectReport = {
    project: {
      id: 'p1',
      title: 'Test Project',
      problem_definition: 'Test Problem Definition',
      additional_notes: null,
      save_status: 'draft',
      share_token: 'token123',
      created_at: '2026-07-23T00:00:00Z',
    },
    hypotheses: [
      {
        id: 'h1',
        display_index: 0,
        cause: 'Cause 1',
        effect: 'Effect 1',
        status: '검토 전',
        verification_status: '유력함',
        verification_result: null,
        evidence_tags: [],
      },
      {
        id: 'h2',
        display_index: 1,
        cause: 'Cause 2',
        effect: 'Effect 2',
        status: '검토 전',
        verification_status: '근거 부족',
        verification_result: null,
        evidence_tags: [],
      },
      {
        id: 'h3',
        display_index: 2,
        cause: 'Cause 3',
        effect: 'Effect 3',
        status: '검토 전',
        verification_status: '수정 필요',
        verification_result: null,
        evidence_tags: [],
      },
    ],
  };

  // 1. 정상 케이스 (Happy Path)
  describe('Happy Path (정상 케이스)', () => {
    it('should filter only the single specified hypothesis ID', () => {
      const result = filterReportByHypothesisIds(mockReport, 'h1');
      expect(result.hypotheses).toHaveLength(1);
      expect(result.hypotheses[0].id).toBe('h1');
      // 원래 프로젝트 정보가 유지되는지 확인
      expect(result.project.id).toBe('p1');
    });

    it('should filter multiple specified hypothesis IDs', () => {
      const result = filterReportByHypothesisIds(mockReport, 'h1,h3');
      expect(result.hypotheses).toHaveLength(2);
      expect(result.hypotheses.map(h => h.id)).toEqual(['h1', 'h3']);
    });

    it('should ignore whitespaces around hypothesis IDs', () => {
      const result = filterReportByHypothesisIds(mockReport, '  h1  ,  h2  ');
      expect(result.hypotheses).toHaveLength(2);
      expect(result.hypotheses.map(h => h.id)).toEqual(['h1', 'h2']);
    });
  });

  // 2. 빈 값 및 누락 케이스 (Empty / Missing Inputs)
  describe('Empty / Missing Inputs (빈 값 및 누락 케이스)', () => {
    it('should return the original report when idsParam is undefined', () => {
      const result = filterReportByHypothesisIds(mockReport, undefined);
      expect(result).toBe(mockReport); // 참조값이 같은지 확인 (불필요한 가공 유무 검사)
    });

    it('should return the original report when idsParam is empty string', () => {
      const result = filterReportByHypothesisIds(mockReport, '');
      expect(result).toBe(mockReport);
    });

    it('should return the original report when idsParam consists of only commas and spaces', () => {
      const result = filterReportByHypothesisIds(mockReport, ' , , ');
      expect(result).toBe(mockReport);
    });
  });

  // 3. 경계값 및 특이 케이스 (Boundary / Exceptional Cases)
  describe('Boundary Cases (경계값 및 특이 케이스)', () => {
    it('should handle empty hypotheses array in project report gracefully', () => {
      const emptyReport: ProjectReport = {
        ...mockReport,
        hypotheses: [],
      };
      const result = filterReportByHypothesisIds(emptyReport, 'h1');
      expect(result.hypotheses).toHaveLength(0);
    });

    it('should handle duplicate IDs in idsParam and return unique matches', () => {
      const result = filterReportByHypothesisIds(mockReport, 'h1,h1');
      expect(result.hypotheses).toHaveLength(1);
      expect(result.hypotheses[0].id).toBe('h1');
    });

    it('should handle consecutive commas in idsParam by filtering empty tokens out', () => {
      const result = filterReportByHypothesisIds(mockReport, 'h1,,h2');
      expect(result.hypotheses).toHaveLength(2);
      expect(result.hypotheses.map(h => h.id)).toEqual(['h1', 'h2']);
    });
  });

  // 4. 실패 및 매칭 없음 케이스 (Negative Cases / No Matches)
  describe('Negative Cases (실패 및 매칭 없음 케이스)', () => {
    it('should return empty hypotheses list if non-existent ID is passed', () => {
      const result = filterReportByHypothesisIds(mockReport, 'ghost-id');
      expect(result.hypotheses).toHaveLength(0);
    });

    it('should filter only existing IDs when mixed with non-existent IDs', () => {
      const result = filterReportByHypothesisIds(mockReport, 'h1,ghost-id');
      expect(result.hypotheses).toHaveLength(1);
      expect(result.hypotheses[0].id).toBe('h1');
    });
  });
});
