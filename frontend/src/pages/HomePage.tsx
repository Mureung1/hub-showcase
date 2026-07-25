import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import RegionSelectSheet from '../features/region/RegionSelectSheet'
import { useRegionRule } from '../features/region/useRegionOptions'
import { formatSelectedRegionLabel, useSelectedRegion } from '../features/region/useSelectedRegion'
import { buildWeeklySchedule, getTodayIndex } from '../features/region/weeklySchedule'
import { translateCategoryCombo, translateDayName } from '../i18n/helpers'
import { useLanguage } from '../i18n/LanguageContext'

export default function HomePage() {
  const navigate = useNavigate()
  const [isUploadSheetOpen, setUploadSheetOpen] = useState(false)
  const [isRegionSheetOpen, setRegionSheetOpen] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const { region, setRegion } = useSelectedRegion()
  const { data: regionRule, isLoading: isRegionRuleLoading } = useRegionRule(region)
  const { lang, t } = useLanguage()

  const quickLinks = [
    { to: '/bulky', icon: '🚛', label: t('quickLink.bulky') },
    { to: '/points', icon: '📍', label: t('quickLink.points') },
    { to: '/rules', icon: '📄', label: t('quickLink.rules') },
  ]

  const weeklySchedule = regionRule ? buildWeeklySchedule(regionRule.categories) : null
  const today = weeklySchedule?.[getTodayIndex()]

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadSheetOpen(false)
    navigate('/confirm', { state: { file } })
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2 font-display text-xl font-bold text-green-900">
            <span className="inline-block h-6 w-6 rounded-[65%_35%_55%_45%] bg-green-600" aria-hidden />
            EcoBot
          </span>
        }
        action={
          <span
            aria-label={t('home.profileAlt')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-sm"
          >
            👤
          </span>
        }
      />

      <div className="px-5 pt-[18px] pb-[90px]">
        <button
          type="button"
          onClick={() => setRegionSheetOpen(true)}
          className="flex w-full items-center gap-[6px] rounded-pill border border-green-100 bg-green-50 px-[14px] py-[11px] text-left text-[13.5px] font-bold text-green-900"
        >
          📍 {region ? formatSelectedRegionLabel(region, lang) : t('home.selectRegionPlaceholder')}
          <span className="ml-auto">▾</span>
        </button>

        <Link
          to="/search"
          className="mt-3 flex items-center gap-2 rounded-md border border-line bg-card px-[14px] py-[13px] text-sm text-sub"
        >
          🔍 {t('home.searchCta')}
        </Link>

        {!region ? (
          <div className="mt-4 rounded-[20px] border border-line bg-card p-5">
            <h2 className="font-display text-[17px] text-ink">{t('home.selectRegionPlaceholder')}</h2>
            <p className="mt-[6px] text-[13px] leading-relaxed text-sub">{t('home.noRegionBody')}</p>
          </div>
        ) : isRegionRuleLoading ? (
          <div className="mt-4 rounded-[20px] border border-line bg-card p-5 text-sm text-sub">
            {t('common.loading')}
          </div>
        ) : today ? (
          <>
            <div className="mt-4 overflow-hidden rounded-[20px] bg-[radial-gradient(120%_140%_at_0%_0%,var(--green-700),var(--green-900))] p-5 text-white">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                {t('home.today')} · {translateDayName(today.name, t)}
              </div>
              <h2 className="mt-[6px] font-display text-[23px]">
                {today.rules.length === 0
                  ? t('home.noPickupToday')
                  : `${t('home.pickupAvailablePrefix')}${translateCategoryCombo(today.label, lang, t)}${t('home.pickupAvailableSuffix')}`}
              </h2>
              <p className="mt-[6px] text-[13px] leading-relaxed opacity-90">
                {today.rules.length === 0
                  ? t('home.noPickupTodayBody')
                  : `${today.rules[0].rule.beginTime}~${today.rules[0].rule.endTime} ${t('home.disposeBetween')}`}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-[6px]">
              {weeklySchedule?.map((day, index) => {
                const isToday = index === getTodayIndex()
                return (
                  <div
                    key={day.name}
                    className={`rounded-md border px-[3px] py-[9px] text-center text-[10.5px] ${
                      isToday ? 'border-green-600 bg-green-900 text-white' : 'border-line bg-card'
                    }`}
                  >
                    <div className={`font-bold ${isToday ? 'text-[#cfe8db]' : 'text-sub'}`}>
                      {translateDayName(day.name, t)}
                    </div>
                    <div className="my-1 text-base">{day.icon}</div>
                    <div className={`text-[9.5px] font-bold ${isToday ? 'text-white' : 'text-green-900'}`}>
                      {translateCategoryCombo(day.label, lang, t)}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : null}

        <div className="mt-6 text-xs font-extrabold tracking-wider text-green-700 uppercase">
          {t('home.quickGuide')}
        </div>
        <div className="mt-[10px] grid grid-cols-3 gap-[10px]">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-3xl border border-line bg-card px-2 py-[18px] text-center"
            >
              <div className="text-[22px]">{link.icon}</div>
              <div className="mt-2 text-[11.5px] font-bold text-ink">{link.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setUploadSheetOpen(true)}
        aria-label={t('home.uploadSheetTitle')}
        className="absolute right-5 bottom-6 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-green-600 text-[28px] text-white shadow-[0_10px_24px_rgba(39,145,96,0.45)]"
      >
        +
      </button>

      {isUploadSheetOpen ? (
        <div className="fixed inset-0 z-20 mx-auto flex max-w-[420px] items-end bg-[rgba(14,58,44,0.45)]">
          <div className="w-full rounded-t-[22px] bg-card px-5 pt-[22px] pb-[30px]">
            <h3 className="mb-[14px] font-display text-[17px]">{t('home.uploadSheetTitle')}</h3>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="mb-[10px] flex w-full items-center gap-3 rounded-md bg-green-50 px-[14px] py-[15px] text-left text-sm font-bold"
            >
              📷 {t('home.takePhoto')}
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="mb-[10px] flex w-full items-center gap-3 rounded-md bg-green-50 px-[14px] py-[15px] text-left text-sm font-bold"
            >
              🖼️ {t('home.uploadFromGallery')}
            </button>
            <button
              type="button"
              onClick={() => setUploadSheetOpen(false)}
              className="w-full py-3 text-center text-sm text-sub"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {isRegionSheetOpen ? (
        <RegionSelectSheet
          initialRegion={region}
          onSave={(next) => {
            setRegion(next)
            setRegionSheetOpen(false)
          }}
          onClose={() => setRegionSheetOpen(false)}
        />
      ) : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
    </div>
  )
}
