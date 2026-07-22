-- 같은 아이템을 다른 색으로 여러 개 소유할 수 있도록 UserInventory의 유니크 제약을
-- (userId, itemId) -> (userId, itemId, color)로 바꾼다.
DROP INDEX "UserInventory_userId_itemId_key";
CREATE UNIQUE INDEX "UserInventory_userId_itemId_color_key" ON "UserInventory"("userId", "itemId", "color");

-- UserRoomLayout을 itemId가 아니라 개별 소유 인스턴스(UserInventory) 기준으로 재구성한다.
-- 초기 데모 단계라 기존 배치 데이터는 인스턴스로 안전하게 매핑할 방법이 없어 비우고 새로 시작한다.
TRUNCATE TABLE "UserRoomLayout";

ALTER TABLE "UserRoomLayout" DROP CONSTRAINT "UserRoomLayout_itemId_fkey";
DROP INDEX "UserRoomLayout_userId_itemId_key";
ALTER TABLE "UserRoomLayout" DROP COLUMN "itemId";
ALTER TABLE "UserRoomLayout" ADD COLUMN "inventoryId" TEXT NOT NULL;

CREATE UNIQUE INDEX "UserRoomLayout_inventoryId_key" ON "UserRoomLayout"("inventoryId");
ALTER TABLE "UserRoomLayout" ADD CONSTRAINT "UserRoomLayout_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "UserInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
