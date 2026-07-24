import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchScenarios, fetchScenarioById } from './scenariosService.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchScenarios', () => {
  it('성공 응답이면 서버가 준 results 배열을 그대로 반환한다', async () => {
    const mockResults = [{ id: 'submit-assignment', title: '과제 제출하기' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: mockResults }),
    }));

    const result = await fetchScenarios();

    expect(result).toEqual(mockResults);
  });

  it('올바른 URL로 fetch를 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchScenarios();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/scenarios');
  });

  it('fetch 자체가 실패하면(네트워크 문제) "서버에 연결할 수 없습니다" 메시지를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchScenarios()).rejects.toThrow(
      '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.'
    );
  });

  it('서버가 5xx로 응답하면 "요청 중 서버에서 오류가 발생했습니다" 메시지를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(fetchScenarios()).rejects.toThrow(
      '요청 중 서버에서 오류가 발생했습니다.'
    );
  });
});

describe('fetchScenarioById', () => {
  it('성공 응답이면 시나리오 객체를 그대로 반환한다', async () => {
    const mockScenario = { id: 'submit-assignment', title: '과제 제출하기', command_ids: ['git-add'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockScenario),
    }));

    const result = await fetchScenarioById('submit-assignment');

    expect(result).toEqual(mockScenario);
  });

  it('존재하지 않는 id(404)면 에러를 던지지 않고 null을 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const result = await fetchScenarioById('no-such-scenario');

    expect(result).toBeNull();
  });

  it('id를 URL 경로에 그대로 포함해서 fetch를 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'submit-assignment' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchScenarioById('submit-assignment');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/scenarios/submit-assignment');
  });

  it('fetch 자체가 실패하면(네트워크 문제) "서버에 연결할 수 없습니다" 메시지를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchScenarioById('submit-assignment')).rejects.toThrow(
      '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.'
    );
  });
});
