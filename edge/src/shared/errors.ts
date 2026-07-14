export class SecurityBoundaryError extends Error {
  readonly code: string;
  readonly status: number;
  readonly title: string;

  constructor(status: number, code: string, title: string) {
    super(code);
    this.name = "SecurityBoundaryError";
    this.status = status;
    this.code = code;
    this.title = title;
  }
}

export function asSecurityBoundaryError(error: unknown): SecurityBoundaryError {
  if (error instanceof SecurityBoundaryError) {
    return error;
  }

  return new SecurityBoundaryError(
    500,
    "INTERNAL_SECURITY_BOUNDARY_ERROR",
    "보안 경계 내부 오류가 발생했습니다."
  );
}
