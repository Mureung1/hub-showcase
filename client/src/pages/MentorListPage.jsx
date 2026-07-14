import { useState } from "react";
import MentorCard from "../components/MentorCard";

const sampleMentor = {
  id: "kim-oo",
  name: "김OO",
  program: "재료공학부 박사과정",
  introduction: "전고체 배터리와 나노소재 기반 에너지 저장을 연구합니다.",
  keywords: ["GAA", "FinFET", "차세대반도체"],
  major: "재료공학",
  lab: "나노소자 연구실",
  availableTime: "화 19:00, 금 15:00",
};

function MentorListPage() {
  const [isSelected, setIsSelected] = useState(false);

  return (
    <div className="mentor-list-page">
      <header className="page-header mentor-list-header">
        <div>
          <p className="eyebrow">멘티 로그인 화면</p>
          <h1 className="page-title">멘토 프로필 목록</h1>
        </div>
        <span className="tag">멘티 화면</span>
      </header>

      <main className="page-container mentor-list-container">
        <section className="stack" aria-label="멘토 목록">
          <MentorCard
            mentor={sampleMentor}
            selected={isSelected}
            onSelect={setIsSelected}
          />
        </section>
      </main>
    </div>
  );
}

export default MentorListPage;
