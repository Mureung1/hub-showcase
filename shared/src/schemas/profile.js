import { z } from "zod";
import { CANONICAL_MAJORS, CANONICAL_REGIONS, ENROLLMENT_STATUS_TYPES } from "../constants/taxonomy";
// 사용자 프로필 Zod 스키마
export const UserProfileSchema = z.object({
    id: z.string().uuid().optional(),
    userId: z.string().uuid(),
    major: z.enum(CANONICAL_MAJORS).nullable().default(null),
    grade: z.number().int().min(1).max(4).nullable().default(null),
    enrollmentStatus: z.enum(ENROLLMENT_STATUS_TYPES).nullable().default(null),
    residenceRegion: z.enum(CANONICAL_REGIONS).nullable().default(null),
    incomeBracket: z.number().int().min(1).max(10).nullable().default(null),
    age: z.number().int().min(18).max(100).nullable().default(null),
    interestTags: z.array(z.string()).default([]),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
});
// 프로필 생성/업데이트 요청 스키마 (프론트엔드에서 전송)
export const CreateUserProfileSchema = UserProfileSchema.pick({
    major: true,
    grade: true,
    enrollmentStatus: true,
    residenceRegion: true,
    incomeBracket: true,
    age: true,
    interestTags: true,
}).partial().extend({
    nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다').max(20, '닉네임은 20자 이하여야 합니다').optional(),
});
export const UpdateUserProfileSchema = CreateUserProfileSchema.extend({
    nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다').max(20, '닉네임은 20자 이하여야 합니다').optional(),
});
//# sourceMappingURL=profile.js.map