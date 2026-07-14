import { useState } from "react";
import MentorCard from "../components/MentorCard";

const mentors = [
  {
    id: "kim-oo",
    name: "김OO",
    program: "재료공학부 박사과정",
    introduction: "전고체 배터리와 나노소재 기반 에너지 저장을 연구합니다.",
    keywords: ["GAA", "FinFET", "차세대반도체"],
    major: "재료공학",
    lab: "나노소자 연구실",
    availableTime: "화 19:00, 금 15:00",
  },
  {
    id: "lee-oo",
    name: "이OO",
    program: "전산학부 석사과정",
    introduction: "딥러닝 기반 영상 분석과 의료 AI 서비스 개발을 다룹니다.",
    keywords: ["AI", "딥러닝", "컴퓨터비전"],
    major: "전산학",
    lab: "비전지능 연구실",
    availableTime: "월 20:00, 목 18:30",
  },
  {
    id: "park-oo",
    name: "박OO",
    program: "생명과학과 석박통합",
    introduction: "단백질 구조 예측과 바이오 데이터 분석 진로를 도와드립니다.",
    keywords: ["BioAI", "단백질", "데이터분석"],
    major: "생명과학",
    lab: "계산생물학 연구실",
    availableTime: "수 17:00, 토 11:00",
  },
  {
    id: "choi-oo",
    name: "최OO",
    program: "산업공학과 석사과정",
    introduction: "최적화, UX 리서치, 기술 창업 프로젝트 경험을 공유합니다.",
    keywords: ["HCI", "최적화", "기술창업"],
    major: "산업공학",
    lab: "인간중심시스템 연구실",
    availableTime: "목 13:00, 금 18:00",
  },
];

function MentorListPage() {
  const [selectedMentorIds, setSelectedMentorIds] = useState([]);

  const handleMentorSelect = (mentorId, isSelected) => {
    setSelectedMentorIds((currentIds) => {
      if (!isSelected) {
        return currentIds.filter((id) => id !== mentorId);
      }

      if (currentIds.includes(mentorId) || currentIds.length >= 3) {
        return currentIds;
      }

      return [...currentIds, mentorId];
    });
  };

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
          {mentors.map((mentor) => (
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              selected={selectedMentorIds.includes(mentor.id)}
              onSelect={(isSelected) => handleMentorSelect(mentor.id, isSelected)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

export default MentorListPage;
