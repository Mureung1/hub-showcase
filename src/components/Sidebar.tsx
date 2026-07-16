import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { NAVIGATION } from '../data/navigation'
import { useQnaPanel } from '../features/qna/context/QnaPanelContext'

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const icons = {
  sorting: (
    <svg {...iconProps}>
      <line x1="3" y1="13" x2="3" y2="9" />
      <line x1="7.5" y1="13" x2="7.5" y2="6" />
      <line x1="12" y1="13" x2="12" y2="3" />
    </svg>
  ),
  stack: (
    <svg {...iconProps}>
      <rect x="2.5" y="2.5" width="11" height="3" rx="1" />
      <rect x="2.5" y="6.5" width="11" height="3" rx="1" />
      <rect x="2.5" y="10.5" width="11" height="3" rx="1" />
    </svg>
  ),
  queue: (
    <svg {...iconProps}>
      <rect x="1.5" y="5.5" width="3.4" height="5" rx="0.8" />
      <rect x="6.3" y="5.5" width="3.4" height="5" rx="0.8" />
      <line x1="11.5" y1="8" x2="14.5" y2="8" />
      <path d="M13 6.3 14.5 8 13 9.7" />
    </svg>
  ),
  deque: (
    <svg {...iconProps}>
      <rect x="2" y="4.5" width="8.5" height="5.5" rx="1" />
      <rect x="5" y="7.3" width="8.5" height="5.5" rx="1" />
    </svg>
  ),
  tree: (
    <svg {...iconProps} strokeWidth={1.5}>
      <circle cx="8" cy="3" r="1.5" />
      <line x1="8" y1="4.5" x2="4.3" y2="8.5" />
      <line x1="8" y1="4.5" x2="11.7" y2="8.5" />
      <circle cx="4.3" cy="10" r="1.5" />
      <circle cx="11.7" cy="10" r="1.5" />
    </svg>
  ),
  generalChem: (
    <svg {...iconProps} strokeWidth={1.3}>
      <path d="M6.3 2h3.4M6.9 2v3.8L3.6 12c-.5 1 .1 1.9 1.2 1.9h6.4c1.1 0 1.7-.9 1.2-1.9L9.1 5.8V2" />
    </svg>
  ),
  organicChem: (
    <svg {...iconProps} strokeWidth={1.3}>
      <polygon points="8,2 13,5 13,11 8,14 3,11 3,5" />
    </svg>
  ),
  inorganicChem: (
    <svg {...iconProps} strokeWidth={1.3}>
      <polygon points="8,2 13,8 8,14 3,8" />
    </svg>
  ),
  physicalChem: (
    <svg {...iconProps} strokeWidth={1.3}>
      <ellipse cx="8" cy="8" rx="6" ry="2.6" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
}

const iconMap: Record<string, ReactNode> = icons

export default function Sidebar() {
  const { isOpen, toggle } = useQnaPanel()

  return (
    <aside
      className="flex w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r px-3 py-4"
      style={{ background: 'var(--color-bg-sidebar)', borderColor: 'var(--color-border-card)' }}
    >
      <div
        className="flex items-center gap-2 rounded-[9px] border px-2.5 py-2 text-xs"
        style={{ borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-muted)' }}
        aria-disabled="true"
      >
        <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
          <circle cx="6.5" cy="6.5" r="4" />
          <line x1="9.5" y1="9.5" x2="13" y2="13" />
        </svg>
        <span>화면 검색</span>
        <span
          className="ml-auto rounded-[5px] border px-1.5 py-0.5 text-[10px]"
          style={{ borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-muted)' }}
        >
          준비 중
        </span>
      </div>

      {NAVIGATION.map((dept) => (
        <div key={dept.id}>
          <h3
            className="px-2.5 text-[10.5px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {dept.label}
          </h3>
          <ul className="mt-1.5 space-y-0.5">
            {dept.leaves.map((item) => (
              <li key={item.id}>
                {item.to ? (
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-[9px] border px-2.5 py-2 text-[13.5px] transition-colors ${
                        isActive ? 'font-medium' : ''
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            background: 'var(--color-bg-card-hover)',
                            borderColor: 'var(--color-border-card-strong)',
                            color: 'var(--color-text-primary)',
                            boxShadow: 'var(--shadow-glow-accent)',
                          }
                        : { borderColor: 'transparent', color: 'var(--color-text-secondary)' }
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                          {iconMap[item.iconKey]}
                        </span>
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ) : (
                  <div
                    className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>{iconMap[item.iconKey]}</span>
                    <span className="flex-1">{item.label}</span>
                    <span
                      className="rounded-[5px] border px-1.5 py-0.5 text-[10px]"
                      style={{ borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-muted)' }}
                    >
                      준비 중
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div
        className="mt-auto rounded-[12px] border p-3"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-card)' }}
      >
        <span style={{ color: 'var(--color-accent)' }}>
          <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3}>
            <path
              d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6l-3 3v-3H4a2 2 0 0 1-2-2V4Z"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h3 className="mt-2 text-[12.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          화면 상태를 아는 AI Q&amp;A
        </h3>
        <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          지금 보는 단계를 그대로 컨텍스트로 넘겨 질문에 답해요.
        </p>
        <button
          type="button"
          onClick={toggle}
          className="mt-2.5 w-full rounded-[7px] border py-1.5 text-center text-[11.5px]"
          style={
            isOpen
              ? { borderColor: 'var(--color-accent)', background: 'var(--color-accent-fill)', color: 'var(--color-accent-text)' }
              : { borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-muted)' }
          }
        >
          {isOpen ? '닫기' : '열어보기'}
        </button>
      </div>
    </aside>
  )
}
