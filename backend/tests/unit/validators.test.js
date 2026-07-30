import { describe, it, expect } from 'vitest';

import {
    isValidGithubId,
    isValidUuid,
    isValidRepoFullName,
    isValidIssueNumber,
    isValidPreferences,
} from '../../src/utils/validators.js';

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

describe('isValidRepoFullName', () => {
    it('owner/repo 형식을 허용한다 (점·하이픈 포함 이름도)', () => {
        expect(isValidRepoFullName('facebook/react')).toBe(true);
        expect(isValidRepoFullName('vercel/next.js')).toBe(true);
        expect(isValidRepoFullName('my-org/my-repo')).toBe(true);
    });

    it('슬래시가 없거나 2개 이상인 값은 거부한다', () => {
        // githubService.fetchIssueBody가 split('/')로 owner/repo를 분해하므로 형식이 어긋나면 엉뚱한 경로를 호출한다
        expect(isValidRepoFullName('react')).toBe(false);
        expect(isValidRepoFullName('facebook/react/issues')).toBe(false);
        expect(isValidRepoFullName('/react')).toBe(false);
        expect(isValidRepoFullName('facebook/')).toBe(false);
    });

    it('문자열이 아닌 값·빈 문자열을 거부한다', () => {
        expect(isValidRepoFullName('')).toBe(false);
        expect(isValidRepoFullName(undefined)).toBe(false);
        expect(isValidRepoFullName(null)).toBe(false);
        expect(isValidRepoFullName(['facebook', 'react'])).toBe(false);
    });
});

describe('isValidIssueNumber', () => {
    it('1 이상의 정수를 허용한다', () => {
        expect(isValidIssueNumber(1)).toBe(true);
        expect(isValidIssueNumber(31337)).toBe(true);
    });

    it('0·음수·소수·정수 아닌 값을 거부한다', () => {
        expect(isValidIssueNumber(0)).toBe(false);
        expect(isValidIssueNumber(-1)).toBe(false);
        expect(isValidIssueNumber(1.5)).toBe(false);
        expect(isValidIssueNumber(NaN)).toBe(false);
        expect(isValidIssueNumber(Infinity)).toBe(false);
    });

    it('숫자로 보이는 문자열도 거부한다 (JSON 본문에서 문자열로 넘어오는 경우)', () => {
        expect(isValidIssueNumber('1')).toBe(false);
        expect(isValidIssueNumber(undefined)).toBe(false);
        expect(isValidIssueNumber(null)).toBe(false);
    });
});

describe('isValidPreferences', () => {
    it('languages와 difficulty만 있어도 통과한다 (topics는 선택)', () => {
        expect(isValidPreferences({ languages: ['javascript'], difficulty: 'easy' })).toBe(true);
    });

    it('languages가 없거나 비어있거나 10개를 넘으면 거부한다', () => {
        expect(isValidPreferences({ difficulty: 'easy' })).toBe(false);
        expect(isValidPreferences({ languages: [], difficulty: 'easy' })).toBe(false);
        expect(isValidPreferences({ languages: Array(11).fill('javascript'), difficulty: 'easy' })).toBe(false);
    });

    it('language 문자열이 패턴을 벗어나면 거부한다 (qualifier 조작 방지)', () => {
        expect(isValidPreferences({ languages: ['javascript" OR "1'], difficulty: 'easy' })).toBe(false);
        expect(isValidPreferences({ languages: [123], difficulty: 'easy' })).toBe(false);
    });

    it('difficulty가 easy/medium/hard가 아니면 거부한다', () => {
        expect(isValidPreferences({ languages: ['javascript'], difficulty: 'expert' })).toBe(false);
        expect(isValidPreferences({ languages: ['javascript'] })).toBe(false);
    });

    it('topics는 10개를 넘거나 패턴을 벗어나면 거부하고, 유니코드는 허용한다', () => {
        expect(isValidPreferences({ languages: ['javascript'], difficulty: 'easy', topics: Array(11).fill('web') })).toBe(false);
        expect(isValidPreferences({ languages: ['javascript'], difficulty: 'easy', topics: ['<script>'] })).toBe(false);
        expect(isValidPreferences({ languages: ['javascript'], difficulty: 'easy', topics: ['머신러닝'] })).toBe(true);
    });

    it('preferences가 객체가 아니면 거부한다', () => {
        expect(isValidPreferences(null)).toBe(false);
        expect(isValidPreferences(undefined)).toBe(false);
        expect(isValidPreferences('easy')).toBe(false);
    });
});
