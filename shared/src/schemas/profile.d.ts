import { z } from "zod";
export declare const UserProfileSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
    major: z.ZodDefault<z.ZodNullable<z.ZodEnum<[string, ...string[]]>>>;
    grade: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    enrollmentStatus: z.ZodDefault<z.ZodNullable<z.ZodEnum<["재학", "휴학", "졸업예정", "졸업생"]>>>;
    residenceRegion: z.ZodDefault<z.ZodNullable<z.ZodEnum<[string, ...string[]]>>>;
    incomeBracket: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    age: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    interestTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodDefault<z.ZodDate>;
    updatedAt: z.ZodDefault<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    userId: string;
    major: string | null;
    grade: number | null;
    enrollmentStatus: "재학" | "휴학" | "졸업예정" | "졸업생" | null;
    residenceRegion: string | null;
    incomeBracket: number | null;
    age: number | null;
    interestTags: string[];
    updatedAt: Date;
    id?: string | undefined;
}, {
    userId: string;
    id?: string | undefined;
    createdAt?: Date | undefined;
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: "재학" | "휴학" | "졸업예정" | "졸업생" | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
    updatedAt?: Date | undefined;
}>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export declare const CreateUserProfileSchema: z.ZodObject<{
    major: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodEnum<[string, ...string[]]>>>>;
    grade: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    enrollmentStatus: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodEnum<["재학", "휴학", "졸업예정", "졸업생"]>>>>;
    residenceRegion: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodEnum<[string, ...string[]]>>>>;
    incomeBracket: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    age: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    interestTags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
} & {
    nickname: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nickname?: string | undefined;
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: "재학" | "휴학" | "졸업예정" | "졸업생" | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
}, {
    nickname?: string | undefined;
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: "재학" | "휴학" | "졸업예정" | "졸업생" | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
}>;
export type CreateUserProfileRequest = z.infer<typeof CreateUserProfileSchema>;
export declare const UpdateUserProfileSchema: z.ZodObject<{
    major: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodEnum<[string, ...string[]]>>>>;
    grade: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    enrollmentStatus: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodEnum<["재학", "휴학", "졸업예정", "졸업생"]>>>>;
    residenceRegion: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodEnum<[string, ...string[]]>>>>;
    incomeBracket: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    age: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    interestTags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
} & {
    nickname: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nickname?: string | undefined;
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: "재학" | "휴학" | "졸업예정" | "졸업생" | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
}, {
    nickname?: string | undefined;
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: "재학" | "휴학" | "졸업예정" | "졸업생" | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
}>;
export type UpdateUserProfileRequest = z.infer<typeof UpdateUserProfileSchema>;
//# sourceMappingURL=profile.d.ts.map