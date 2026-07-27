import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('./geminiClient', () => ({
  generateStructuredJson: vi.fn(),
}));

import { supabase } from './supabaseClient';
import { generateStructuredJson } from './geminiClient';
import { tagHypothesesFromTranscript } from './hypothesisTagger';

describe('tagHypothesesFromTranscript persist 옵션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const hypotheses = [{ hypothesis_id: 'h1', cause: '원인', effect: '결과' }];
  const transcript = '진행자: 질문\n사용자: 실제로 있었던 답변';

  it('persist:false면 supabase를 전혀 호출하지 않고 합성 id로 레코드를 반환해야 한다(eval의 DB 오염 방지)', async () => {
    vi.mocked(generateStructuredJson).mockResolvedValue([
      { hypothesis_id: 'h1', quote: '실제로 있었던 답변', speaker: '사용자', badge_label: '지지 근거' },
    ]);

    const result = await tagHypothesesFromTranscript({
      interviewId: 'iv1',
      transcript,
      hypotheses,
      persist: false,
    });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: expect.any(String),
        hypothesis_id: 'h1',
        interview_id: 'iv1',
        quote: '실제로 있었던 답변',
        speaker: '사용자',
        badge_label: '지지 근거',
      },
    ]);
  });

  it('persist 기본값(true)에서는 기존처럼 evidence_tags에 INSERT해야 한다', async () => {
    vi.mocked(generateStructuredJson).mockResolvedValue([
      { hypothesis_id: 'h1', quote: '실제로 있었던 답변', speaker: '사용자', badge_label: '지지 근거' },
    ]);
    const selectMock = vi.fn().mockResolvedValue({ data: [{ id: 'row1' }], error: null });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never);

    const result = await tagHypothesesFromTranscript({ interviewId: 'iv1', transcript, hypotheses });

    expect(supabase.from).toHaveBeenCalledWith('evidence_tags');
    expect(result).toEqual([{ id: 'row1' }]);
  });
});
