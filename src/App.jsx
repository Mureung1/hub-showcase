import React from 'react';

export default function ProjectOverview() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-center py-20 px-6 max-w-4xl mx-auto">
      
      {/* 01. 프로젝트 타이틀 */}
      <div className="space-y-4 mb-16 border-b border-slate-200 pb-8 text-left">
        <div className="text-xs font-mono tracking-widest text-blue-600 font-bold uppercase">
          AI Agent Challenge Proposal
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tight">
          Portpolio AI Agent
        </h1>
        <p className="text-lg text-slate-600 font-light leading-relaxed">
          근거 기반 AI 에이전트를 활용한 JD 맞춤형 포트폴리오 자동 생성 서비스
        </p>
      </div>

      {/* 02. 프로젝트 배경 */}
      <div className="space-y-6 mb-16 text-left">
        <h2 className="text-xs font-mono tracking-wider text-slate-400 uppercase">
          01. BACKGROUND & PROBLEM
        </h2>
        <div className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
          "수시 채용 시대, 공고마다 포트폴리오를 새로 고쳐 써야 하는 번거로움"
        </div>
        
        {/* 페인 포인트 리스트 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-5 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="text-blue-600 font-mono text-sm mb-2 font-bold">01. 반복적 피로</div>
            <p className="text-sm text-slate-600 leading-relaxed font-light">
              지원하는 기업의 JD 스택에 맞춰 매번 포트폴리오를 수정해야 하는 극심한 시간 소요
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="text-blue-600 font-mono text-sm mb-2 font-bold">02. 판단의 한계</div>
            <p className="text-sm text-slate-600 leading-relaxed font-light">
              나의 수많은 경험 중 해당 기업 공고에 어떤 프로젝트를 강조해야 할지 기준 부재
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="text-blue-600 font-mono text-sm mb-2 font-bold">03. 낮은 AI 신뢰도</div>
            <p className="text-sm text-slate-600 leading-relaxed font-light">
              기존 AI 도구의 가짜 경력 생성 및 어색한 문체로 인한 서류 신뢰도 저하
            </p>
          </div>
        </div>
      </div>

      {/* 03. 핵심 목표 (Solution) */}
      <div className="space-y-6 border-t border-slate-200 pt-12 text-left">
        <h2 className="text-xs font-mono tracking-wider text-slate-400 uppercase">
          02. CORE GOAL
        </h2>
        <div className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
          "실제 데이터 기반의 거짓 없는 맞춤형 슬라이드 빌드"
        </div>

        {/* 핵심 목표 프로세스 바 */}
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl space-y-6 mt-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center border-b border-slate-800 pb-4 text-xs font-mono text-slate-400">
            <div>INPUT DATA</div>
            <div className="hidden sm:block">⚙️ AGENT PROCESS</div>
            <div>OUTPUT</div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            {/* 인풋 */}
            <div className="w-full md:w-1/3 space-y-2">
              <div className="text-sm font-semibold text-slate-300">사용자 입력 데이터</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-slate-800 text-blue-400 rounded text-xs font-mono">GitHub Repo</span>
                <span className="px-2.5 py-1 bg-slate-800 text-blue-400 rounded text-xs font-mono">Base Resume</span>
                <span className="px-2.5 py-1 bg-slate-800 text-blue-400 rounded text-xs font-mono">Target JD</span>
              </div>
            </div>

            {/* 에이전트 브릿지 화살표 */}
            <div className="flex items-center justify-center text-blue-500 py-2 md:py-0">
              <span className="md:hidden text-xs text-slate-500">▼</span>
              <span className="hidden md:inline text-xl">→</span>
            </div>

            {/* 에이전트 액션 */}
            <div className="w-full md:w-1/3 space-y-1 text-left">
              <div className="text-base font-bold text-white">근거 기반 매칭</div>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                실제 코드 경력만 추출하여 JD와 가장 적합한 TOP 3 프로젝트 자동 선정 및 포트폴리오 형태로 변환
              </p>
            </div>

            {/* 아웃풋 브릿지 화살표 */}
            <div className="flex items-center justify-center text-blue-500 py-2 md:py-0">
              <span className="md:hidden text-xs text-slate-500">▼</span>
              <span className="hidden md:inline text-xl">→</span>
            </div>

            {/* 아웃풋 */}
            <div className="w-full md:w-1/4 text-left md:text-center">
              <div className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">
                <span>PPT / PDF 빌드</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}