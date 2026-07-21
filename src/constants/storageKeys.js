// ResultPage(#9)와 LandingPage(#14)가 같은 localStorage 키를 공유한다 — 문자열을 각자 중복 정의하면
// 나중에 오타 하나로 조용히 어긋날 수 있어 한 곳에서만 정의한다.
export const ANALYSIS_ID_STORAGE_KEY = 'specfit_analysis_id'

// 다크모드 선호는 filters/spec/result(specfit_app_state)나 분석 id와는 무관한 별개 관심사라 분리된 키를 쓴다.
// prototype/demo_13.html과 동일한 키(specfit_theme_v1) — index.html의 FOUC 방지 인라인 스크립트와도 공유.
export const THEME_STORAGE_KEY = 'specfit_theme_v1'
