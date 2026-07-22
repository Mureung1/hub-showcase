// ShowUp 서비스 함수 헬퍼: Firebase 에러를 ShowUpError 로 통일

import { wrapFirestoreError } from '../utils/errors';

export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw wrapFirestoreError(error);
  }
}
