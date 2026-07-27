// ingredients.js의 100개 재료 id ↔ KAMIS 품목/품종/등급 코드 매핑.
// 코드는 kamis.or.kr 소매가격 조회 화면 + KAMIS productInfo(품목코드표) API 응답을 직접 대조해서
// 검증한 값이다(2026-07-24). 양념/가공식품(간장·라면 등)과 일부 신선식품(표고버섯·콩나물·가지·부추·
// 새우·황태채 등)은 KAMIS 소매가 데이터 자체가 없어 이 표에 없다 — priceCache.js가 그런 id는
// 자동으로 정적 가격(mealPrices.js)만 쓰도록 건너뛴다.
export const priceItemMap = {
  onion:          { itemCategoryCode: '200', itemCode: '245', kindCode: '00', productRankCode: '04' },
  pa:             { itemCategoryCode: '200', itemCode: '246', kindCode: '00', productRankCode: '04' },
  garlic:         { itemCategoryCode: '200', itemCode: '258', kindCode: '01', productRankCode: '04' },
  potato:         { itemCategoryCode: '200', itemCode: '152', kindCode: '01', productRankCode: '04' },
  carrot:         { itemCategoryCode: '200', itemCode: '232', kindCode: '01', productRankCode: '04' },
  cabbage:        { itemCategoryCode: '200', itemCode: '212', kindCode: '00', productRankCode: '05' },
  pepper:         { itemCategoryCode: '200', itemCode: '242', kindCode: '00', productRankCode: '04' },
  chili:          { itemCategoryCode: '200', itemCode: '242', kindCode: '03', productRankCode: '04' },
  cucumber:       { itemCategoryCode: '200', itemCode: '223', kindCode: '02', productRankCode: '04' },
  zucchini:       { itemCategoryCode: '200', itemCode: '224', kindCode: '01', productRankCode: '04' },
  spinach:        { itemCategoryCode: '200', itemCode: '213', kindCode: '00', productRankCode: '04' },
  radish:         { itemCategoryCode: '200', itemCode: '231', kindCode: '01', productRankCode: '04' },
  lettuce:        { itemCategoryCode: '200', itemCode: '214', kindCode: '02', productRankCode: '04' },
  sesameLeaf:     { itemCategoryCode: '200', itemCode: '253', kindCode: '00', productRankCode: '04' },
  ginger:         { itemCategoryCode: '200', itemCode: '247', kindCode: '00', productRankCode: '04' },
  scallion:       { itemCategoryCode: '200', itemCode: '246', kindCode: '02', productRankCode: '04' },
  broccoli:       { itemCategoryCode: '200', itemCode: '280', kindCode: '00', productRankCode: '04' },
  bellPepper:     { itemCategoryCode: '200', itemCode: '256', kindCode: '00', productRankCode: '04' },
  enoki:          { itemCategoryCode: '300', itemCode: '316', kindCode: '00', productRankCode: '04' },
  oysterMushroom: { itemCategoryCode: '300', itemCode: '315', kindCode: '00', productRankCode: '04' },
  sweetPotato:    { itemCategoryCode: '100', itemCode: '151', kindCode: '00', productRankCode: '04' },

  pork:           { itemCategoryCode: '500', itemCode: '4304', kindCode: '25', productRankCode: '1' },
  porkBelly:      { itemCategoryCode: '500', itemCode: '4304', kindCode: '27', productRankCode: '1' },
  beef:           { itemCategoryCode: '500', itemCode: '4301', kindCode: '40', productRankCode: '1' },
  chicken:        { itemCategoryCode: '500', itemCode: '9901', kindCode: '',   productRankCode: '1' },
  egg:            { itemCategoryCode: '500', itemCode: '9903', kindCode: '21', productRankCode: '1' },
  milk:           { itemCategoryCode: '500', itemCode: '9908', kindCode: '01', productRankCode: '1' },

  squid:          { itemCategoryCode: '600', itemCode: '619', kindCode: '03', productRankCode: '05' },
  clam:           { itemCategoryCode: '600', itemCode: '661', kindCode: '00', productRankCode: '' },
  anchovy:        { itemCategoryCode: '600', itemCode: '638', kindCode: '00', productRankCode: '04' },
  kelp:           { itemCategoryCode: '600', itemCode: '660', kindCode: '01', productRankCode: '' },
};
