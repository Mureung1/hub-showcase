import { describe, it, expect } from 'vitest';
import { filterVerifiedEvidenceItems, filterVerifiedCitations } from './responseValidation';

describe('filterVerifiedEvidenceItems', () => {
  const hypotheses = [{ hypothesis_id: 'h1' }, { hypothesis_id: 'h2' }];
  const transcript = '진행자: 가격이 너무 비싸다고 느꼈어요.\n사용자: 다음엔 안 살 것 같아요.';

  it('hypothesis_id가 유효하고 quote가 전사문에 실제로 존재하면 통과시켜야 한다', () => {
    const items = [{ hypothesis_id: 'h1', quote: '가격이 너무 비싸다고 느꼈어요.' }];
    expect(filterVerifiedEvidenceItems(items, hypotheses, transcript)).toEqual(items);
  });

  it('존재하지 않는 hypothesis_id를 가리키는 항목은 폐기해야 한다', () => {
    const items = [{ hypothesis_id: 'ghost-id', quote: '가격이 너무 비싸다고 느꼈어요.' }];
    expect(filterVerifiedEvidenceItems(items, hypotheses, transcript)).toEqual([]);
  });

  it('전사문에 존재하지 않는 quote(지어낸 인용)는 폐기해야 한다', () => {
    const items = [{ hypothesis_id: 'h1', quote: '이 문장은 전사문에 없습니다.' }];
    expect(filterVerifiedEvidenceItems(items, hypotheses, transcript)).toEqual([]);
  });

  it('유효한 항목과 무효한 항목이 섞여 있으면 유효한 것만 남겨야 한다', () => {
    const valid = { hypothesis_id: 'h2', quote: '다음엔 안 살 것 같아요.' };
    const invalidId = { hypothesis_id: 'ghost', quote: '다음엔 안 살 것 같아요.' };
    const invalidQuote = { hypothesis_id: 'h1', quote: '지어낸 문장' };
    expect(
      filterVerifiedEvidenceItems([valid, invalidId, invalidQuote], hypotheses, transcript),
    ).toEqual([valid]);
  });

  it('빈 배열이 주어지면 빈 배열을 반환해야 한다', () => {
    expect(filterVerifiedEvidenceItems([], hypotheses, transcript)).toEqual([]);
  });
});

describe('filterVerifiedCitations', () => {
  const evidence = [{ evidence_tag_id: 'e1' }, { evidence_tag_id: 'e2' }];
  const summary = '가격 저항이 확인되었습니다[1]. 재구매 의향도 낮았습니다[2].';

  it('summary에 마커가 존재하고 evidence_tag_id가 유효하면 통과시켜야 한다', () => {
    const citations = [
      { marker: 1, evidence_tag_id: 'e1' },
      { marker: 2, evidence_tag_id: 'e2' },
    ];
    expect(filterVerifiedCitations(citations, summary, evidence)).toEqual(citations);
  });

  it('evidence 목록에 없는 evidence_tag_id를 참조하는 citation은 폐기해야 한다', () => {
    const citations = [{ marker: 1, evidence_tag_id: 'ghost-evidence' }];
    expect(filterVerifiedCitations(citations, summary, evidence)).toEqual([]);
  });

  it('summary 본문에 등장하지 않는 마커를 가리키는 citation은 폐기해야 한다', () => {
    const citations = [{ marker: 99, evidence_tag_id: 'e1' }];
    expect(filterVerifiedCitations(citations, summary, evidence)).toEqual([]);
  });

  it('일부 citation만 유효하면 유효한 것만 남겨야 한다', () => {
    const valid = { marker: 1, evidence_tag_id: 'e1' };
    const invalidEvidence = { marker: 2, evidence_tag_id: 'ghost' };
    expect(filterVerifiedCitations([valid, invalidEvidence], summary, evidence)).toEqual([valid]);
  });

  it('빈 배열이 주어지면 빈 배열을 반환해야 한다', () => {
    expect(filterVerifiedCitations([], summary, evidence)).toEqual([]);
  });
});
