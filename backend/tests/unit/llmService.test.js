import { describe, it, expect } from 'vitest';

import { isValidLlmAnalysis, isValidBatchRerankResult } from '../../src/services/llmService.js';

describe('isValidLlmAnalysis', () => {
    it('issueSummary·requiredSkills·guide를 모두 갖춘 정상 응답을 허용한다', () => {
        expect(isValidLlmAnalysis({
            issueSummary: '툴팁 위치 계산 버그예요.',
            requiredSkills: ['JavaScript', 'DOM'],
            guide: ['레포를 포크해요.', 'PR을 올려요.'],
        })).toBe(true);
    });

    it('requiredSkills는 빈 배열이어도 허용한다', () => {
        expect(isValidLlmAnalysis({
            issueSummary: '요약',
            requiredSkills: [],
            guide: ['가이드 1단계'],
        })).toBe(true);
    });

    it('issueSummary가 없거나 빈 문자열이면 거부한다', () => {
        expect(isValidLlmAnalysis({ requiredSkills: [], guide: ['a'] })).toBe(false);
        expect(isValidLlmAnalysis({ issueSummary: '', requiredSkills: [], guide: ['a'] })).toBe(false);
        expect(isValidLlmAnalysis({ issueSummary: '   ', requiredSkills: [], guide: ['a'] })).toBe(false);
    });

    it('requiredSkills/guide가 배열이 아니거나 문자열이 아닌 원소를 포함하면 거부한다', () => {
        expect(isValidLlmAnalysis({ issueSummary: 'x', requiredSkills: 'JavaScript', guide: ['a'] })).toBe(false);
        expect(isValidLlmAnalysis({ issueSummary: 'x', requiredSkills: [1, 2], guide: ['a'] })).toBe(false);
        expect(isValidLlmAnalysis({ issueSummary: 'x', requiredSkills: [], guide: 'a' })).toBe(false);
        expect(isValidLlmAnalysis({ issueSummary: 'x', requiredSkills: [], guide: [1] })).toBe(false);
    });

    it('guide가 빈 배열이면 거부한다 (최소 1단계는 있어야 함)', () => {
        expect(isValidLlmAnalysis({ issueSummary: 'x', requiredSkills: [], guide: [] })).toBe(false);
    });

    it('requiredSkills가 6개를 넘으면 거부한다 (상한 초과 응답 방어)', () => {
        expect(isValidLlmAnalysis({
            issueSummary: 'x',
            requiredSkills: Array.from({ length: 7 }, (_, i) => `skill${i}`),
            guide: ['a'],
        })).toBe(false);
    });

    it('guide가 6개를 넘으면 거부한다 (상한 초과 응답 방어)', () => {
        expect(isValidLlmAnalysis({
            issueSummary: 'x',
            requiredSkills: [],
            guide: Array.from({ length: 7 }, (_, i) => `step${i}`),
        })).toBe(false);
    });

    it('객체가 아니거나 null/undefined면 거부한다', () => {
        expect(isValidLlmAnalysis(null)).toBe(false);
        expect(isValidLlmAnalysis(undefined)).toBe(false);
        expect(isValidLlmAnalysis('not an object')).toBe(false);
        expect(isValidLlmAnalysis([])).toBe(false);
    });
});

describe('isValidBatchRerankResult', () => {
    const itemCount = 3;

    it('index·-15~15 범위의 adjustment·non-empty reason을 갖춘 배열을 허용한다', () => {
        expect(isValidBatchRerankResult([
            { index: 0, adjustment: 8, reason: '프로필의 최근 기여 언어와 잘 맞아요' },
            { index: 2, adjustment: -15, reason: '이슈 설명이 불명확해요' },
        ], itemCount)).toBe(true);
    });

    it('일부 항목만 응답해도 허용한다 (모델이 일부를 건너뛸 수 있음)', () => {
        expect(isValidBatchRerankResult([{ index: 1, adjustment: 0, reason: 'x' }], itemCount)).toBe(true);
    });

    it('빈 배열이거나 itemCount를 넘는 길이면 거부한다', () => {
        expect(isValidBatchRerankResult([], itemCount)).toBe(false);
        expect(isValidBatchRerankResult(Array.from({ length: 4 }, () => ({ index: 0, adjustment: 0, reason: 'x' })), itemCount)).toBe(false);
    });

    it('index가 범위를 벗어나거나 정수가 아니면 거부한다', () => {
        expect(isValidBatchRerankResult([{ index: -1, adjustment: 0, reason: 'x' }], itemCount)).toBe(false);
        expect(isValidBatchRerankResult([{ index: 3, adjustment: 0, reason: 'x' }], itemCount)).toBe(false);
        expect(isValidBatchRerankResult([{ index: 1.5, adjustment: 0, reason: 'x' }], itemCount)).toBe(false);
    });

    it('adjustment가 범위를 벗어나거나 정수가 아니면 거부한다', () => {
        expect(isValidBatchRerankResult([{ index: 0, adjustment: 16, reason: 'x' }], itemCount)).toBe(false);
        expect(isValidBatchRerankResult([{ index: 0, adjustment: -16, reason: 'x' }], itemCount)).toBe(false);
        expect(isValidBatchRerankResult([{ index: 0, adjustment: 5.5, reason: 'x' }], itemCount)).toBe(false);
    });

    it('reason이 없거나 빈 문자열/공백이면 그 배열 전체를 거부한다', () => {
        expect(isValidBatchRerankResult([{ index: 0, adjustment: 0 }], itemCount)).toBe(false);
        expect(isValidBatchRerankResult([{ index: 0, adjustment: 0, reason: '   ' }], itemCount)).toBe(false);
    });

    it('배열이 아니거나 null/undefined면 거부한다', () => {
        expect(isValidBatchRerankResult(null, itemCount)).toBe(false);
        expect(isValidBatchRerankResult(undefined, itemCount)).toBe(false);
        expect(isValidBatchRerankResult('not an array', itemCount)).toBe(false);
        expect(isValidBatchRerankResult({}, itemCount)).toBe(false);
    });
});
