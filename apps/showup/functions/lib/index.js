"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateRiskOnIncidentChange = exports.recalculateRiskOnReservationChange = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const risk_1 = require("./risk");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
/**
 * 예약 문서가 생성/수정/삭제될 때 해당 고객의 riskStats 를 재계산한다.
 * Firestore Security Rules 에서 riskStats 직접 쓰기를 차단했기 때문에,
 * Cloud Function 이 유일한 갱신 경로가 된다.
 */
exports.recalculateRiskOnReservationChange = (0, firestore_1.onDocumentWritten)('stores/{storeId}/reservations/{reservationId}', async (event) => {
    const storeId = event.params.storeId;
    const afterData = event.data?.after?.data();
    const beforeData = event.data?.before?.data();
    const customerId = afterData?.customerId ?? beforeData?.customerId;
    if (!customerId)
        return;
    await recalculateAndSaveRiskStats(storeId, customerId);
});
/**
 * 사건 문서가 생성/수정/삭제될 때 해당 고객의 riskStats 를 재계산한다.
 */
exports.recalculateRiskOnIncidentChange = (0, firestore_1.onDocumentWritten)('stores/{storeId}/customers/{customerId}/incidents/{incidentId}', async (event) => {
    const storeId = event.params.storeId;
    const customerId = event.params.customerId;
    await recalculateAndSaveRiskStats(storeId, customerId);
});
async function recalculateAndSaveRiskStats(storeId, customerId) {
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
    const reservations = reservationsSnap.docs.map((d) => d.data());
    const incidents = incidentsSnap.docs.map((d) => d.data());
    const stats = (0, risk_1.calculateRiskStats)({ reservations, incidents });
    await db
        .collection('stores')
        .doc(storeId)
        .collection('customers')
        .doc(customerId)
        .update({ riskStats: stats });
}
//# sourceMappingURL=index.js.map