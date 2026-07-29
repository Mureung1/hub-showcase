import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchCommands } from './searchService.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchCommands', () => {
  describe('정상 케이스', () => {
    it('성공 응답이면 서버가 준 results 배열을 그대로 반환한다', async () => {
      const mockResults = [{ id: 'unix-ls', name: 'ls' }];
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: mockResults }),
      }));

      const result = await searchCommands('unix', 'ls');

      expect(result).toEqual(mockResults);
    });

    it('category/query를 쿼리스트링으로 직렬화해서 올바른 URL로 fetch를 호출한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await searchCommands('unix', 'ls');

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/search?category=unix&q=ls');
    });
  });

  describe('빈 값 / 경계값 케이스', () => {
    it('검색어에 공백이 있으면 URLSearchParams가 자동으로 인코딩한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await searchCommands('unix', 'git log');

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/search?category=unix&q=git+log');
    });

    it('서버가 빈 배열을 돌려주면 빈 배열을 그대로 반환한다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      }));

      const result = await searchCommands('unix', 'xyz');

      expect(result).toEqual([]);
    });
  });

  describe('실패 케이스 (핵심 초점)', () => {
    it('fetch 자체가 실패하면(네트워크 문제) "서버에 연결할 수 없습니다" 메시지를 던진다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(searchCommands('unix', 'ls')).rejects.toThrow(
        '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.'
      );
    });

    it('서버가 4xx로 응답하면 "검색 요청 중 서버에서 오류가 발생했습니다" 메시지를 던진다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

      await expect(searchCommands('unknown-category', 'ls')).rejects.toThrow(
        '검색 요청 중 서버에서 오류가 발생했습니다.'
      );
    });

    it('서버가 5xx로 응답해도 상태 코드와 무관하게 같은 메시지를 던진다 (status는 조건에 안 쓰임)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      await expect(searchCommands('unix', 'ls')).rejects.toThrow(
        '검색 요청 중 서버에서 오류가 발생했습니다.'
      );
    });

    it('응답이 성공(ok)이어도 본문이 유효한 JSON이 아니면 방어 로직이 없어 그 에러가 그대로 전파된다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }));

      await expect(searchCommands('unix', 'ls')).rejects.toThrow(SyntaxError);
    });
  });
});
