type Feature = {
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    title: '오늘의 랜덤 챌린지',
    description: '매일 오전 7시, 새로운 주제가 도착해요. (예: 오늘의 하늘, 오늘의 색깔)',
  },
  {
    title: '하루 한 장 기록',
    description: '웹 카메라로 바로 촬영하고 한 줄 메모를 남겨요. 하루 1회만 업로드할 수 있어요.',
  },
  {
    title: '캘린더로 돌아보기',
    description: '기록한 날에는 사진 썸네일이, 기록하지 않은 날은 비어 있는 달력을 확인해요.',
  },
  {
    title: '매일 알림',
    description: '오전 7시, 오늘의 챌린지가 도착했다는 알림을 받아요.',
  },
]

const TECH_STACK = ['React', 'TypeScript', 'Tailwind CSS', 'Spring Boot', 'PostgreSQL', 'Web Push']

function ProjectIntro() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-20 pt-16 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Side Project</p>
      <h1 className="text-4xl tracking-tight sm:text-[44px]">챌린지로그</h1>
      <p className="mx-auto mt-4 max-w-md text-[17px]">
        매일 주어지는 랜덤 주제로 사진을 기록하고, 한 달의 순간을 달력으로 돌아보는 감성 기록 서비스
      </p>

      <section className="mt-12 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <article
            className="rounded-xl border border-border bg-card p-5"
            key={feature.title}
          >
            <h2 className="mb-2 text-[17px]">{feature.title}</h2>
            <p className="text-[15px] leading-normal">{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <h3 className="mb-4 text-sm uppercase tracking-wide text-muted">Tech Stack</h3>
        <ul className="flex flex-wrap justify-center gap-2">
          {TECH_STACK.map((tech) => (
            <li
              className="rounded-full bg-accent-bg px-3.5 py-1.5 text-[13px] font-medium text-accent"
              key={tech}
            >
              {tech}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-xl border border-border bg-card p-6">
        <h3 className="mb-2 text-[17px] text-heading">프로토타입 보기</h3>
        <p className="mx-auto max-w-sm text-[15px]">
          순수 HTML·CSS로 만든 5개 화면 프로토타입에서 핵심 흐름을 직접 확인해보세요.
        </p>
        <a
          className="mt-5 inline-block rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white"
          href="/prototype/index.html"
          rel="noopener noreferrer"
          target="_blank"
        >
          프로토타입 열기
        </a>
      </section>
    </main>
  )
}

export default ProjectIntro
