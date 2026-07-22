import { http, HttpResponse } from 'msw';

export const handlers = [
  // 1. POST /api/curate 가로채기 (큐레이션 결과 Mock 반환 - id 유령 필드 배제)
  http.post('http://localhost:5000/api/curate', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        papers: [
          {
            paperId: 'paper-001',
            title: 'Lost in the Middle: How Language Models Use Long Contexts',
            authors: 'Nelson F. Liu, Kevin Lin',
            channel: 'arXiv',
            year: 2023,
            matchScore: 98,
            insights: {
              background: '긴 컨텍스트 내에서 중간 정보 유실 문제 제기.',
              coreMethod: '입력 데이터 내 타깃 위치 변화에 따른 정확도 U자 곡선 증명.',
              quantitativeResult: '중간 정보 유실 시 모델 정확도 최대 40% 이상 하락.'
            }
          }
        ]
      }
    });
  }),

  // 2. POST /api/library 가로채기 (서재 보관 DTO 반환 - id 유령 필드 배제)
  http.post('http://localhost:5000/api/library', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        userId: 'test-user-uuid',
        paperId: 'paper-001',
        title: 'Lost in the Middle: How Language Models Use Long Contexts',
        authors: 'Nelson F. Liu, Kevin Lin',
        channel: 'arXiv',
        year: 2023,
        matchScore: 98,
        createdAt: new Date().toISOString()
      }
    }, { status: 201 });
  })
];
