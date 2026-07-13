// ShowUp 가게 생성 플로우
// 회원가입 시 Firebase Auth uid 를 storeId 로 사용하여 stores 문서를 생성한다.

import type { User } from 'firebase/auth';
import { createStore } from './stores';

export interface CreateStoreInput {
  ownerUid: string;
  name: string;
  category: string;
}

/**
 * 회원가입 성공 후 호출. ownerUid 를 storeId 로 사용해 가게 문서를 생성한다.
 */
export async function createStoreWithUser(
  user: User,
  storeName: string,
  storeCategory: string,
): Promise<void> {
  await createStore(user.uid, {
    ownerUid: user.uid,
    name: storeName,
    category: storeCategory,
  });
}

export { createStore } from './stores';
export { getStore } from './stores';
