import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import type { FirestoreEvent, Change } from 'firebase-functions/v2/firestore';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

import { calculateRiskStats } from './risk';

initializeApp();
const db = getFirestore();

interface ReservationDoc {
  customerId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'visited' | 'noShow' | 'cancelled';
  cancelledSameDay: boolean;
  statusChangedAt?: unknown | null;
  memo: string;
  createdAt: unknown;
}

interface IncidentDoc {
  type: 'abuse' | 'dispute' | 'late' | 'unreasonable';
  memo: string;
  occurredAt: unknown;
  createdAt: unknown;
}

/**
 * 예약 문서가 생성/수정/삭제될 때 해당 고객의 riskStats 를 재계산한다.
 * Blaze 이관 시 Firestore Security Rules 에서 riskStats 직접 쓰기를 차단하고,
 * 이 Cloud Function 을 유일한 갱신 경로로 사용한다.
 */
export const recalculateRiskOnReservationChange = onDocumentWritten(
  'stores/{storeId}/reservations/{reservationId}',
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const storeId = event.params.storeId;
    const afterData = event.data?.after?.data() as ReservationDoc | undefined;
    const beforeData = event.data?.before?.data() as ReservationDoc | undefined;
    const customerIds = new Set(
      [afterData?.customerId, beforeData?.customerId].filter(
        (value): value is string => Boolean(value),
      ),
    );

    await Promise.all(
      [...customerIds].map((customerId) =>
        recalculateAndSaveRiskStats(storeId, customerId),
      ),
    );
  },
);

/**
 * 사건 문서가 생성/수정/삭제될 때 해당 고객의 riskStats 를 재계산한다.
 */
export const recalculateRiskOnIncidentChange = onDocumentWritten(
  'stores/{storeId}/customers/{customerId}/incidents/{incidentId}',
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const storeId = event.params.storeId;
    const customerId = event.params.customerId;

    await recalculateAndSaveRiskStats(storeId, customerId);
  },
);

async function recalculateAndSaveRiskStats(
  storeId: string,
  customerId: string,
): Promise<void> {
  const customerRef = db
    .collection('stores')
    .doc(storeId)
    .collection('customers')
    .doc(customerId);
  if (!(await customerRef.get()).exists) return;

  const reservationsSnap = await db
    .collection('stores')
    .doc(storeId)
    .collection('reservations')
    .where('customerId', '==', customerId)
    .get();

  const incidentsSnap = await db
    .collection('stores')
    .doc(storeId)
    .collection('customers')
    .doc(customerId)
    .collection('incidents')
    .get();

  const reservations = reservationsSnap.docs.map((d) => d.data() as ReservationDoc);
  const incidents = incidentsSnap.docs.map((d) => d.data() as IncidentDoc);

  const stats = calculateRiskStats({ reservations, incidents });

  await customerRef.update({ riskStats: stats });
}
