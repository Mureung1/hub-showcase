// 공용 지역 데이터(FE와 같은 단일 소스). 시/군/구까지만.
const REGIONS = require('../../../shared/regions.json');

// sido가 존재하고 sigungu가 그 시도의 시군구 목록에 있을 때만 true.
function isValidRegion(sido, sigungu) {
  const list = REGIONS[sido];
  return Array.isArray(list) && list.includes(sigungu);
}

module.exports = { REGIONS, isValidRegion };
