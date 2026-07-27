// 친목·소모임·스터디·동아리 모집 노이즈 판별의 TDD 테스트. 구현(noiseFilter.js)보다 먼저 쓴다.
//   node --test noiseFilter.test.js
// 원칙: 제외될 바엔 뜨는 게 낫다. 확실한 것만 노이즈로 보고, 애매하면 통과시킨다(false 반환).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isClubNoise, isResultAnnouncement, isJobPosting } from "./noiseFilter.js";

// --- 제외(노이즈=true): 실제 DB에 샜던 것들 ---
test("소모임은 노이즈", () => {
  assert.equal(isClubNoise("연기소모임 [ 연희동 2기 ] 모집"), true);
  assert.equal(isClubNoise("2026년 5월 가계부소모임-2회차"), true);
  assert.equal(isClubNoise("몰입 소모임 \"핑계\" 부원 모집"), true);
});

test("친목 모임/동아리는 노이즈", () => {
  assert.equal(isClubNoise("[친목/소셜 동아리원 신규모집]"), true);
  assert.equal(isClubNoise("대학연합친목 동아리 <철새> 신입부원 상시 모집"), true);
});

test("스터디원 모집은 노이즈", () => {
  assert.equal(isClubNoise("[스터디원 모집] 입문자를 위한 노션 101"), true);
  assert.equal(isClubNoise("INVEST UP 3기 금융투자 스터디원 모집"), true);
});

test("원데이 클래스는 노이즈", () => {
  assert.equal(isClubNoise("맛있는 취미연구소: 불닭냉면 만들기 원데이 클래스!"), true);
  // 단 '클래스' 단독은 노이즈 아님(청년 재정 클래스 등 legit)
  assert.equal(isClubNoise("청년 재정 UP 클래스"), false);
});

test("동아리 + 부원/신규/신입 모집은 노이즈", () => {
  assert.equal(isClubNoise("화장품 패키지 디자인 & 기획 동아리 신규 부원 모집"), true);
  assert.equal(isClubNoise("영상 편집 동아리 [RealClip] 신입 부원 모집"), true);
});

// --- 통과(노이즈=false): 예외 키워드 있으면 안 지운다 ---
test("공모전/서포터즈/대외활동이 있으면 동아리·모집 있어도 통과", () => {
  assert.equal(isClubNoise("동아리연합 전국 대학생 공모전"), false);
  assert.equal(isClubNoise("OO기업 대학생 서포터즈 모집"), false);
  assert.equal(isClubNoise("친목도 하는 대외활동 프로그램 참가자 모집"), false);
});

// --- 통과: 동아리/소모임을 '지원'하는 지자체 사업은 캐주얼 모임 아님(오제외 방지) ---
test("동아리/소모임 지원사업은 통과(지자체 프로그램)", () => {
  assert.equal(isClubNoise("서울 동아리ON(대학생 동아리 지원) 참여형 동아리 모집"), false);
  assert.equal(isClubNoise("2026년 청송군 청년 소모임 지원사업"), false);
  assert.equal(isClubNoise("(원주시) 청년 동아리 활동 지원 하반기 모집"), false);
  assert.equal(isClubNoise("생활예술동아리 지방보조금 지원 모집"), false);
});

// --- 통과: 노이즈 키워드 자체가 없는 정상 공고 ---
test("일반 공고는 통과", () => {
  assert.equal(isClubNoise("2026 부산 청년 정책 아이디어 공모"), false);
  assert.equal(isClubNoise("한국장학재단 국가장학금 신청 안내"), false);
  assert.equal(isClubNoise("대학생 해외봉사단 모집"), false); // 봉사단은 노이즈 아님
});

// --- 애매하면 통과(제외될 바엔 뜨는 게 낫다) ---
test("'동아리' 단독(모집 신호 없음)은 안 지운다", () => {
  // 동아리 지원사업 등 legit일 수 있어, 모집/부원 신호 없이 '동아리'만으론 제외 안 함
  assert.equal(isClubNoise("대학 동아리 활동 지원사업 안내"), false);
});

test("빈 값이면 통과(안 터짐)", () => {
  assert.equal(isClubNoise(""), false);
  assert.equal(isClubNoise(null), false);
});

// --- 선정결과 발표 = 노이즈 ---
test("선정결과·합격발표는 노이즈", () => {
  assert.equal(isResultAnnouncement("청년인생설계학교 2기 참여자 선정 결과 발표"), true);
  assert.equal(isResultAnnouncement("서울청년문화패스 12회차 선정 결과 안내"), true);
  assert.equal(isResultAnnouncement("서류심사 결과발표 및 이의신청 접수"), true);
});
test("선정결과 아닌 것은 통과", () => {
  assert.equal(isResultAnnouncement("2026 부산 청년 아이디어 공모전"), false);
  assert.equal(isResultAnnouncement("공모전 결과물 전시회 안내"), false); // '결과물'은 결과발표 아님
});

// --- 채용 공고 = 노이즈, 단 인턴·서포터즈 등은 예외 ---
test("순수 채용·계약직은 노이즈", () => {
  assert.equal(isJobPosting("동의대 산학협력단 제공인력 채용 공고"), true);
  assert.equal(isJobPosting("계약직 사무보조 모집"), true);
});
test("인턴·서포터즈·공모전·대외활동·장학이 있으면 채용이라도 통과", () => {
  assert.equal(isJobPosting("[보뉴랩] 채용연계형 실전 인턴십 모집"), false); // 인턴
  assert.equal(isJobPosting("OO기업 대학생 서포터즈 채용"), false);          // 서포터즈
  assert.equal(isJobPosting("금융비전스쿨 인턴십 모집"), false);            // 인턴
  assert.equal(isJobPosting("2026 대학생 마케팅 공모전"), false);           // 공모전
  assert.equal(isJobPosting("AX 인재전쟁 OpenAI 채용 해커톤"), false);      // 해커톤
});
