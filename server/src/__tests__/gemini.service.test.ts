import { describe, it, expect, vi } from 'vitest';
import { transformQuery, evaluatePapersWithRAG } from '../services/gemini.service.js';

// Mock @google/generative-ai with standard function constructor
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockImplementation(() => ({
  generateContent: mockGenerateContent
}));

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(function (this: any) {
      this.getGenerativeModel = mockGetGenerativeModel;
    }),
    SchemaType: {
      STRING: 'STRING',
      ARRAY: 'ARRAY',
      OBJECT: 'OBJECT',
      INTEGER: 'INTEGER'
    }
  };
});

describe('Gemini Service Unit Tests (2-Phase Agentic Search)', () => {
  it('Phase 1: transformQuery should translate natural language query into English academic search term', async () => {
    process.env.GEMINI_API_KEY = 'mock-api-key';

    mockGenerateContent.mockResolvedValueOnce({
      response: Promise.resolve({
        text: () => JSON.stringify({
          searchKeyword: 'Transformer model optimization flashattention pruning',
          reasoning: 'Translated Korean query to key English academic terms.'
        })
      })
    });

    const result = await transformQuery({
      major: 'computer science AI',
      keywords: ['transformer'],
      query: '트랜스포머 모델 최적화 기법'
    });

    expect(result.searchKeyword).toBe('Transformer model optimization flashattention pruning');
  });

  it('Phase 2: evaluatePapersWithRAG should evaluate candidates with Context Retention', async () => {
    process.env.GEMINI_API_KEY = 'mock-api-key';

    const mockResponsePapers = [
      {
        paperId: 'paper-101',
        title: 'FlashAttention: Fast and Memory-Efficient Exact Attention',
        authors: ['Tri Dao'],
        channel: 'NeurIPS',
        year: 2022,
        matchScore: 96,
        url: 'https://arxiv.org/abs/2205.14135',
        ovgBreakdown: {
          originality: 98,
          validity: 95,
          generalizability: 95
        },
        reasoning: '트랜스포머 모델의 어텐션 메모리 병목을 대폭 개선함.',
        insights: {
          background: '트랜스포머 모델의 길어지는 시퀀스 길이 문제',
          coreMethod: 'IO 인식 기반 어텐션 알고리즘 설계',
          quantitativeResult: '기존 어텐션 대비 2~4배 속도 향상'
        }
      }
    ];

    mockGenerateContent.mockResolvedValueOnce({
      response: Promise.resolve({
        text: () => JSON.stringify({ papers: mockResponsePapers })
      })
    });

    const papers = await evaluatePapersWithRAG(
      [
        {
          paperId: 'paper-101',
          title: 'FlashAttention',
          authors: ['Tri Dao'],
          abstract: 'Fast attention algorithm',
          year: 2022
        }
      ],
      {
        major: 'computer science AI',
        keywords: ['attention'],
        query: '트랜스포머 모델 최적화 기법'
      }
    );

    expect(papers.length).toBe(1);
    expect(papers[0].paperId).toBe('paper-101');
    expect(papers[0].insights.background).toBeDefined();
    expect(papers[0].insights.coreMethod).toBeDefined();
    expect(papers[0].insights.quantitativeResult).toBeDefined();
  });
});
