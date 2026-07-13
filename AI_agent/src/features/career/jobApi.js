const CAREER_NET_API_URL = "https://www.career.go.kr/cnet/openapi/getOpenApi";

const fallbackJobs = [
  {
    id: "fallback-system-software",
    name: "시스템소프트웨어개발자",
    category: "IT관련전문직",
    aliases: ["백엔드 개발자", "서버 개발자", "백엔드", "서버"],
  },
  {
    id: "fallback-application-software",
    name: "응용소프트웨어개발자",
    category: "IT관련전문직",
    aliases: ["프론트엔드 개발자", "웹 개발자", "앱 개발자", "풀스택 개발자"],
  },
  {
    id: "fallback-data-analyst",
    name: "데이터분석가",
    category: "IT관련전문직",
    aliases: ["데이터 분석가", "BI 분석가", "데이터 애널리스트"],
  },
  {
    id: "fallback-product-manager",
    name: "상품기획전문가",
    category: "기획 관련직",
    aliases: ["서비스 기획자", "PM", "프로덕트 매니저", "프로덕트 오너"],
  },
  {
    id: "fallback-designer",
    name: "제품디자이너",
    category: "디자인 관련직",
    aliases: ["UX 디자이너", "UI 디자이너", "UX/UI 디자이너"],
  },
];

const practicalAliasRules = [
  {
    aliases: ["백엔드 개발자", "백엔드", "서버 개발자", "서버 엔지니어"],
    targetNames: ["시스템소프트웨어개발자", "컴퓨터시스템설계분석가"],
  },
  {
    aliases: ["프론트엔드 개발자", "프론트엔드", "웹 개발자", "웹 퍼블리셔"],
    targetNames: ["웹개발자", "응용소프트웨어개발자", "시스템소프트웨어개발자"],
  },
  {
    aliases: ["앱 개발자", "모바일 개발자", "안드로이드 개발자", "iOS 개발자"],
    targetNames: ["응용소프트웨어개발자", "시스템소프트웨어개발자"],
  },
  {
    aliases: ["풀스택 개발자", "풀스택"],
    targetNames: ["응용소프트웨어개발자", "시스템소프트웨어개발자"],
  },
  {
    aliases: ["데이터 분석가", "데이터 애널리스트", "BI 분석가"],
    targetNames: ["데이터베이스개발자", "통계 및 설문조사원", "시장 및 여론조사전문가"],
  },
  {
    aliases: ["데이터 엔지니어", "DB 엔지니어"],
    targetNames: ["데이터베이스개발자", "시스템소프트웨어개발자"],
  },
  {
    aliases: ["AI 엔지니어", "머신러닝 엔지니어", "ML 엔지니어"],
    targetNames: ["인공지능전문가", "시스템소프트웨어개발자"],
  },
  {
    aliases: ["정보보안 전문가", "보안 엔지니어", "보안 관제"],
    targetNames: ["정보보호전문가", "컴퓨터보안전문가"],
  },
  {
    aliases: ["서비스 기획자", "PM", "프로덕트 매니저", "프로덕트 오너"],
    targetNames: ["상품기획전문가", "기획 및 마케팅사무원"],
  },
  {
    aliases: ["UX 디자이너", "UI 디자이너", "UX/UI 디자이너", "프로덕트 디자이너"],
    targetNames: ["제품디자이너", "시각디자이너", "웹디자이너"],
  },
  {
    aliases: ["콘텐츠 마케터", "퍼포먼스 마케터", "브랜드 마케터", "마케터"],
    targetNames: ["마케팅전문가", "광고 및 홍보전문가"],
  },
  {
    aliases: ["인사 담당자", "HR", "리크루터", "채용 담당자"],
    targetNames: ["인사 및 노무사무원", "직업상담사"],
  },
  {
    aliases: ["회계 담당자", "재무 담당자", "회계사무원"],
    targetNames: ["회계사무원", "경리사무원"],
  },
  {
    aliases: ["영상 편집자", "PD", "콘텐츠 PD"],
    targetNames: ["영상·녹화 및 편집기사", "방송연출가"],
  },
  {
    aliases: ["게임 기획자", "게임 개발자", "게임 프로그래머"],
    targetNames: ["게임프로그래머", "응용소프트웨어개발자"],
  },
];

let careerNetJobCache = null;

const getApiKey = () => import.meta.env.VITE_CAREER_NET_API_KEY || "";

const normalizeContent = (content) => {
  if (!content) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
};

const normalizeText = (value) =>
  String(value || "").toLowerCase().replace(/\s+/g, "");

const getJobName = (job) =>
  job.job || job.job_nm || job.jobNm || job.jobName || job.name || "";

const normalizeJob = (job, index) => {
  const name = getJobName(job);

  return {
    id:
      job.jobdicSeq ||
      job.job_cd ||
      job.jobCd ||
      job.job_code ||
      job.seq ||
      `career-net-job-${index}-${name}`,
    name,
    category:
      job.profession ||
      job.job_lcl ||
      job.jobLcl ||
      job.job_mcl ||
      job.jobMcl ||
      job.category ||
      "",
    summary: job.summary || "",
    aliases: [],
  };
};

const applyPracticalAliases = (jobs) => {
  const jobsByName = new Map(jobs.map((job) => [normalizeText(job.name), job]));

  practicalAliasRules.forEach((rule) => {
    const targetJob = rule.targetNames
      .map((targetName) => jobsByName.get(normalizeText(targetName)))
      .find(Boolean);

    if (!targetJob) {
      return;
    }

    targetJob.aliases = Array.from(
      new Set([...(targetJob.aliases || []), ...rule.aliases])
    );
  });

  return jobs;
};

const createBaseParams = (apiKey) =>
  new URLSearchParams({
    apiKey,
    svcType: "api",
    svcCode: "JOB",
    contentType: "json",
    gubun: "job_dic_list",
    perPage: "500",
    thisPage: "1",
  });

const fetchCareerNetJobs = async () => {
  if (careerNetJobCache) {
    return careerNetJobCache;
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    careerNetJobCache = applyPracticalAliases(fallbackJobs);
    return careerNetJobCache;
  }

  const response = await fetch(`${CAREER_NET_API_URL}?${createBaseParams(apiKey)}`);

  if (!response.ok) {
    throw new Error("커리어넷 직업 목록을 불러오지 못했습니다.");
  }

  const data = await response.json();
  const jobs = normalizeContent(data?.dataSearch?.content)
    .map(normalizeJob)
    .filter((job) => job.name);

  careerNetJobCache = applyPracticalAliases(jobs);
  return careerNetJobCache;
};

const getSearchText = (job) =>
  normalizeText([job.name, job.category, ...(job.aliases || [])].join(" "));

const getMatchedAlias = (job, keyword) => {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return "";
  }

  return (
    (job.aliases || []).find((alias) =>
      normalizeText(alias).includes(normalizedKeyword)
    ) || ""
  );
};

export const searchJobs = async (keyword) => {
  const normalizedKeyword = keyword.trim();
  const jobs = await fetchCareerNetJobs();

  if (!normalizedKeyword) {
    return jobs;
  }

  const normalizedSearch = normalizeText(normalizedKeyword);

  return jobs
    .filter((job) => getSearchText(job).includes(normalizedSearch))
    .map((job) => ({
      ...job,
      matchedAlias: getMatchedAlias(job, normalizedKeyword),
    }));
};
