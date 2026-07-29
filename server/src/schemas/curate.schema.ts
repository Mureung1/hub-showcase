import { z } from 'zod';

export const curateSchema = z.object({
  major: z.string().trim().optional().default('computer science AI'),
  keywords: z.array(z.string().trim()).optional().default([]),
  query: z.string().trim().min(2, { message: '연구 질문(Query)은 최소 2글자 이상 입력해야 합니다.' }),
  lang: z.enum(['KO', 'EN']).optional().default('KO')
});

export const queryTransformZodSchema = z.object({
  searchKeyword: z.string().min(2),
  reasoning: z.string().optional()
});

export const benchmarkZodSchema = z.object({
  papers: z.array(z.object({
    paperId: z.string().min(1),
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    channel: z.string().min(1),
    year: z.number().int().min(1900),
    matchScore: z.number().int().min(0).max(100),
    url: z.string().optional().default(''),
    ovgBreakdown: z.object({
      originality: z.number().int().min(0).max(100),
      validity: z.number().int().min(0).max(100),
      generalizability: z.number().int().min(0).max(100)
    }),
    reasoning: z.string().min(1),
    insights: z.object({
      background: z.string().min(1),
      coreMethod: z.string().min(1),
      quantitativeResult: z.string().min(1)
    })
  })).min(0).max(5)
});

export const librarySchema = z.object({
  paper: z.object({
    paperId: z.string().trim().min(1, { message: 'paperId는 필수값입니다.' }),
    title: z.string().trim().min(1, { message: '논문 제목은 필수값입니다.' }),
    authors: z.string().trim().min(1, { message: '저자 정보는 필수값입니다.' }),
    channel: z.string().trim().min(1, { message: '학술 채널은 필수값입니다.' }),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1, { message: '올바른 발행 연도가 아닙니다.' }),
    matchScore: z.number().int().min(0).max(100, { message: '매칭 스코어는 0에서 100 사이여야 합니다.' }),
    userId: z.string().trim().min(1, { message: '유효한 형식의 userId가 필요합니다.' }),
    url: z.string().optional().default('')
  })
});
