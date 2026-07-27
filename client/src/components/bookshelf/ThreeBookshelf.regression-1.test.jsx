import { expect, test } from 'vitest';

import { BOOK_PAGE_COLOR, getTurningPageMotion } from './ThreeBookshelf';

test('상세 화면으로 확대할 때 마지막 페이지를 완전히 펼친 상태로 고정한다', () => {
  const motion = getTurningPageMotion({
    shouldTurn: true,
    isZooming: true,
    turnedLayer: 0.32,
    unturnedLayer: 0.34,
  });

  expect(motion).toMatchObject({
    rotation: -Math.PI,
    layer: 0.32,
    immediate: true,
  });
});

test('3D 책 내부 페이지는 앱 배경과 구분되는 흰색을 사용한다', () => {
  expect(BOOK_PAGE_COLOR).toBe('#ffffff');
});
