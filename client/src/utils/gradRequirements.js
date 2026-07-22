// client/src/utils/gradRequirements.js
// server/src/utils/gradRequirements.js와 동일한 판정 로직의 ESM 사본.
// 서버는 CommonJS(require), 클라이언트는 Vite(ESM, import/export)라 모듈 포맷이 달라 공유할 수 없다.
// 판정 로직을 수정할 때는 server/src/utils/gradRequirements.js도 함께 수정할 것.
import { MAJOR_DATA } from '../data/majorData';

/**
 * majorData는 단과대학 > 학부 > 전공 > tracks[trackKey] 로 중첩되어 있어
 * 트랙 키만으로 바로 찾을 수 없다. 트리를 순회해서 tracks[track]을 찾는다.
 */
function findTrack(track) {
  for (const college of Object.values(MAJOR_DATA)) {
    for (const department of Object.values(college)) {
      for (const major of Object.values(department)) {
        if (major.hasTracks && major.tracks && major.tracks[track]) {
          return major.tracks[track];
        }
      }
    }
  }
  return null;
}

/**
 * completedCourses의 course.category가 requirement.label과 일치하는 과목들의
 * 학점 합계를 구한다. binary 요건은 credit 필드 없이도 이수 자체를 1학점으로 취급한다.
 */
function sumCredits(completedCourses, label) {
  return completedCourses
    .filter((course) => course.category === label)
    .reduce((sum, course) => sum + (Number(course.credit) || 0), 0);
}

/**
 * completedCourses 배열과 track 문자열을 받아 트랙의 각 요건에 대해
 * { satisfied, current, required } 를 판정한다.
 *
 * @param {Array<{ name: string, credit: number, category: string }>} completedCourses
 * @param {string} track - majorData.js의 tracks 객체 키 (예: 'multi-major')
 * @returns {Object.<string, { satisfied: boolean, current: number, required: number }>}
 */
export function evaluateTrackRequirements(completedCourses = [], track) {
  const trackData = findTrack(track);
  if (!trackData) {
    throw new Error(`존재하지 않는 트랙입니다: ${track}`);
  }

  const results = {};

  for (const requirement of trackData.requirements) {
    const required = requirement.type === 'binary' ? 1 : requirement.value;
    const current = sumCredits(completedCourses, requirement.label);

    results[requirement.label] = {
      satisfied: current >= required,
      current,
      required,
    };
  }

  return results;
}
