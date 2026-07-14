// ShowUp riskStats 연동 갱신 헬퍼
// 예약 상태 변경/사건 생성/수정/삭제 후 호출하면, 관련 customer 의 riskStats 를 재계산한다.
// MVP 초기에는 클라이언트에서 직접 호출. 이후 Cloud Function 으로 이전 예정.

import type { IncidentCreateInput } from './incidents';
import type { ReservationCreateInput } from './reservations';
import { transitionReservationStatus } from './reservations';
import { listIncidents } from './incidents';
import { createIncident, updateIncident, deleteIncident } from './incidents';
import { createReservation } from './reservations';
import { getReservationsByCustomer } from './reservations';
import { refreshCustomerRiskStats } from './customers';

type ReservationStatus = Parameters<typeof transitionReservationStatus>[2];

/**
 * 예약 상태를 변경하고, 해당 고객의 riskStats 를 재계산한다.
 */
export async function transitionReservationStatusAndRefresh(
  storeId: string,
  customerId: string,
  resId: string,
  nextStatus: ReservationStatus,
  now?: Date,
): Promise<void> {
  await transitionReservationStatus(storeId, resId, nextStatus, now);
  await refreshRiskStats(storeId, customerId);
}

/**
 * 사건을 생성하고, 해당 고객의 riskStats 를 재계산한다.
 */
export async function createIncidentAndRefresh(
  storeId: string,
  customerId: string,
  incidentId: string,
  input: IncidentCreateInput,
): Promise<void> {
  await createIncident(storeId, customerId, incidentId, input);
  await refreshRiskStats(storeId, customerId);
}

/**
 * 사건을 수정하고, 해당 고객의 riskStats 를 재계산한다.
 */
export async function updateIncidentAndRefresh(
  storeId: string,
  customerId: string,
  incidentId: string,
  input: Partial<IncidentCreateInput>,
): Promise<void> {
  await updateIncident(storeId, customerId, incidentId, input);
  await refreshRiskStats(storeId, customerId);
}

/**
 * 사건을 삭제하고, 해당 고객의 riskStats 를 재계산한다.
 */
export async function deleteIncidentAndRefresh(
  storeId: string,
  customerId: string,
  incidentId: string,
): Promise<void> {
  await deleteIncident(storeId, customerId, incidentId);
  await refreshRiskStats(storeId, customerId);
}

/**
 * 예약을 생성하고, 해당 고객의 riskStats 를 재계산한다.
 * status=pending 인 경우 riskStats 에 영향 없지만, 일관성을 위해 동일 패턴 사용.
 */
export async function createReservationAndRefresh(
  storeId: string,
  customerId: string,
  resId: string,
  input: Omit<ReservationCreateInput, 'customerId'>,
): Promise<void> {
  await createReservation(storeId, resId, { ...input, customerId });
  await refreshRiskStats(storeId, customerId);
}

/**
 * 고객의 전체 예약과 사건 이력을 조회해 riskStats 를 재계산/갱신한다.
 */
export async function refreshRiskStats(
  storeId: string,
  customerId: string,
): Promise<void> {
  const reservations = await getReservationsByCustomer(storeId, customerId);
  const incidents = await listIncidents(storeId, customerId);
  await refreshCustomerRiskStats(storeId, customerId, reservations, incidents);
}
