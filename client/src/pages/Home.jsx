import { Link } from "react-router-dom"
import Button from "../components/Button"

/** Screen 1 — Home: today's briefing card + learning streak. */
export default function Home() {
  return (
    <div>
      <h1>해외주식투자 & 실전영어 학습 브리핑</h1>
      <p>
        야후 파이낸스의 주요 뉴스에서 핵심 문장과 영어 표현을 브리핑하여 해외투자와 영어를 동시에
        배우는 서비스입니다.
      </p>
      <Link to="/entry">
        <Button>Open Briefing</Button>
      </Link>
    </div>
  )
}
