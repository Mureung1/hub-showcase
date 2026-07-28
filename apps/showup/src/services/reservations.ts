import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firestore';
import type { Reservation } from '../types/schema';

export interface ReservationWithId extends Reservation {
  id: string;
}

const reservationsRef = (storeId: string) => collection(db, 'stores', storeId, 'reservations');
const customersRef = (storeId: string) => collection(db, 'stores', storeId, 'customers');
const customerRef = (storeId: string, customerId: string) =>
  doc(db, 'stores', storeId, 'customers', customerId);
const reservationRef = (storeId: string, resId: string) =>
  doc(db, 'stores', storeId, 'reservations', resId);

export interface ReservationCreateInput {
  customerId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  memo?: string;
}

export interface ReservationUpdateInput {
  date?: string;
  time?: string;
  memo?: string;
}

function isSameDay(dateStr: string, at: Date): boolean {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  return dateStr === todayStr;
}

export async function getReservation(
  storeId: string,
  resId: string,
): Promise<ReservationWithId | null> {
  const snap = await getDoc(reservationRef(storeId, resId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Reservation) };
}

export async function listReservations(
  storeId: string,
  customerId?: string,
): Promise<ReservationWithId[]> {
  const q = customerId
    ? query(reservationsRef(storeId), where('customerId', '==', customerId))
    : query(reservationsRef(storeId), orderBy('date', 'desc'), orderBy('time', 'desc'));
  const existingCustomerIdsPromise = customerId
    ? getDoc(customerRef(storeId, customerId)).then((snapshot) =>
        snapshot.exists() ? new Set([customerId]) : new Set<string>(),
      )
    : getDocs(customersRef(storeId)).then(
        (snapshot) => new Set(snapshot.docs.map((customer) => customer.id)),
      );
  const [snap, existingCustomerIds] = await Promise.all([
    getDocs(q),
    existingCustomerIdsPromise,
  ]);
  const reservations = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Reservation) }))
    .filter((reservation) => existingCustomerIds.has(reservation.customerId));

  if (customerId) {
    reservations.sort((a, b) =>
      `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
    );
  }

  return reservations;
}

export async function listTodayReservations(
  storeId: string,
  today = new Date(),
): Promise<ReservationWithId[]> {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const q = query(
    reservationsRef(storeId),
    where('date', '==', todayStr),
    orderBy('time', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Reservation) }));
}

export async function createReservation(
  storeId: string,
  resId: string,
  input: ReservationCreateInput,
): Promise<Reservation> {
  const data: Reservation = {
    customerId: input.customerId,
    date: input.date,
    time: input.time,
    status: 'pending',
    cancelledSameDay: false,
    statusChangedAt: null,
    memo: input.memo ?? '',
    createdAt: serverTimestamp(),
  };
  await setDoc(reservationRef(storeId, resId), data);
  return data;
}

export async function updateReservation(
  storeId: string,
  resId: string,
  input: ReservationUpdateInput,
): Promise<void> {
  const updates: Partial<Reservation> = {};
  if (input.date !== undefined) updates.date = input.date;
  if (input.time !== undefined) updates.time = input.time;
  if (input.memo !== undefined) updates.memo = input.memo;
  await updateDoc(reservationRef(storeId, resId), updates);
}

/**
 * 예약 상태를 변경한다.
 * status 가 'cancelled' 이고, 변경 시점이 예약일과 같으면 cancelledSameDay=true.
 */
export async function transitionReservationStatus(
  storeId: string,
  resId: string,
  nextStatus: Reservation['status'],
  now = new Date(),
): Promise<void> {
  const reservation = await getReservation(storeId, resId);
  if (!reservation) return;
  if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
    throw new Error('방문 처리 전 예약만 상태를 변경할 수 있습니다.');
  }

  const updates: Partial<Reservation> = {
    status: nextStatus,
    statusChangedAt:
      nextStatus === 'visited' || nextStatus === 'noShow' || nextStatus === 'cancelled'
        ? serverTimestamp()
        : null,
  };

  if (nextStatus === 'cancelled') {
    updates.cancelledSameDay = isSameDay(reservation.date, now);
  } else if (nextStatus === 'visited' || nextStatus === 'noShow') {
    updates.cancelledSameDay = false;
  }

  await updateDoc(reservationRef(storeId, resId), updates);
}

export async function deleteReservation(storeId: string, resId: string): Promise<void> {
  await deleteDoc(reservationRef(storeId, resId));
}

/**
 * 고객의 전체 예약 이력을 조회한다. riskStats 갱신용.
 */
export async function getReservationsByCustomer(
  storeId: string,
  customerId: string,
): Promise<ReservationWithId[]> {
  return listReservations(storeId, customerId);
}
