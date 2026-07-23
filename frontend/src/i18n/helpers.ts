import type { Lang, TranslationKey } from './LanguageContext'

// weeklySchedule.ts는 카테고리명을 '·'로 이어붙인 한국어 문자열(예: "생활쓰레기·재활용품")을 만든다 —
// 순수 데이터 모듈이라 i18n을 모르므로, 렌더링 시점에 이 조합을 분해해 각 조각을 번역한다.
export function translateCategoryCombo(comboKo: string, lang: Lang, t: (key: TranslationKey) => string): string {
  if (comboKo === '없음') return t('category.없음')

  const separator = lang === 'ko' ? '·' : ', '
  return comboKo
    .split('·')
    .map((part) => t(`category.${part}` as TranslationKey))
    .join(separator)
}

export function translateDayName(dayKo: string, t: (key: TranslationKey) => string): string {
  return t(`day.${dayKo}` as TranslationKey)
}
