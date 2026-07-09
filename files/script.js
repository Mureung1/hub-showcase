/* ===================== 1. 전공 강의 ===================== */
/* required: true → 전공필수(강제 포함) 예시
   prerequisite: ['id'] → 선수과목 예시 (해당 id를 "이미 들은 과목"에 체크해야 후보로 노출)
   pair: 'key' → 같은 key를 가진 과목끼리는 "동시수강 필수 세트"로 묶여서 항상 같이 담기거나 같이 빠짐 */
const MAJOR_COURSES = [
  {id:'ds',   name:'자료구조',       day:'월', start:9,  end:11, credit:3, prof:'김교수', team:false, tier:'B', required:true},
  {id:'os',   name:'운영체제',       day:'월', start:12, end:14, credit:3, prof:'이교수', team:false, tier:'A', prerequisite:['ds']},
  {id:'stat', name:'확률과통계',     day:'월', start:15, end:17, credit:3, prof:'강교수', team:false, tier:'C'},
  {id:'db',   name:'데이터베이스',   day:'화', start:9,  end:11, credit:3, prof:'박교수', team:false, tier:'B'},
  {id:'dm',   name:'이산수학',       day:'화', start:11, end:13, credit:3, prof:'윤교수', team:false, tier:'A'},
  {id:'net',  name:'컴퓨터네트워크', day:'화', start:13, end:15, credit:3, prof:'최교수', team:true,  tier:'B', prerequisite:['dm']},
  {id:'lang', name:'프로그래밍언어', day:'수', start:10, end:12, credit:3, prof:'서교수', team:false, tier:'A'},
  {id:'arch', name:'컴퓨터구조',     day:'수', start:13, end:15, credit:3, prof:'남교수', team:false, tier:'B'},
  {id:'algo', name:'알고리즘',       day:'목', start:9,  end:11, credit:3, prof:'정교수', team:false, tier:'A', required:true},
  {id:'se',   name:'소프트웨어공학', day:'목', start:12, end:14, credit:3, prof:'윤교수', team:true,  tier:'B'},
  {id:'web',  name:'웹프로그래밍',   day:'목', start:15, end:17, credit:3, prof:'김교수', team:false, tier:'C'},
  {id:'cap',  name:'캡스톤디자인',   day:'금', start:9,  end:12, credit:3, prof:'한교수', team:true,  tier:'A'},
  {id:'embed',name:'임베디드시스템', day:'금', start:9,  end:11, credit:3, prof:'백교수', team:false, tier:'C'},
  {id:'design',name:'창의설계',      day:'금', start:13, end:15, credit:3, prof:'조교수', team:true,  tier:'B'},
  // 동시수강 필수 세트 예시 (이론 2학점 + 실습 1학점, 같이 들어야만 함)
  {id:'proj_th',  name:'전공프로젝트(이론)', day:'화', start:17, end:19, credit:2, prof:'하교수', team:false, tier:'B', pair:'proj'},
  {id:'proj_lab', name:'전공프로젝트(실습)', day:'목', start:17, end:19, credit:1, prof:'하교수', team:true,  tier:'B', pair:'proj'},
];

/* ===================== 2. 교양 강의 ===================== */
const GE_NAMES = [
  '자연과학의미래','물리현상의원리','성의이해','지진과생활','지구의역사','체동학',
  '화학물질과독성','생명공학의이해','생명과학입문','첨단기술과인간생존',
  '세상으로걸어간과학기술자들','지속가능한성장을위한미래에너지','과학기술학의새로운지평',
  '재미있는유비쿼터스시대','R&D전략과기술사업화','디지털매체와디자인','미래를위한환경의이해',
  '컴퓨터프로그래밍','천체와우주','동물의행동','사람과유전자','생태계와환경오염',
  'IT와경영','창업과기업가정신','현실경제의이해','필수비즈니스한자','시사영어','실용영문법',
  '기초프랑스어','영문독해','초급러시아어','중급스페인어','초급독일어','중급중국어',
  '실용영어회화','영어작문','초급일본어','문학과사랑'
];
const GE_3CREDIT = new Set(['화학물질과독성','생명공학의이해','생명과학입문','컴퓨터프로그래밍','R&D전략과기술사업화']);
const GE_PROFS = ['가교수','나교수','다교수','라교수','마교수','바교수','사교수','아교수'];
const GE_COLORS = ['#e7e2fb','#e2f3fb','#fbe9e2','#e2ecfb','#e2fbe8','#fff3d6','#fbe2ec','#f5e2fb','#e2fbf5','#fff0e2'];

const SLOTS = [];
['월','화','수','목','금'].forEach(day=>{
  [9,11,13,15,17].forEach(start=>{ SLOTS.push({day, start, end:start+2}); });
});

const GE_COURSES = GE_NAMES.map((name, i)=>{
  const slot = SLOTS[i % SLOTS.length];
  const is3 = GE_3CREDIT.has(name);
  const end = is3 ? Math.min(slot.start+3, 19) : slot.end;
  return {
    id: 'ge'+i, name, day: slot.day, start: slot.start, end,
    credit: is3 ? 3 : 2,
    prof: GE_PROFS[i % GE_PROFS.length],
    team: false,
    tier: ['A','B','C'][i % 3],
    color: GE_COLORS[i % GE_COLORS.length],
  };
});
MAJOR_COURSES.forEach((c,i)=>{ if(!c.color) c.color = GE_COLORS[(i+3) % GE_COLORS.length]; });

const COURSES = [...MAJOR_COURSES, ...GE_COURSES];
const TIER_SCORE = {A:3,B:2,C:1};

// 선수과목 체크용으로 노출할 과목 (데모 목적, 실제로는 COURSES 전체를 훑어 자동 추출 가능)
const PREREQ_OPTIONS = [
  {id:'ds', name:'자료구조'},
  {id:'dm', name:'이산수학'},
];

function overlaps(a,b){
  if(a.day !== b.day) return false;
  return a.start < b.end && b.start < a.end;
}

/* ===================== 3. 강의 → "유닛" 묶기 (동시수강 세트 처리) ===================== */
/* pair 값이 같은 강의는 하나의 유닛으로 묶여서, 탐색 시 항상 같이 담기거나 같이 빠진다 */
function buildUnits(courses){
  const groups = new Map();
  const units = [];
  courses.forEach(c=>{
    if(c.pair){
      if(!groups.has(c.pair)) groups.set(c.pair, []);
      groups.get(c.pair).push(c);
    } else {
      units.push([c]);
    }
  });
  groups.forEach(arr=> units.push(arr));

  return units.map(courseArr=>({
    key: courseArr.map(c=>c.id).join('+'),
    courses: courseArr,
    credit: courseArr.reduce((s,c)=>s+c.credit,0),
    required: courseArr.some(c=>c.required),
    team: courseArr.some(c=>c.team),
    prereqs: [...new Set(courseArr.flatMap(c=>c.prerequisite||[]))],
    isSet: courseArr.length > 1,
  }));
}

function unitOverlaps(u1,u2){
  return u1.courses.some(a=> u2.courses.some(b=> overlaps(a,b)));
}

/* ===================== 4. 조합 탐색 (가지치기 백트래킹, 유닛 단위) ===================== */
function recommend(cond){
  const allUnits = buildUnits(COURSES);

  // 1) 조건 필터링 (요일/오전/팀플/선수과목)
  let filtered = allUnits.filter(u=>{
    if(cond.offDay !== 'none' && u.courses.some(c=>c.day===cond.offDay)) return false;
    if(cond.morning === 'avoid' && u.courses.some(c=>c.start<12)) return false;
    if(cond.team === 'dislike' && u.team) return false;
    if(u.prereqs.length && !u.prereqs.every(p=> cond.completed.includes(p))) return false;
    return true;
  });

  // 2) 전공필수는 강제 포함 (서로 겹치지 않는 선에서 그리디하게 확정)
  const requiredUnits = filtered.filter(u=>u.required);
  const baseChosen = [];
  let baseCredit = 0;
  requiredUnits.forEach(u=>{
    if(!baseChosen.some(x=>unitOverlaps(x,u))){
      baseChosen.push(u);
      baseCredit += u.credit;
    }
  });

  // 3) 나머지는 선택 가능한 유닛 풀 (필수 제외, 학점 큰 순 정렬 → 가지치기 효율)
  let pool = filtered.filter(u=>!u.required);
  pool.sort((a,b)=> b.credit - a.credit);

  const target = cond.targetCredit - baseCredit; // 필수 학점을 뺀 "채워야 할 나머지 목표"
  const TOLERANCE = 3;
  const suffix = new Array(pool.length+1).fill(0);
  for(let i=pool.length-1;i>=0;i--) suffix[i] = suffix[i+1] + pool[i].credit;

  const results = [];
  let calls = 0;
  const MAX_CALLS = 300000;

  function record(chosen, credit){
    const totalCredit = baseCredit + credit;
    results.push({
      units: [...baseChosen, ...chosen],
      credit: totalCredit,
      diff: Math.abs(totalCredit - cond.targetCredit),
      score: [...baseChosen, ...chosen].reduce((s,u)=> s + u.courses.reduce((s2,c)=>s2+TIER_SCORE[c.tier],0), 0)
             / [...baseChosen, ...chosen].reduce((s,u)=> s + u.courses.length, 0),
    });
  }

  function backtrack(idx, chosen, credit){
    calls++;
    if(calls > MAX_CALLS) return;
    if(Math.abs(credit-target) <= TOLERANCE) record(chosen, credit);
    if(idx >= pool.length) return;
    if(credit > target+TOLERANCE) return;
    if(credit + suffix[idx] < target-TOLERANCE) return;

    const u = pool[idx];
    if(!chosen.some(x=>unitOverlaps(x,u)) && !baseChosen.some(x=>unitOverlaps(x,u))){
      chosen.push(u);
      backtrack(idx+1, chosen, credit+u.credit);
      chosen.pop();
    }
    backtrack(idx+1, chosen, credit);
  }
  backtrack(0, [], 0);

  // 필수 과목만으로도 이미 tolerance 안에 들어오는 "빈 조합" 케이스 보정
  if(baseChosen.length>0 && Math.abs(baseCredit-cond.targetCredit) <= TOLERANCE){
    record([], 0);
  }

  results.sort((a,b)=> a.diff - b.diff || b.score - a.score || b.credit - a.credit);

  const picked = [];
  const seen = new Set();
  for(const r of results){
    const key = r.units.map(u=>u.key).sort().join(',');
    if(seen.has(key)) continue;
    seen.add(key);
    picked.push(r);
    if(picked.length >= 3) break;
  }
  return picked;
}

/* ===================== 5. 자연어 조건 → 구조화 객체 (mock 파서) =====================
   실제 서비스라면 이 함수 대신 서버에서 LLM(Claude 등)을 호출해서
   자연어를 아래와 같은 JSON으로 뽑아내야 합니다.
   (API 키를 프론트엔드 JS에 그대로 넣으면 안 되기 때문에 서버가 필요합니다)
   여기서는 구조만 보여주기 위해 키워드 매칭으로 대체합니다. */
function parseFreeText(text){
  const patch = {};
  const dayMap = {'월':'월','화':'화','수':'수','목':'목','금':'금'};
  Object.keys(dayMap).forEach(d=>{
    if(text.includes(d+'요일') || text.includes(d+'욜')) patch.offDay = d;
  });
  if(text.includes('오전') && (text.includes('싫') || text.includes('피하') || text.includes('없었으면'))){
    patch.morning = 'avoid';
  }
  if(text.includes('팀플') && (text.includes('싫') || text.includes('안 하') || text.includes('빼'))){
    patch.team = 'dislike';
  }
  const creditMatch = text.match(/(12|15|18|21)\s*학점/);
  if(creditMatch) patch.targetCredit = parseInt(creditMatch[1], 10);
  return patch;
}

/* ===================== 6. 렌더링 ===================== */
const DAYS = ['월','화','수','목','금'];
const HOURS = Array.from({length:10}, (_,i)=>9+i);
const LABEL_W = 34, DAY_W = 64, ROW_H = 47, HEAD_H = 26;

function buildGridHTML(courses){
  let html = `<div class="grid-wrap">`;
  DAYS.forEach((d,i)=>{
    html += `<div class="day-header" style="left:${LABEL_W + i*DAY_W}px; width:${DAY_W}px;">${d}</div>`;
  });
  HOURS.forEach((h,i)=>{
    html += `<div class="time-label" style="top:${HEAD_H + i*ROW_H}px;">${h}</div>`;
    html += `<div class="cell-line" style="top:${HEAD_H + i*ROW_H}px;"></div>`;
  });
  courses.forEach(c=>{
    const dayIdx = DAYS.indexOf(c.day);
    const top = HEAD_H + (c.start-9)*ROW_H + 2;
    const height = (c.end-c.start)*ROW_H - 4;
    const left = LABEL_W + dayIdx*DAY_W + 2;
    const width = DAY_W - 4;
    html += `<div class="course-block" style="top:${top}px;left:${left}px;width:${width}px;height:${height}px;background:${c.color};">
      ${c.name}<br><span class="prof">${c.credit}학점 · ${c.prof}</span>
    </div>`;
  });
  html += `</div>`;
  return html;
}

function renderResults(cond){
  const list = document.getElementById('resultList');
  const combos = recommend(cond);

  if(combos.length === 0){
    list.innerHTML = `<div class="empty-note">조건에 맞는 시간표를 찾지 못했어요.<br>공강 요일이나 목표 학점 조건을 조금 완화해보세요.</div>`;
    return;
  }

  list.innerHTML = combos.map((r, i)=>{
    const exact = r.credit === cond.targetCredit;
    const allCourses = r.units.flatMap(u=>u.courses);
    const tags = r.units.filter(u=>u.isSet || u.required).map(u=>{
      if(u.isSet) return `${u.courses.map(c=>c.name).join('+')} (동시수강 세트)`;
      if(u.required) return `${u.courses.map(c=>c.name).join(', ')} (전공필수)`;
    }).join(' · ');
    return `
    <div class="summary-row">
      <div class="reco-title">추천 ${i+1} ✦</div>
      <div class="credit-badge ${exact?'exact':''}">총 ${r.credit}학점${exact?' (목표 일치)':''}</div>
    </div>
    <div class="reco-card">
      ${buildGridHTML(allCourses)}
      <div class="course-list-mini">${allCourses.map(c=>`${c.name}(${c.credit})`).join(' · ')}</div>
      ${tags ? `<div class="course-list-mini" style="color:#8a5cf6;font-weight:700;">${tags}</div>` : ''}
    </div>`;
  }).join('');
}

/* ===================== 7. 화면 전환 & 이벤트 ===================== */
const loginScreen = document.getElementById('loginScreen');
const formScreen = document.getElementById('formScreen');
const resultScreen = document.getElementById('resultScreen');
const topbar = document.getElementById('topbar');
const backBtn = document.getElementById('backBtn');
const pageTitle = document.getElementById('pageTitle');

// 더미 로그인: 입력값 검증 없이 바로 조건 입력 화면으로 이동
document.getElementById('loginBtn').addEventListener('click', ()=>{
  loginScreen.classList.add('hidden');
  formScreen.classList.remove('hidden');
  topbar.classList.remove('hidden');
  pageTitle.textContent = '시간표 추천';
});

function readCond(){
  return {
    offDay: document.getElementById('offDay').value,
    morning: document.getElementById('morning').value,
    team: document.getElementById('team').value,
    targetCredit: parseInt(document.getElementById('targetCredit').value, 10),
    completed: [...document.querySelectorAll('.prereq-check:checked')].map(el=>el.value),
  };
}

document.getElementById('genBtn').addEventListener('click', ()=>{
  const cond = readCond();
  renderResults(cond);
  formScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
  pageTitle.textContent = '추천 시간표';
  backBtn.classList.add('show');
});

// 자연어 입력 → mock 파싱 → 폼 값에 덮어쓰기
document.getElementById('nlpBtn').addEventListener('click', ()=>{
  const text = document.getElementById('nlpInput').value.trim();
  if(!text) return;
  const patch = parseFreeText(text);
  if(patch.offDay) document.getElementById('offDay').value = patch.offDay;
  if(patch.morning) document.getElementById('morning').value = patch.morning;
  if(patch.team) document.getElementById('team').value = patch.team;
  if(patch.targetCredit) document.getElementById('targetCredit').value = patch.targetCredit;

  const preview = Object.keys(patch).length
    ? '인식된 조건: ' + JSON.stringify(patch)
    : '조건을 인식하지 못했어요. (mock 파서라 인식 가능한 표현이 제한적이에요)';
  document.getElementById('nlpPreview').textContent = preview;
});

function goBack(){
  resultScreen.classList.add('hidden');
  formScreen.classList.remove('hidden');
  pageTitle.textContent = '시간표 추천';
  backBtn.classList.remove('show');
}
document.getElementById('editBtn').addEventListener('click', goBack);
backBtn.addEventListener('click', goBack);

document.querySelectorAll('.nav-tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// 선수과목 체크박스 동적 생성
const prereqWrap = document.getElementById('prereqWrap');
PREREQ_OPTIONS.forEach(p=>{
  const label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;margin-top:6px;';
  label.innerHTML = `<input type="checkbox" class="prereq-check" value="${p.id}"> ${p.name} 수강 완료`;
  prereqWrap.appendChild(label);
});
