import './ServiceIntro.css'

const features = [
  {
    title: '폐업 신고 절차 안내',
    description: '국세청·지자체 폐업 신고 방법과 필요 서류를 단계별로 안내합니다.',
  },
  {
    title: '세무 정산 가이드',
    description: '부가세·종합소득세 신고, 재고 정리 등 폐업 시 세무 처리를 도와드립니다.',
  },
  {
    title: '지원금 및 재기 지원',
    description: '폐업 소상공인을 위한 정부 지원금, 재취업·재창업 프로그램 정보를 제공합니다.',
  },
  {
    title: '맞춤 체크리스트',
    description: '업종별 폐업 절차를 체크리스트로 정리해 빠뜨리는 항목이 없도록 합니다.',
  },
]

function ServiceIntro() {
  return (
    <main className="service-intro">
      <header className="service-intro__header">
        <p className="service-intro__eyebrow">소상공인 폐업 도우미 서비스</p>
        <h1>폐업, 혼자 고민하지 마세요</h1>
        <p className="service-intro__lead">
          복잡한 폐업 절차와 세무 처리, 지원 제도까지 한 곳에서 확인하고
          준비할 수 있도록 도와드리는 소상공인 전용 서비스입니다.
        </p>
      </header>

      <section className="service-intro__features">
        {features.map((feature) => (
          <article className="service-intro__card" key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default ServiceIntro
