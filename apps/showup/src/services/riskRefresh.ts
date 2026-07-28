// ShowUp riskStats 연동 갱신 헬퍼
// Cloud Functions 미배포 환경에서 사용하는 MVP용 클라이언트 갱신 경로.
// 서버 트리거를 배포하면 이 모듈을 제거하고 Rules에서 riskStats 쓰기를 차단한다.

import type { IncidentCreateInput } from './incidents';
import type { ReservationCreateInput } from './reservations';
import {
  createIncident,
  deleteIncident,
  listIncidents,
  updateIncident,
} from './incidents';
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
  await updateIncident(storeId, customerId, incidentId, input);
  await refreshRiskStats(storeId, customerId);
}

export async function deleteIncidentAndRefresh(
  storeId: string,
  customerId: string,
  incidentId: string,
): Promise<void> {
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
