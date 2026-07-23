import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
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
  const { t } = useLanguage()
  const [ctpvNm, setCtpvNm] = useState(initialRegion?.ctpvNm ?? '')
  const [sggNm, setSggNm] = useState(initialRegion?.sggNm ?? '')
  const [dongNm, setDongNm] = useState(initialRegion?.dongNm ?? '')

  const { data: provinces = [] } = useProvinces()
  const { data: districts = [] } = useDistricts(ctpvNm || undefined)
  const { data: zoneOptions } = useZoneOptions(ctpvNm || undefined, sggNm || undefined)

  useEffect(() => {
    setSggNm('')
    setDongNm('')
  }, [ctpvNm])

  useEffect(() => {
    setDongNm('')
  }, [sggNm])

  const needsDong = Boolean(zoneOptions?.covered && !zoneOptions.districtWide)
  const canSave = Boolean(ctpvNm && sggNm && zoneOptions?.covered && (!needsDong || dongNm))

  function handleSave() {
    if (!canSave || !zoneOptions) return
    // districtWide일 땐 옵션이 정확히 1개뿐이므로 그 값을 그대로 쓴다 — "없음"/구 이름/수거방식 등
    // 실제로 무엇이든 백엔드 매칭 키와 일치시켜야 하므로 sggNm 같은 임의 placeholder를 쓰지 않는다.
    const resolvedDongNm = needsDong ? dongNm : zoneOptions.dongOptions[0]
    onSave({ ctpvNm, sggNm, dongNm: resolvedDongNm })
  }

  return (
    <div className="fixed inset-0 z-20 mx-auto flex max-w-[420px] items-end bg-[rgba(14,58,44,0.45)]">
      <div className="w-full rounded-t-[22px] bg-card px-5 pt-[22px] pb-[30px]">
        <h3 className="mb-[14px] font-display text-[17px]">{t('region.sheetTitle')}</h3>

        <select value={ctpvNm} onChange={(event) => setCtpvNm(event.target.value)} className={selectClassName}>
          <option value="">{t('region.provincePlaceholder')}</option>
          {provinces.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>

        <select
          value={sggNm}
          onChange={(event) => setSggNm(event.target.value)}
          disabled={!ctpvNm}
          className={selectClassName}
        >
          <option value="">{t('region.districtPlaceholder')}</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>

        {sggNm && zoneOptions && !zoneOptions.covered ? (
          <p className="mb-[10px] text-[13px] text-sub">{t('region.notCovered')}</p>
        ) : null}

        {needsDong ? (
          <select value={dongNm} onChange={(event) => setDongNm(event.target.value)} className={selectClassName}>
            <option value="">{t('region.zonePlaceholder')}</option>
            {zoneOptions?.dongOptions.map((dong) => (
              <option key={dong} value={dong}>
                {dong}
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
