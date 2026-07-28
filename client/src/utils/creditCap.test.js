import { canAddCourse } from './creditCap';

describe('canAddCourse', () => {
  test('이미 담은 학점이 상한보다 한참 낮으면(6+3=9<=18) 담을 수 있다', () => {
    expect(canAddCourse(6, 3, 18)).toBe(true);
  });

  test('담으면 상한보다 1 낮아지면(14+3=17<=18) 담을 수 있다', () => {
    expect(canAddCourse(14, 3, 18)).toBe(true);
  });

  test('담으면 정확히 상한과 같아지면(15+3=18<=18) 담을 수 있다', () => {
    expect(canAddCourse(15, 3, 18)).toBe(true);
  });

  test('담으면 상한을 넘어서면(16+3=19>18) 담을 수 없다', () => {
    expect(canAddCourse(16, 3, 18)).toBe(false);
  });

  test('이미 담은 게 없어도(0+3=3<=18) 담을 수 있다', () => {
    expect(canAddCourse(0, 3, 18)).toBe(true);
  });

  test('cap을 생략하면 기본값 18이 적용된다', () => {
    expect(canAddCourse(16, 3)).toBe(false);
    expect(canAddCourse(15, 3)).toBe(true);
  });
});
