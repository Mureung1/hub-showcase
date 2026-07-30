import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { isMergedJeonnamGwangju, mergedProvinceOptionLabel } from './mergedRegion'
import { useDistricts, useProvinces, useZoneOptions } from './useRegionOptions'
import type { SelectedRegion } from './useSelectedRegion'

interface RegionSelectSheetProps {
  initialRegion: SelectedRegion | null
  onSave: (region: SelectedRegion) => void
  onClose: () => void
}

const selectClassName =
  'mb-[10px] w-full rounded-md border border-line bg-card px-[14px] py-[13px] text-sm text-ink disabled:opacity-50'

export default function RegionSelectSheet({ initialRegion, onSave, onClose }: RegionSelectSheetProps) {
  const { lang, t } = useLanguage()
  const [ctpvNm, setCtpvNm] = useState(initialRegion?.ctpvNm ?? '')
  const [sggNm, setSggNm] = useState(initialRegion?.sggNm ?? '')
  const [dongNm, setDongNm] = useState(initialRegion?.dongNm ?? '')

  const { data: provinces = [] } = useProvinces()
  const { data: districts = [], isFetching: isDistrictsLoading } = useDistricts(ctpvNm || undefined)
  const { data: zoneOptions, isFetching: isZoneOptionsLoading } = useZoneOptions(ctpvNm || undefined, sggNm || undefined)

  useEffect(() => {
    setSggNm('')
    setDongNm('')
  }, [ctpvNm])

  useEffect(() => {
    setDongNm('')
  }, [sggNm])

  const needsDong = Boolean(zoneOptions?.covered && !zoneOptions.districtWide)
  const canSave = Boolean(ctpvNm && sggNm && zoneOptions?.covered && (!needsDong || dongNm))

  function displayName(option: { name: string; nameEn: string | null }): string {
    return lang === 'en' && option.nameEn ? option.nameEn : option.name
  }

  function handleSave() {
    if (!canSave || !zoneOptions) return
    // districtWide일 땐 옵션이 정확히 1개뿐이므로 그 값을 그대로 쓴다 — "없음"/구 이름/수거방식 등
    // 실제로 무엇이든 백엔드 매칭 키와 일치시켜야 하므로 sggNm 같은 임의 placeholder를 쓰지 않는다.
    const resolvedDongNm = needsDong ? dongNm : zoneOptions.dongOptions[0].name
    onSave({
      ctpvNm,
      sggNm,
      dongNm: resolvedDongNm,
      ctpvNmEn: provinces.find((province) => province.name === ctpvNm)?.nameEn ?? null,
      sggNmEn: districts.find((district) => district.name === sggNm)?.nameEn ?? null,
    })
  }

  return (
    <div className="fixed inset-0 z-20 mx-auto flex max-w-[420px] items-end bg-[rgba(14,58,44,0.45)]">
      <div className="w-full rounded-t-[22px] bg-card px-5 pt-[22px] pb-[30px]">
        <h3 className="mb-[14px] font-display text-[17px]">{t('region.sheetTitle')}</h3>

        <select value={ctpvNm} onChange={(event) => setCtpvNm(event.target.value)} className={selectClassName}>
          <option value="">{t('region.provincePlaceholder')}</option>
          {provinces.map((province) => (
            <option key={province.name} value={province.name}>
              {isMergedJeonnamGwangju(province.name) ? mergedProvinceOptionLabel(lang) : displayName(province)}
            </option>
          ))}
        </select>

        <select
          value={sggNm}
          onChange={(event) => setSggNm(event.target.value)}
          disabled={!ctpvNm || isDistrictsLoading}
          className={selectClassName}
        >
          <option value="">{t('region.districtPlaceholder')}</option>
          {districts.map((district) => (
            <option key={district.name} value={district.name}>
              {displayName(district)}
            </option>
          ))}
        </select>

        {sggNm && isZoneOptionsLoading ? <p className="mb-[10px] text-[13px] text-sub">{t('common.loading')}</p> : null}

        {sggNm && zoneOptions && !zoneOptions.covered ? (
          <p className="mb-[10px] text-[13px] text-sub">{t('region.notCovered')}</p>
        ) : null}

        {needsDong ? (
          <select
            value={dongNm}
            onChange={(event) => setDongNm(event.target.value)}
            disabled={isZoneOptionsLoading}
            className={selectClassName}
          >
            <option value="">{t('region.zonePlaceholder')}</option>
            {zoneOptions?.dongOptions.map((dong) => (
              <option key={dong.name} value={dong.name}>
                {displayName(dong)}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-md bg-green-600 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {t('region.save')}
        </button>
        <button type="button" onClick={onClose} className="mt-2 w-full py-3 text-center text-sm text-sub">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
