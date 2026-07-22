-- 실시간 피드(OA-21709)엔 정적 base(OA-13122)에 없는 주차장이 있어
-- FK가 있으면 매칭되지 않는 행을 INSERT 시 배치 전체가 롤백돼 실시간 적재가 실패한다
ALTER TABLE parking_lot_realtime
DROP FOREIGN KEY fk_parking_lot_realtime_pklt_cd;