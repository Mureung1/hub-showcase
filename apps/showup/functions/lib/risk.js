"use strict";
// ShowUp 위험도 계산 순수 함수 (Cloud Functions 용 복사본)
// apps/showup/src/utils/risk.ts 와 동기화 유지 필요.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_LEVELS = exports.RISK_WEIGHTS = void 0;
exports.calculateRiskStats = calculateRiskStats;
exports.RISK_WEIGHTS = {
    noShow: 8,
    lateCancel: 4,
    late: 2,
    abuse: 10,
    dispute: 6,
    unreasonable: 4,
    visited: -1,
    recentNoShow: 5,
};
exports.RISK_LEVELS = {
    low: { min: 0, max: 23 },
    medium: { min: 24, max: 39 },
    high: { min: 40, max: Number.POSITIVE_INFINITY },
};
const INCIDENT_WEIGHTS = {
    abuse: exports.RISK_WEIGHTS.abuse,
    dispute: exports.RISK_WEIGHTS.dispute,
    late: exports.RISK_WEIGHTS.late,
    unreasonable: exports.RISK_WEIGHTS.unreasonable,
};
function toDate(value) {
    if (value instanceof Date)
        return value;
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        return value.toDate();
    }
    return null;
}
function calculateRiskStats(inputs, base = {}) {
    const { reservations, incidents, now = new Date() } = inputs;
    let totalVisits = base.totalVisits ?? 0;
    let noShowCount = base.noShowCount ?? 0;
    let lateCancelCount = base.lateCancelCount ?? 0;
    for (const r of reservations) {
        if (r.status === 'visited') {
            totalVisits += 1;
        }
        else if (r.status === 'noShow') {
            noShowCount += 1;
        }
        else if (r.status === 'cancelled' && r.cancelledSameDay) {
            lateCancelCount += 1;
        }
    }
    const incidentCounts = {
        abuse: 0,
        dispute: 0,
        late: 0,
        unreasonable: 0,
    };
    for (const incident of incidents) {
        incidentCounts[incident.type] += 1;
    }
    const incidentScore = Object.entries(incidentCounts).reduce((sum, [type, count]) => sum + INCIDENT_WEIGHTS[type] * count, 0);
    const reservationScore = noShowCount * exports.RISK_WEIGHTS.noShow +
        lateCancelCount * exports.RISK_WEIGHTS.lateCancel +
        totalVisits * exports.RISK_WEIGHTS.visited;
    const recentThresholdDays = 30;
    const recentThresholdMs = recentThresholdDays * 24 * 60 * 60 * 1000;
    let hasRecentNoShow = false;
    let lastNoShowAt = base.lastNoShowAt ?? null;
    for (const r of reservations) {
        if (r.status !== 'noShow')
            continue;
        const createdAtDate = toDate(r.createdAt);
        if (!createdAtDate)
            continue;
        const lastNoShowDate = lastNoShowAt ? toDate(lastNoShowAt) : null;
        if (!lastNoShowDate || lastNoShowDate < createdAtDate) {
            lastNoShowAt = r.createdAt;
        }
        const diffMs = now.getTime() - createdAtDate.getTime();
        if (diffMs <= recentThresholdMs) {
            hasRecentNoShow = true;
        }
    }
    const recentNoShowScore = hasRecentNoShow ? exports.RISK_WEIGHTS.recentNoShow : 0;
    const score = Math.max(0, reservationScore + incidentScore + recentNoShowScore);
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
//# sourceMappingURL=risk.js.map