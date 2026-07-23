// ShowUp riskStats 연동 갱신 헬퍼
// Cloud Functions 배포 전까지 클라이언트에서 직접 갱신한다.
// Firestore Security Rules 에서 riskStats 쓰기를 허용해야 한다.

import type { IncidentCreateInput } from './incidents';
import type { ReservationCreateInput } from './reservations';
import { createIncident, listIncidents } from './incidents';
import {
  createReservation,
  listReservations,
  transitionReservationStatus,
} from './reservations';
import { refreshCustomerRiskStats } from './customers';

export async function createReservationAndRefresh(
  storeId: string,
  customerId: string,
  resId: string,
  input: ReservationCreateInput,
): Promise<void> {
  await createReservation(storeId, resId, input);
  await refreshRiskStats(storeId, customerId);
}

export async function transitionReservationStatusAndRefresh(
  storeId: string,
  customerId: string,
  resId: string,
  nextStatus: Parameters<typeof transitionReservationStatus>[2],
): Promise<void> {
  await transitionReservationStatus(storeId, resId, nextStatus);
  await refreshRiskStats(storeId, customerId);
}

export async function createIncidentAndRefresh(
  storeId: string,
  customerId: string,
  incidentId: string,
  input: IncidentCreateInput,
): Promise<void> {
  await createIncident(storeId, customerId, incidentId, input);
  await refreshRiskStats(storeId, customerId);
}

export async function updateIncidentAndRefresh(
  storeId: string,
  customerId: string,
  incidentId: string,
  input: Partial<IncidentCreateInput>,
): Promise<void> {
  const { updateIncident } = await import('./incidents');
  await updateIncident(storeId, customerId, incidentId, input);
  await refreshRiskStats(storeId, customerId);
}

export async function deleteIncidentAndRefresh(
  storeId: string,
  customerId: string,
  incidentId: string,
): Promise<void> {
  const { deleteIncident } = await import('./incidents');
  await deleteIncident(storeId, customerId, incidentId);
  await refreshRiskStats(storeId, customerId);
}

export async function refreshRiskStats(
  storeId: string,
  customerId: string,
): Promise<void> {
  const [reservations, incidents] = await Promise.all([
    listReservations(storeId, customerId),
    listIncidents(storeId, customerId),
  ]);
  await refreshCustomerRiskStats(storeId, customerId, reservations, incidents);
}
