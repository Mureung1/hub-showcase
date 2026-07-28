// ShowUp Firebase Auth 서비스
// 이메일/비밀번호 인증 및 회원가입 후 가게 문서 생성 플로우

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface SignUpInput {
  email: string;
  password: string;
  storeName: string;
  storeCategory: string;
  agreedToPrivacy: boolean;
}

export interface SignInInput {
  email: string;
  password: string;
}

/**
 * 이메일/비밀번호 회원가입.
 * 개인정보 동의 체크는 클라이언트에서 먼저 검증하고 호출한다.
 */
export async function signUp({
  email,
  password,
  storeName,
  storeCategory,
  agreedToPrivacy,
}: SignUpInput): Promise<User> {
  if (!agreedToPrivacy) {
    throw new Error('개인정보 수집·이용에 동의해야 가입할 수 있습니다.');
  }

  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: storeName });

  // 회원가입 직후 stores 문서 생성
  const { createStore } = await import('./stores');
  await createStore(user.uid, {
    ownerUid: user.uid,
    name: storeName,
    category: storeCategory,
  });

  return user;
}

export async function signIn({ email, password }: SignInInput): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
