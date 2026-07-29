import { z } from "zod";
export declare const UserProfileSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
    major: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    grade: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    enrollmentStatus: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    residenceRegion: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    incomeBracket: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    age: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    interestTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodDefault<z.ZodDate>;
    updatedAt: z.ZodDefault<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    major: string | null;
    grade: number | null;
    enrollmentStatus: string | null;
    residenceRegion: string | null;
    incomeBracket: number | null;
    age: number | null;
    interestTags: string[];
    createdAt: Date;
    updatedAt: Date;
    id?: string | undefined;
}, {
    userId: string;
    id?: string | undefined;
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: string | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export declare const CreateUserProfileSchema: z.ZodObject<{
    major: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodString>>>;
    grade: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    enrollmentStatus: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodString>>>;
    residenceRegion: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodString>>>;
    incomeBracket: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    age: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    interestTags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
} & {
    nickname: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: string | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
    nickname?: string | undefined;
}, {
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: string | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
    nickname?: string | undefined;
}>;
export type CreateUserProfileRequest = z.infer<typeof CreateUserProfileSchema>;
export declare const UpdateUserProfileSchema: z.ZodObject<{
    major: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodString>>>;
    grade: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    enrollmentStatus: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodString>>>;
    residenceRegion: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodString>>>;
    incomeBracket: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    age: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    interestTags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
} & {
    nickname: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: string | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
    nickname?: string | undefined;
}, {
    major?: string | null | undefined;
    grade?: number | null | undefined;
    enrollmentStatus?: string | null | undefined;
    residenceRegion?: string | null | undefined;
    incomeBracket?: number | null | undefined;
    age?: number | null | undefined;
    interestTags?: string[] | undefined;
    nickname?: string | undefined;
}>;
export type UpdateUserProfileRequest = z.infer<typeof UpdateUserProfileSchema>;
//# sourceMappingURL=profile.d.ts.map