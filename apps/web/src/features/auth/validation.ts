import { z } from "zod";

/**
 * 회원가입·로그인 폼의 클라이언트 검증 (SPEC-AUTH-001 3장).
 * - 이메일 형식
 * - 비밀번호 최소 8자 (결정 2-2, Supabase 대시보드 설정과 일치)
 * - 비밀번호 확인 일치 (회원가입)
 *
 * 필드별 inline 에러로 표시하기 위해 각 필드 메시지를 한국어로 둔다.
 */
export const PASSWORD_MIN_LENGTH = 8;

const emailField = z.string().trim().pipe(z.email({ message: "올바른 이메일 주소를 입력해주세요." }));
const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.` });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
});

export const signupSchema = z
  .object({
    email: emailField,
    password: passwordField,
    passwordConfirm: z.string().min(1, { message: "비밀번호를 다시 입력해주세요." }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;

/** 필드명 → 에러 메시지 맵. 통과 시 빈 객체를 반환한다. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

function collectFieldErrors<K extends string>(
  issues: z.core.$ZodIssue[],
): FieldErrors<K> {
  const errors: FieldErrors<K> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as K] = issue.message;
    }
  }
  return errors;
}

export function validateLogin(values: LoginFormValues): FieldErrors<keyof LoginFormValues & string> {
  const result = loginSchema.safeParse(values);
  return result.success ? {} : collectFieldErrors(result.error.issues);
}

export function validateSignup(
  values: SignupFormValues,
): FieldErrors<keyof SignupFormValues & string> {
  const result = signupSchema.safeParse(values);
  return result.success ? {} : collectFieldErrors(result.error.issues);
}
