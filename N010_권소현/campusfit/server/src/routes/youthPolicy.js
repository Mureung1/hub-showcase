import { Router } from "express";

const router = Router();
const REGION_KEYWORDS = {
  seoul: ["서울"],
  busan: ["부산"],
  daegu: ["대구"],
  incheon: ["인천", "영종구", "부평", "검단", "계양구", "연수구", "미추홀구"],
  gwangju: ["광주", "광산구", "서구", "남구", "동구", "북구"],
  daejeon: ["대전"],
  ulsan: ["울산"],
  sejong: ["세종"],
  gyeonggi: ["경기", "수원", "성남", "고양", "용인", "부천", "안산", "안양", "남양주", "화성", "평택", "의정부", "시흥", "파주", "김포", "광명", "군포", "이천", "양주", "오산", "구리", "안성", "포천", "의왕", "하남", "여주", "동두천", "과천", "양평", "가평", "연천"],
  gangwon: ["강원", "춘천", "원주", "강릉", "동해", "태백", "속초", "삼척", "홍천", "횡성", "영월", "평창", "정선", "철원", "화천", "양구", "인제", "고성", "양양"],
  chungbuk: ["충북", "충청북도", "청주", "충주", "제천", "보은", "옥천", "영동", "증평", "진천", "괴산", "음성", "단양"],
  chungnam: ["충남", "충청남도", "천안", "공주", "보령", "아산", "서산", "논산", "계룡", "당진", "금산", "부여", "서천", "청양", "홍성", "예산", "태안"],
  jeonbuk: ["전북", "전라북도", "전주", "군산", "익산", "정읍", "남원", "김제", "완주", "진안", "무주", "장수", "임실", "순창", "고창", "부안"],
  jeonnam: ["전남", "전라남도", "목포", "여수", "순천", "나주", "광양", "담양", "곡성", "구례", "고흥", "보성", "화순", "장흥", "강진", "해남", "영암", "무안", "함평", "영광", "장성", "완도", "진도", "신안"],
  gyeongbuk: ["경북", "경상북도", "포항", "경주", "김천", "안동", "구미", "영주", "영천", "상주", "문경", "경산", "군위", "의성", "청송", "영양", "영덕", "청도", "고령", "성주", "칠곡", "예천", "봉화", "울진", "울릉"],
  gyeongnam: ["경남", "경상남도", "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안", "창녕", "남해", "하동", "산청", "함양", "거창", "합천"],
  jeju: ["제주"],
};
const EXCLUDE_KEYWORDS = ["신혼부부"];

function isExcluded(text) {
  return EXCLUDE_KEYWORDS.some((k) => text.includes(k));
}

function guessRegions(text) {
  if (!text) return undefined;
  const matched = Object.entries(REGION_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => text.includes(k)))
    .map(([region]) => region);
  return matched.length ? matched : undefined;
}
function guessCategory(item) {
  const text = `${item.plcyNm} ${item.plcyExplnCn}`;
  if (item.__forceInternship || text.includes("인턴")) return "internship";
  if (item.__forceActivity) return "activity";
  return "local";
}
const LOCAL_INTEREST_KEYWORDS = {
  주거: ["주거", "월세", "전세", "임대"],
  교통: ["교통", "버스", "정기권", "통학"],
  취업: ["취업", "구직", "채용", "일자리"],
  문화: ["문화", "공연", "축제", "독서"],
  금융: ["금융", "대출", "적금", "캐시백", "자산형성"],
  복지: ["복지", "건강", "심리", "마음", "치과"],
  창업: ["창업"],
  교육: ["교육", "연수", "탐방", "유학", "국외"],
};

const INTERNSHIP_INTEREST_KEYWORDS = {
  개발: ["개발", "프로그래밍", "소프트웨어", "IT", "웹", "앱"],
  "데이터/AI": ["데이터", "AI", "인공지능", "빅데이터"],
  "엔지니어링/제조": ["제조", "설계", "엔지니어", "기계", "전자"],
  "경영/기획": ["경영", "기획", "전략", "신사업"],
  마케팅: ["마케팅", "홍보", "브랜드", "콘텐츠"],
  "공공/행정": ["행정", "공공", "지자체", "공기업", "정책"],
};

const ACTIVITY_INTEREST_KEYWORDS = {
  봉사: ["봉사", "나눔", "돌봄"],
  "홍보/서포터즈": ["서포터즈", "홍보", "기자단", "리포터", "브랜드참여단"],
  국제교류: ["국제", "해외", "글로벌", "교류"],
  정책참여: ["정책", "참여단", "위원회", "네트워크", "특사단"],
  "탐방/체험": ["탐방", "체험", "포럼"],
  "이공계/기술": ["이공계", "과학", "공학", "기술"],
};

function guessInterest(categoryId, text) {
  const table =
    categoryId === "internship"
      ? INTERNSHIP_INTEREST_KEYWORDS
      : categoryId === "activity"
      ? ACTIVITY_INTEREST_KEYWORDS
      : LOCAL_INTEREST_KEYWORDS;
  for (const [interest, keywords] of Object.entries(table)) {
    if (keywords.some((k) => text.includes(k))) return interest;
  }
  return undefined;
}

function toYouthListing(item) {
  const categoryId = guessCategory(item);
  const text = `${item.plcyNm} ${item.plcyExplnCn} ${item.lclsfNm} ${item.sprvsnInstCdNm || ""} ${item.rgtrInstCdNm || ""} ${item.operInstCdNm || ""}`;
  return {
    id: `youth-${item.plcyNo}`,
    categoryId,
    title: item.plcyNm,
    desc: item.plcyExplnCn,
    interest: guessInterest(categoryId, text),
    sourceUrl: item.aplyUrlAddr || item.refUrlAddr1 || item.refUrlAddr2 || undefined,
    eligibleRegions: guessRegions(text),
    dDay: 999, // TODO: 나중에 실제 날짜로 교체, 일단 임시값
  };
}
router.get("/", async (req, res) => {
  const apiKey = process.env.YOUTH_POLICY_API_KEY;
  const generalUrl = `https://www.youthcenter.go.kr/go/ythip/getPlcy?apiKeyNm=${apiKey}&pageSize=150&rtnType=json`;
  const internshipUrl = `https://www.youthcenter.go.kr/go/ythip/getPlcy?apiKeyNm=${apiKey}&pageSize=100&rtnType=json&plcyKywdNm=인턴`;
  const activityUrl = `https://www.youthcenter.go.kr/go/ythip/getPlcy?apiKeyNm=${apiKey}&pageSize=100&rtnType=json&lclsfNm=참여권리`;

  const [generalRes, internshipRes, activityRes] = await Promise.all([
    fetch(generalUrl),
    fetch(internshipUrl),
    fetch(activityUrl),
  ]);
  const generalData = await generalRes.json();
  const internshipData = await internshipRes.json();
  const activityData = await activityRes.json();

  const internshipItems = internshipData.result.youthPolicyList.map((item) => ({
    ...item,
    __forceInternship: true,
  }));
  const activityItems = activityData.result.youthPolicyList.map((item) => ({
    ...item,
    __forceActivity: true,
  }));
  const allItems = [...generalData.result.youthPolicyList, ...internshipItems, ...activityItems];
  const uniqueItems = [...new Map(allItems.map((item) => [item.plcyNm, item])).values()];

  const listings = uniqueItems
    .filter((item) => !isExcluded(`${item.plcyNm} ${item.plcyExplnCn}`))
    .map(toYouthListing);
  res.json(listings);
});
export default router;