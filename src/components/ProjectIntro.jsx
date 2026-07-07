import './ProjectIntro.css'

const FEATURES = [
  {
    title: '오늘의 랜덤 챌린지',
    description: '매일 오전 7시, 새로운 주제가 도착해요. (예: 오늘의 하늘, 오늘의 색깔)',
  },
  {
    title: '하루 한 장 기록',
    description: '앱 카메라로 바로 촬영하고 한 줄 메모를 남겨요. 하루 1회만 업로드할 수 있어요.',
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

const TECH_STACK = ['Flutter', 'Spring Boot', 'PostgreSQL', 'JWT', 'AWS S3', 'FCM']

function ProjectIntro() {
  return (
    <main className="project-intro">
      <p className="eyebrow">Side Project</p>
      <h1>챌린지로그</h1>
      <p className="tagline">
        매일 주어지는 랜덤 주제로 사진을 기록하고, 한 달의 순간을 달력으로 돌아보는 감성 기록 서비스
      </p>

      <section className="features">
        {FEATURES.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="tech-stack">
        <h3>Tech Stack</h3>
        <ul>
          {TECH_STACK.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default ProjectIntro
