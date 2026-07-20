import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'

const WEEK_SCHEDULE = [
  { name: '월', icon: '♻️', type: '플라스틱' },
  { name: '화', icon: '🗑️', type: '일반' },
  { name: '수', icon: '🍚', type: '음식물' },
  { name: '목', icon: '📦', type: '종이' },
  { name: '금', icon: '🥫', type: '캔/유리' },
  { name: '토', icon: '🚫', type: '없음' },
  { name: '일', icon: '🌙', type: '휴무' },
]

const TODAY_INDEX = 6

const QUICK_LINKS = [
  { to: '/bulky', icon: '🚛', label: '대형폐기물' },
  { to: '/points', icon: '📍', label: '주변 수거함' },
  { to: '/rules', icon: '📄', label: '배출 규정' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [isUploadSheetOpen, setUploadSheetOpen] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-sm">
            👤
          </span>
        }
      />

      <div className="px-5 pt-[18px] pb-[90px]">
        <div className="flex items-center gap-[6px] rounded-pill border border-green-100 bg-green-50 px-[14px] py-[11px] text-[13.5px] font-bold text-green-900">
          📍 부산 / 해운대구 <span className="ml-auto">▾</span>
        </div>

        <Link
          to="/search"
          className="mt-3 flex items-center gap-2 rounded-md border border-line bg-card px-[14px] py-[13px] text-sm text-sub"
        >
          🔍 버릴 물건 검색하기
        </Link>

        <div className="mt-4 overflow-hidden rounded-[20px] bg-[radial-gradient(120%_140%_at_0%_0%,var(--green-700),var(--green-900))] p-5 text-white">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">오늘 · 일요일</div>
          <h2 className="mt-[6px] font-display text-[23px]">오늘은 수거 없음</h2>
          <p className="mt-[6px] text-[13px] leading-relaxed opacity-90">
            오늘은 쉬는 날이에요. 내일부터 플라스틱/비닐 수거가 재개됩니다.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-[6px]">
          {WEEK_SCHEDULE.map((day, index) => {
            const isToday = index === TODAY_INDEX
            return (
              <div
                key={day.name}
                className={`rounded-md border px-[3px] py-[9px] text-center text-[10.5px] ${
                  isToday ? 'border-green-600 bg-green-900 text-white' : 'border-line bg-card'
                }`}
              >
                <div className={`font-bold ${isToday ? 'text-[#cfe8db]' : 'text-sub'}`}>{day.name}</div>
                <div className="my-1 text-base">{day.icon}</div>
                <div className={`text-[9.5px] font-bold ${isToday ? 'text-white' : 'text-green-900'}`}>
                  {day.type}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-xs font-extrabold tracking-wider text-green-700 uppercase">빠른 안내</div>
        <div className="mt-[10px] grid grid-cols-3 gap-[10px]">
          {QUICK_LINKS.map((link) => (
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
        aria-label="물건 확인하기"
        className="absolute right-5 bottom-6 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-green-600 text-[28px] text-white shadow-[0_10px_24px_rgba(39,145,96,0.45)]"
      >
        +
      </button>

      {isUploadSheetOpen ? (
        <div className="fixed inset-0 z-20 mx-auto flex max-w-[420px] items-end bg-[rgba(14,58,44,0.45)]">
          <div className="w-full rounded-t-[22px] bg-card px-5 pt-[22px] pb-[30px]">
            <h3 className="mb-[14px] font-display text-[17px]">물건 확인하기</h3>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="mb-[10px] flex w-full items-center gap-3 rounded-md bg-green-50 px-[14px] py-[15px] text-left text-sm font-bold"
            >
              📷 사진 촬영
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="mb-[10px] flex w-full items-center gap-3 rounded-md bg-green-50 px-[14px] py-[15px] text-left text-sm font-bold"
            >
              🖼️ 갤러리에서 업로드
            </button>
            <button
              type="button"
              onClick={() => setUploadSheetOpen(false)}
              className="w-full py-3 text-center text-sm text-sub"
            >
              취소
            </button>
          </div>
        </div>
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
