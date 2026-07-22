// ShowUp 서비스 레이어 에러 클래스 및 핸들러

export class ShowUpError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ShowUpError';
  }
}

export class NotFoundError extends ShowUpError {
  constructor(resource: string) {
    super(`${resource} 를 찾을 수 없습니다.`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends ShowUpError {
  constructor(message = '권한이 없습니다.') {
    super(message, 'PERMISSION_DENIED');
    this.name = 'PermissionError';
  }
}

export class ValidationError extends ShowUpError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export function isShowUpError(error: unknown): error is ShowUpError {
  return error instanceof ShowUpError;
}

/**
 * Firebase Firestore 에러를 ShowUpError 로 변환한다.
 */
export function wrapFirestoreError(error: unknown): ShowUpError {
  if (error instanceof ShowUpError) return error;

  if (error instanceof Error) {
    const message = error.message;
    if (message.includes('permission-denied')) {
      return new PermissionError('Firestore 접근 권한이 없습니다.');
    }
    if (message.includes('not-found')) {
      return new NotFoundError('문서');
    }
    if (message.includes('already-exists')) {
      return new ValidationError('이미 존재하는 데이터입니다.');
    }
    return new ShowUpError(message, 'FIRESTORE_ERROR');
  }

  return new ShowUpError('알 수 없는 오류가 발생했습니다.', 'UNKNOWN_ERROR');
}
