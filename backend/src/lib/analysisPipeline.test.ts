import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('./hypothesisTagger', () => ({
  tagHypothesesFromTranscript: vi.fn(),
}));
vi.mock('./verificationResult', () => ({
  generateVerificationResult: vi.fn(),
}));

import { supabase } from './supabaseClient';
import { tagHypothesesFromTranscript } from './hypothesisTagger';
import { generateVerificationResult } from './verificationResult';
import { runAnalysisPipeline } from './analysisPipeline';

describe('runAnalysisPipeline persist 옵션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const hypotheses = [{ id: 'h1', cause: '원인', effect: '결과' }];
  const interviews = [{ id: 'iv1', transcript: '진행자: 질문\n사용자: 답변' }];

  it('persist:false면 하위 단계에도 persist:false를 전달하고 hypotheses.verification_status UPDATE를 건너뛰어야 한다', async () => {
    vi.mocked(tagHypothesesFromTranscript).mockResolvedValue([
      { id: 'e1', hypothesis_id: 'h1', interview_id: 'iv1', quote: '답변', speaker: '사용자', badge_label: '지지 근거' },
    ]);
    vi.mocked(generateVerificationResult).mockResolvedValue({
      id: 'v1',
      hypothesis_id: 'h1',
      summary: '요약',
      direction: '원인 축소',
      key_evidence: '핵심',
      citations: [],
      suggested_status: '유력함',
    });

    await runAnalysisPipeline({ hypotheses, interviews, persist: false });

    expect(tagHypothesesFromTranscript).toHaveBeenCalledWith(
      expect.objectContaining({ persist: false }),
    );
    expect(generateVerificationResult).toHaveBeenCalledWith(
      expect.objectContaining({ persist: false }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('persist 기본값(true)에서는 기존처럼 hypotheses.verification_status를 UPDATE해야 한다', async () => {
    vi.mocked(tagHypothesesFromTranscript).mockResolvedValue([]);
    vi.mocked(generateVerificationResult).mockResolvedValue({
      id: 'v1',
      hypothesis_id: 'h1',
      summary: '요약',
      direction: '원인 축소',
      key_evidence: '핵심',
      citations: [],
      suggested_status: '유력함',
    });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never);

    await runAnalysisPipeline({ hypotheses, interviews });

    expect(supabase.from).toHaveBeenCalledWith('hypotheses');
    expect(updateMock).toHaveBeenCalledWith({ verification_status: '유력함' });
  });
});
