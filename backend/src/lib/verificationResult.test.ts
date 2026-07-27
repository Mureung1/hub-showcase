import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('./geminiClient', () => ({
  generateStructuredJson: vi.fn(),
}));

import { supabase } from './supabaseClient';
import { generateStructuredJson } from './geminiClient';
import { generateVerificationResult } from './verificationResult';

describe('generateVerificationResult persist 옵션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const params = {
    hypothesisId: 'h1',
    cause: '원인',
    effect: '결과',
    evidence: [{ evidence_tag_id: 'e1', quote: '인용', speaker: '화자', badge_label: '지지 근거' }],
  };

  it('persist:false면 supabase를 전혀 호출하지 않고 합성 id로 레코드를 반환해야 한다(eval의 DB 오염 방지)', async () => {
    vi.mocked(generateStructuredJson).mockResolvedValue({
      summary: '요약[1]',
      direction: '원인 축소',
      key_evidence: '핵심 근거',
      citations: [{ marker: 1, evidence_tag_id: 'e1' }],
      suggested_status: '유력함',
    });

    const result = await generateVerificationResult({ ...params, persist: false });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.id).toEqual(expect.any(String));
    expect(result.hypothesis_id).toBe('h1');
    expect(result.suggested_status).toBe('유력함');
  });

  it('evidence가 비어 있으면 persist:false에서도 Gemini를 호출하지 않고 폴백값을 반환해야 한다', async () => {
    const result = await generateVerificationResult({ ...params, evidence: [], persist: false });

    expect(generateStructuredJson).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.suggested_status).toBe('근거 부족');
  });

  it('persist 기본값(true)에서는 기존처럼 verification_results에 upsert해야 한다', async () => {
    vi.mocked(generateStructuredJson).mockResolvedValue({
      summary: '요약[1]',
      direction: '원인 축소',
      key_evidence: '핵심 근거',
      citations: [{ marker: 1, evidence_tag_id: 'e1' }],
      suggested_status: '유력함',
    });
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'row1' }, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
    vi.mocked(supabase.from).mockReturnValue({ upsert: upsertMock } as never);

    const result = await generateVerificationResult(params);

    expect(supabase.from).toHaveBeenCalledWith('verification_results');
    expect(result).toEqual({ id: 'row1' });
  });
});
