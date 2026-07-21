import { describe, it, expect } from 'vitest';

import { isValidGithubId, isValidUuid } from '../../src/utils/validators.js';

describe('isValidGithubId', () => {
    it('영숫자·하이픈으로 된 정상 GitHub 아이디를 허용한다', () => {
        expect(isValidGithubId('kimsunho2000')).toBe(true);
        expect(isValidGithubId('a')).toBe(true);
        expect(isValidGithubId('a-b-c')).toBe(true);
    });

    it('39자를 넘는 아이디는 거부한다', () => {
        expect(isValidGithubId('a'.repeat(40))).toBe(false);
    });

    it('하이픈으로 시작·끝나거나 연속된 아이디는 거부한다 (GitHub 사용자명 규칙)', () => {
        expect(isValidGithubId('-abc')).toBe(false);
        expect(isValidGithubId('abc-')).toBe(false);
        expect(isValidGithubId('ab--c')).toBe(false);
    });

    it('빈 문자열·문자열이 아닌 값·qualifier 조작 문자를 거부한다', () => {
        expect(isValidGithubId('')).toBe(false);
        expect(isValidGithubId(undefined)).toBe(false);
        expect(isValidGithubId(null)).toBe(false);
        expect(isValidGithubId(123)).toBe(false);
        expect(isValidGithubId('kim"OR"1')).toBe(false);
    });
});

describe('isValidUuid', () => {
    it('표준 uuid 형식을 허용한다 (대소문자 무관)', () => {
        expect(isValidUuid('7f9c3b2a-1d4e-4f6a-9b8c-2e5d7a1c3f90')).toBe(true);
        expect(isValidUuid('7F9C3B2A-1D4E-4F6A-9B8C-2E5D7A1C3F90')).toBe(true);
    });

    it('형식이 다른 값은 거부한다', () => {
        expect(isValidUuid('not-a-uuid')).toBe(false);
        expect(isValidUuid('7f9c3b2a-1d4e-4f6a-9b8c')).toBe(false);
        expect(isValidUuid(undefined)).toBe(false);
    });
});
