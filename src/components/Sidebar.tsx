import { NavLink } from 'react-router-dom'

interface MenuItem {
  label: string
  to?: string
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const sections: MenuSection[] = [
  {
    title: '컴퓨터공학과',
    items: [
      { label: '정렬', to: '/cs/sorting' },
      { label: '스택' },
      { label: '큐' },
      { label: '트리' },
    ],
  },
  {
    title: '화학과',
    items: [
      { label: '일반화학 (분자 뷰어)', to: '/chemistry/viewer' },
      { label: '유기화학 (반응 멘토)', to: '/chemistry/organic' },
      { label: '무기화학' },
      { label: '물리화학' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-zinc-800 bg-zinc-950 px-4 py-6">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {section.title}
          </h3>
          <ul className="mt-2 space-y-0.5">
            {section.items.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-cyan-400/10 font-medium text-cyan-300'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-600">
                    <span>{item.label}</span>
                    <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-600">
                      준비 중
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  )
}
