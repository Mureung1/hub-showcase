// 자격 매칭 (순수 함수). 공고 하나를 프로필과 대조해 상태를 판정한다.
//
// 상태 4가지:
// - eligible   : 어긋난 조건 없음 (지원 가능)
// - review     : 원문을 못 읽은 공고(parseStatus needs_review) (확인 필요)
// - near        : 어긋난 조건이 딱 1개 (거의 가능). 단 학년은 1급간(±1) 차이일 때만 근접으로 본다
// - ineligible : 어긋난 조건이 2개 이상, 또는 학년이 2급간 이상 차이 (지원 불가)
//
// 규칙(schema.md 핵심 규칙):
// - 프로필에서 미선택(null)인 조건은 계산에서 제외한다. (확인 필요가 아니다)
// - 공고 조건이 [] 또는 null 이면 무관이라 통과.
// - 학년만 ±1 근접을 인정하고, 나머지(전공·지역·나이·소득·학점)는 맞다/틀리다로만 본다.

export function matchActivity(activity, profile) {
  // 원문을 못 읽은 공고는 판정하지 않고 확인 필요로 보낸다.
  if (activity.parseStatus === "needs_review") {
    return { status: "review", failed: [] };
  }

  const e = activity.eligibility;
  const failed = [];

  if (profile.grade != null && e.grades.length && !e.grades.includes(profile.grade)) {
    const near = e.grades.some((g) => Math.abs(g - profile.grade) === 1);
    failed.push({ label: "학년", req: e.grades.map((g) => g + "학년").join("·"), mine: profile.grade + "학년", near });
  }
  if (profile.major != null && e.majors.length && !e.majors.includes(profile.major)) {
    failed.push({ label: "전공", req: e.majors.join("·"), mine: profile.major, near: false });
  }
  if (profile.region != null && e.regions.length && !e.regions.includes(profile.region)) {
    failed.push({ label: "지역", req: e.regions.join("·"), mine: profile.region, near: false });
  }
  if (profile.enrollment != null && e.enrollment.length && !e.enrollment.includes(profile.enrollment)) {
    failed.push({ label: "재학상태", req: e.enrollment.join("·"), mine: profile.enrollment, near: false });
  }
  if (profile.age != null && (e.ageMin != null || e.ageMax != null)) {
    const below = e.ageMin != null && profile.age < e.ageMin;
    const above = e.ageMax != null && profile.age > e.ageMax;
    if (below || above) {
      const req = `만 ${e.ageMin ?? ""}~${e.ageMax ?? ""}세`;
      failed.push({ label: "나이", req, mine: profile.age + "세", near: false });
    }
  }
  if (profile.income != null && e.incomeMax != null && profile.income > e.incomeMax) {
    failed.push({ label: "소득분위", req: e.incomeMax + "분위 이하", mine: profile.income + "분위", near: false });
  }
  if (profile.gpa != null && e.gpaMin != null && profile.gpa < e.gpaMin) {
    failed.push({ label: "학점", req: e.gpaMin.toFixed(1) + " 이상", mine: profile.gpa.toFixed(1), near: false });
  }

  if (failed.length === 0) return { status: "eligible", failed: [] };
  if (failed.length === 1) {
    const f = failed[0];
    // 학년이 2급간 이상 차이면 근접이 아니라 지원 불가
    const gradeFar = f.label === "학년" && !f.near;
    return { status: gradeFar ? "ineligible" : "near", failed };
  }
  return { status: "ineligible", failed };
}

// 전체 목록을 상태별로 나눈다.
export function splitByMatch(activities, profile) {
  const eligible = [];
  const review = [];
  const near = [];
  const ineligible = [];
  for (const a of activities) {
    const r = matchActivity(a, profile);
    const item = { ...a, ...r };
    if (r.status === "eligible") eligible.push(item);
    else if (r.status === "review") review.push(item);
    else if (r.status === "near") near.push(item);
    else ineligible.push(item);
  }
  return { eligible, review, near, ineligible };
}
