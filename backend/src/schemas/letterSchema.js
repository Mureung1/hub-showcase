// 편지 작성 요청 바디 검증 스키마.
// authorId는 클라이언트가 보내지 않는다 (서버가 고정 익명값으로 채운다).
import { z } from 'zod'

export const createLetterSchema = z.object({
  title: z.string().max(100, '제목은 100자 이내로 적어주세요.').optional(),
  content: z
    .string()
    .min(100, '편지 내용은 100자 이상 적어주세요.')
    .max(5000, '편지는 5000자를 넘을 수 없어요.'),
  envelope: z.enum(['basic', 'lined', 'wax'], {
    message: '봉투 종류를 선택해주세요.',
  }),
})

// 답장 작성 바디 검증. 답장은 봉투 선택 화면이 없어 envelope을 받지 않는다(서버가 'basic' 고정).
export const replyLetterSchema = z.object({
  title: z.string().max(100, '제목은 100자 이내로 적어주세요.').optional(),
  content: z
    .string()
    .min(100, '편지 내용은 100자 이상 적어주세요.')
    .max(5000, '편지는 5000자를 넘을 수 없어요.'),
})
