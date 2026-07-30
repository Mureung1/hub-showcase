import './ServiceIntro.css'

const SERVICE_NAME = '캠퍼스핏'
const TAGLINE =
  '국립/사립대와 지역을 선택하면 장학금·공모전·지역 지원사업·취업·혜택 정보를 한 곳에 모아주는 대학생 맞춤 정보 서비스'
const PROBLEM =
  '대학생을 위한 장학금, 공모전, 지역 지원사업, 취업, 혜택 정보가 여러 사이트에 흩어져 있어 내 학교와 지역에 맞는 정보를 찾기 어렵습니다.'

const KEY_FEATURES = [
  '국립/사립대 및 지역 선택 필터',
  '장학금 정보 모음',
  '공모전 정보 모음',
  '지역 지원사업 정보 모음',
  '취업 정보 모음',
  '대학생 혜택 정보 모음',
]

function ServiceIntro() {
  return (
    <section className="service-intro">
      <h1 className="service-intro__name">{SERVICE_NAME}</h1>
      <p className="service-intro__tagline">{TAGLINE}</p>

      <div className="service-intro__block">
        <h2>해결하려는 문제</h2>
        <p>{PROBLEM}</p>
      </div>

      <div className="service-intro__block">
        <h2>핵심 기능</h2>
        <ul className="service-intro__features">
          {KEY_FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default ServiceIntro
