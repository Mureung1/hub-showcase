/* ===================== 1. 전공 강의 (수동 지정, 실제 커리큘럼 예시) ===================== */
const MAJOR_COURSES = [
  {id:'ds',   name:'자료구조',       day:'월', start:9,  end:11, credit:3, prof:'김교수', team:false, tier:'B'},
  {id:'os',   name:'운영체제',       day:'월', start:12, end:14, credit:3, prof:'이교수', team:false, tier:'A'},
  {id:'stat', name:'확률과통계',     day:'월', start:15, end:17, credit:3, prof:'강교수', team:false, tier:'C'},
  {id:'db',   name:'데이터베이스',   day:'화', start:9,  end:11, credit:3, prof:'박교수', team:false, tier:'B'},
  {id:'dm',   name:'이산수학',       day:'화', start:11, end:13, credit:3, prof:'윤교수', team:false, tier:'A'},
  {id:'net',  name:'컴퓨터네트워크', day:'화', start:13, end:15, credit:3, prof:'최교수', team:true,  tier:'B'},
  {id:'lang', name:'프로그래밍언어', day:'수', start:10, end:12, credit:3, prof:'서교수', team:false, tier:'A'},
  {id:'arch', name:'컴퓨터구조',     day:'수', start:13, end:15, credit:3, prof:'남교수', team:false, tier:'B'},
  {id:'algo', name:'알고리즘',       day:'목', start:9,  end:11, credit:3, prof:'정교수', team:false, tier:'A'},
  {id:'se',   name:'소프트웨어공학', day:'목', start:12, end:14, credit:3, prof:'윤교수', team:true,  tier:'B'},
  {id:'web',  name:'웹프로그래밍',   day:'목', start:15, end:17, credit:3, prof:'김교수', team:false, tier:'C'},
  {id:'cap',  name:'캡스톤디자인',   day:'금', start:9,  end:12, credit:3, prof:'한교수', team:true,  tier:'A'},
  {id:'embed',name:'임베디드시스템', day:'금', start:9,  end:11, credit:3, prof:'백교수', team:false, tier:'C'},
  {id:'design',name:'창의설계',      day:'금', start:13, end:15, credit:3, prof:'조교수', team:true,  tier:'B'},
];

/* ===================== 2. 교양 강의 (사용자가 준 과목명 리스트) =====================
   실제 요일/시간/교수 데이터가 없으므로, 5일 x 5교시(9~19시, 2시간 단위) 슬롯에
   순환 배정한 표본 데이터입니다. 학점은 대부분 2학점(교양 표준), 실습/랩 성격의
   일부 과목만 3학점으로 표시했습니다. */
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
// 3학점(실습/랩 성격)으로 지정할 과목
const GE_3CREDIT = new Set(['화학물질과독성','생명공학의이해','생명과학입문','컴퓨터프로그래밍','R&D전략과기술사업화']);
const GE_PROFS = ['가교수','나교수','다교수','라교수','마교수','바교수','사교수','아교수'];
const GE_COLORS = ['#e7e2fb','#e2f3fb','#fbe9e2','#e2ecfb','#e2fbe8','#fff3d6','#fbe2ec','#f5e2fb','#e2fbf5','#fff0e2'];

// 요일 x 교시 슬롯 (2시간 단위, 9~19시)
const SLOTS = [];
['월','화','수','목','금'].forEach(day=>{
  [9,11,13,15,17].forEach(start=>{
    SLOTS.push({day, start, end:start+2});
  });
});

const GE_COURSES = GE_NAMES.map((name, i)=>{
  const slot = SLOTS[i % SLOTS.length];
  const is3 = GE_3CREDIT.has(name);
  const end = is3 ? Math.min(slot.start+3, 19) : slot.end;
  return {
    id: 'ge'+i,
    name,
    day: slot.day,
    start: slot.start,
    end,
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

function overlaps(a,b){
  if(a.day !== b.day) return false;
  return a.start < b.end && b.start < a.end;
}

/* ===================== 조합 탐색 (가지치기 백트래킹) ===================== */
function recommend(cond){
  let pool = COURSES.filter(c=>{
    if(cond.offDay !== 'none' && c.day === cond.offDay) return false;
    if(cond.morning === 'avoid' && c.start < 12) return false;
    if(cond.team === 'dislike' && c.team) return false;
    return true;
  });
  // 학점이 큰 과목부터 보면 가지치기 효율이 좋음
  pool.sort((a,b)=> b.credit - a.credit);

  const target = cond.targetCredit;
  const TOLERANCE = 3; // 정확히 맞는 조합이 없을 때 허용할 오차
  // suffix[i] = pool[i..] 학점 합 (상한 가지치기용)
  const suffix = new Array(pool.length+1).fill(0);
  for(let i=pool.length-1;i>=0;i--) suffix[i] = suffix[i+1] + pool[i].credit;

  const results = [];
  let calls = 0;
  const MAX_CALLS = 300000;

  function record(chosen, credit){
    results.push({
      courses:[...chosen],
      credit,
      diff: Math.abs(credit-target),
      score: chosen.reduce((s,c)=>s+TIER_SCORE[c.tier],0)/chosen.length,
    });
  }

  function backtrack(idx, chosen, credit){
    calls++;
    if(calls > MAX_CALLS) return;
    const diff = Math.abs(credit-target);
    if(chosen.length>0 && diff<=TOLERANCE) record(chosen, credit);
    if(idx>=pool.length) return;
    if(credit > target+TOLERANCE) return; // 이미 초과, 더 담아봐야 소용없음
    if(credit + suffix[idx] < target-TOLERANCE) return; // 아무리 담아도 목표 근처 불가능

    const c = pool[idx];
    if(!chosen.some(x=>overlaps(x,c))){
      chosen.push(c);
      backtrack(idx+1, chosen, credit+c.credit);
      chosen.pop();
    }
    backtrack(idx+1, chosen, credit);
  }
  backtrack(0, [], 0);

  // 1) 학점 오차가 작은 순 2) 등급 점수가 높은 순으로 정렬
  results.sort((a,b)=> a.diff - b.diff || b.score - a.score || b.credit - a.credit);

  const picked = [];
  const seen = new Set();
  for(const r of results){
    const key = r.courses.map(c=>c.id).sort().join(',');
    if(seen.has(key)) continue;
    seen.add(key);
    picked.push(r);
    if(picked.length >= 3) break;
  }
  return picked;
}

/* ===================== 렌더링 ===================== */
const DAYS = ['월','화','수','목','금'];
const HOURS = Array.from({length:10}, (_,i)=>9+i); // 9~18 라벨 (18시대 = 18~19시)
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
    return `
    <div class="summary-row">
      <div class="reco-title">추천 ${i+1} ✦</div>
      <div class="credit-badge ${exact?'exact':''}">총 ${r.credit}학점${exact?' (목표 일치)':''}</div>
    </div>
    <div class="reco-card">
      ${buildGridHTML(r.courses)}
      <div class="course-list-mini">${r.courses.map(c=>`${c.name}(${c.credit})`).join(' · ')}</div>
    </div>`;
  }).join('');
}

/* ===================== 화면 전환 ===================== */
const formScreen = document.getElementById('formScreen');
const resultScreen = document.getElementById('resultScreen');
const backBtn = document.getElementById('backBtn');
const pageTitle = document.getElementById('pageTitle');

document.getElementById('genBtn').addEventListener('click', ()=>{
  const cond = {
    offDay: document.getElementById('offDay').value,
    morning: document.getElementById('morning').value,
    team: document.getElementById('team').value,
    targetCredit: parseInt(document.getElementById('targetCredit').value, 10),
  };
  renderResults(cond);
  formScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
  pageTitle.textContent = '추천 시간표';
  backBtn.classList.add('show');
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
