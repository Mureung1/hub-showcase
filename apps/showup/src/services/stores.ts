import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firestore';
import type { Store } from '../types/schema';

const storeRef = (storeId: string) => doc(db, 'stores', storeId);

export async function getStore(storeId: string): Promise<Store | null> {
  const snap = await getDoc(storeRef(storeId));
  if (!snap.exists()) return null;
  return snap.data() as Store;
}

export async function createStore(
  storeId: string,
  data: Omit<Store, 'createdAt'>,
): Promise<void> {
  await setDoc(storeRef(storeId), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateStore(
  storeId: string,
  data: Partial<Pick<Store, 'name' | 'category'>>,
): Promise<void> {
  await updateDoc(storeRef(storeId), data);
}
