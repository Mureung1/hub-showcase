// ShowUp 위험도 계산 순수 함수 (Cloud Functions 용 복사본)
// apps/showup/src/utils/risk.ts 와 동기화 유지 필요.

export const RISK_WEIGHTS = {
  noShow: 8,
  lateCancel: 4,
  late: 2,
  abuse: 10,
  dispute: 6,
  unreasonable: 4,
  visited: -1,
  recentNoShow: 5,
} as const;

export const RISK_LEVELS = {
  low: { min: 0, max: 23 },
  medium: { min: 24, max: 39 },
  high: { min: 40, max: Number.POSITIVE_INFINITY },
} as const;

type IncidentType = 'abuse' | 'dispute' | 'late' | 'unreasonable';
type ReservationStatus = 'pending' | 'confirmed' | 'visited' | 'noShow' | 'cancelled';

interface Reservation {
  customerId: string;
  date: string;
  time: string;
  status: ReservationStatus;
  cancelledSameDay: boolean;
  statusChangedAt?: unknown | null;
  memo: string;
  createdAt: unknown;
}

interface Incident {
  type: IncidentType;
  memo: string;
  occurredAt: unknown;
  createdAt: unknown;
}

interface RiskStats {
  totalVisits: number;
  noShowCount: number;
  lateCancelCount: number;
  incidentCounts: Record<IncidentType, number>;
  score: number;
  lastNoShowAt: unknown | null;
  updatedAt: unknown;
}

interface RiskInputs {
  reservations: Reservation[];
  incidents: Incident[];
  now?: Date;
}

const INCIDENT_WEIGHTS: Record<IncidentType, number> = {
  abuse: RISK_WEIGHTS.abuse,
  dispute: RISK_WEIGHTS.dispute,
  late: RISK_WEIGHTS.late,
  unreasonable: RISK_WEIGHTS.unreasonable,
};

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function getReservationEventDate(reservation: Reservation): Date | null {
  return toDate(reservation.statusChangedAt) ?? toDate(reservation.createdAt);
}

export function calculateRiskStats(
  inputs: RiskInputs,
  base: Partial<RiskStats> = {},
): RiskStats {
  const { reservations, incidents, now = new Date() } = inputs;

  let totalVisits = base.totalVisits ?? 0;
  let noShowCount = base.noShowCount ?? 0;
  let lateCancelCount = base.lateCancelCount ?? 0;

  for (const r of reservations) {
    if (r.status === 'visited') {
      totalVisits += 1;
    } else if (r.status === 'noShow') {
      noShowCount += 1;
    } else if (r.status === 'cancelled' && r.cancelledSameDay) {
      lateCancelCount += 1;
    }
  }

  const incidentCounts: RiskStats['incidentCounts'] = {
    abuse: 0,
    dispute: 0,
    late: 0,
    unreasonable: 0,
  };

  for (const incident of incidents) {
    incidentCounts[incident.type] += 1;
  }

  const incidentScore = Object.entries(incidentCounts).reduce(
    (sum, [type, count]) => sum + INCIDENT_WEIGHTS[type as IncidentType] * count,
    0,
  );

  const reservationScore =
    noShowCount * RISK_WEIGHTS.noShow +
    lateCancelCount * RISK_WEIGHTS.lateCancel +
    totalVisits * RISK_WEIGHTS.visited;

  const recentThresholdDays = 30;
  const recentThresholdMs = recentThresholdDays * 24 * 60 * 60 * 1000;
  let hasRecentNoShow = false;
  let lastNoShowAt: RiskStats['lastNoShowAt'] = base.lastNoShowAt ?? null;

  for (const r of reservations) {
    if (r.status !== 'noShow') continue;
    const eventDate = getReservationEventDate(r);
    if (!eventDate) continue;
    const lastNoShowDate = lastNoShowAt ? toDate(lastNoShowAt) : null;
    if (!lastNoShowDate || lastNoShowDate < eventDate) {
      lastNoShowAt = r.statusChangedAt ?? r.createdAt;
    }
    const diffMs = now.getTime() - eventDate.getTime();
    if (diffMs >= 0 && diffMs <= recentThresholdMs) {
      hasRecentNoShow = true;
    }
  }

  const recentNoShowScore = hasRecentNoShow ? RISK_WEIGHTS.recentNoShow : 0;

  const score = Math.max(
    0,
    reservationScore + incidentScore + recentNoShowScore,
  );

  return {
    totalVisits,
    noShowCount,
    lateCancelCount,
    incidentCounts,
    score,
    lastNoShowAt,
    updatedAt: base.updatedAt ?? now,
  };
}
