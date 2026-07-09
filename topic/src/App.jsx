import React from 'react';
import './App.css';

function App() {
  return (
    <div className="container">
      <header>
        <h1>초단기 온라인 모임 사이트</h1>
      </header>

      <section className="intro">
        <p>
          스터디, 취미생활 모임, 동아리 등 장기 모임은 시간의 제약이나 참여가 부담스럽게 느껴지지만, 
          그렇다고 혼자 하기에는 시작이 어렵거나 의견을 나누지 못해 아쉬워하는 경우가 종종 있습니다.
        </p>
        <p>
          이런 문제를 해결하기 위해 하루, 짧은 시간 동안만 진행되는 소모임을 통해 
          몰입할 수 있는 시간과 가벼운 소통을 가질 수 있게 합니다.
        </p>
      </section>

      <main className="meeting-list">
        <h2>진행 중인 초단기 모임</h2>
        <div className="card">
          <h4>오늘의 짧은 모임</h4>
          <button>참여하기</button>
        </div>
      </main>
    </div>
  );
}

export default App;