import { describe, it, expect } from 'vitest';

import { judgeDifficulty, scoreItem } from '../../src/services/recommendationService.js';

describe('judgeDifficulty', () => {
    it('good first issue 라벨이 있으면 easy (다른 라벨과 같이 있어도 최우선)', () => {
        expect(judgeDifficulty(['good first issue'])).toBe('easy');
        expect(judgeDifficulty(['enhancement', 'good first issue'])).toBe('easy');
    });

    it('help wanted 라벨만 있으면 medium', () => {
        expect(judgeDifficulty(['help wanted'])).toBe('medium');
    });

    it('입문 라벨이 없으면 hard로 취급한다', () => {
        expect(judgeDifficulty(['enhancement'])).toBe('hard');
        expect(judgeDifficulty([])).toBe('hard');
    });

    it('라벨 대소문자를 구분하지 않는다', () => {
        expect(judgeDifficulty(['Good First Issue'])).toBe('easy');
        expect(judgeDifficulty(['HELP WANTED'])).toBe('medium');
    });
});

describe('scoreItem', () => {
    const baseRepo = {
        primaryLanguage: 'JavaScript',
        languages: ['JavaScript', 'TypeScript'],
        stars: 100,
        pushedAt: new Date().toISOString(),
        goodFirstIssueCount: 0,
        helpWantedIssueCount: 0,
        topics: [],
    };
    const basePreferences = { languages: ['javascript'], difficulty: 'easy', topics: [] };

    it('주 언어 일치가 부분 언어 일치보다 점수가 높다', () => {
        const primaryMatch = scoreItem(baseRepo, 'easy', basePreferences, 'beginner');
        const secondaryMatch = scoreItem(
            { ...baseRepo, primaryLanguage: 'TypeScript' },
            'easy',
            basePreferences,
            'beginner',
        );
        expect(primaryMatch.score).toBeGreaterThan(secondaryMatch.score);
    });

    it('skillLevel과 이슈 난이도가 정합하면(beginner+easy) 더 높은 점수를 받는다', () => {
        const matched = scoreItem(baseRepo, 'easy', basePreferences, 'beginner');
        const mismatched = scoreItem(baseRepo, 'easy', basePreferences, 'advanced');
        expect(matched.score).toBeGreaterThan(mismatched.score);
    });

    it('스타 수가 많을수록 점수가 높되 100점을 넘지 않는다', () => {
        const lowStars = scoreItem({ ...baseRepo, stars: 20 }, 'easy', basePreferences, 'beginner');
        const highStars = scoreItem({ ...baseRepo, stars: 200000 }, 'easy', basePreferences, 'beginner');
        expect(highStars.score).toBeGreaterThan(lowStars.score);
        expect(highStars.score).toBeLessThanOrEqual(100);
    });

    it('관심 주제 유사어(ml → machine-learning)를 인식해 가점한다', () => {
        // 다른 가점 요인(언어·난이도·스타·활동성·이슈문화)을 전부 0으로 눌러 주제 가점만 남긴다
        const isolatedRepo = {
            primaryLanguage: 'Rust',
            languages: ['Rust'],
            stars: 0,
            pushedAt: new Date('2000-01-01').toISOString(),
            goodFirstIssueCount: 0,
            helpWantedIssueCount: 0,
            topics: ['machine-learning'],
        };
        const isolatedPreferences = { languages: ['javascript'], difficulty: 'hard', topics: ['ml'] };

        const withTopic = scoreItem(isolatedRepo, 'easy', isolatedPreferences, 'beginner');
        const withoutTopic = scoreItem({ ...isolatedRepo, topics: [] }, 'easy', isolatedPreferences, 'beginner');

        expect(withTopic.score).toBeGreaterThan(withoutTopic.score);
        expect(withTopic.reason).toContain('관심 주제');
    });
});
