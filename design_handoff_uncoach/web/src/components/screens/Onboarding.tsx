"use client";
import { useState } from "react";
import { useApp } from "@/lib/client/store";
import { ROLES } from "@/lib/domain/situations";

const AGES = [
  { v: "10대", l: "10대" },
  { v: "20대", l: "20대" },
  { v: "30대", l: "30대" },
  { v: "40대", l: "40대" },
  { v: "50대 이상", l: "50대 이상" },
];
const GENDERS = [
  { v: "남성", l: "남성" },
  { v: "여성", l: "여성" },
  { v: "밝히지 않음", l: "기타" },
];
const INTERESTS = ["리더십", "커뮤니케이션", "생산성", "마인드셋", "테크/IT", "건강/웰빙"];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  function toggleInterest(v: string) {
    setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  }

  function save() {
    app.saveProfile({
      role: occupation || "",
      name: name.trim() || undefined,
      age: age || undefined,
      gender: gender || undefined,
      interests: interests.length ? interests : undefined,
      goal: interests.length ? interests.join(", ") : undefined,
    });
    onDone();
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      {/* TopNavBar */}
      <nav className="bg-surface-container-lowest shadow-card flex justify-between items-center w-full px-margin-page h-16 z-50">
        <div className="flex items-center gap-stack-lg">
          <div className="text-headline-md font-headline-md font-bold text-primary">언코</div>
        </div>
        <div className="flex items-center gap-stack-md">
          <button className="text-primary font-bold opacity-80 scale-95 p-2 rounded-full flex items-center justify-center bg-surface-container-low">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-grow flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-fixed opacity-20 blur-[100px]" />
          <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-secondary-fixed opacity-20 blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-margin-page pt-12 pb-32 flex flex-col items-center">
          <h1 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-on-surface text-center mb-12">성장을 위한 기본 정보를 입력해 주세요</h1>

          <div className="w-full max-w-3xl bg-surface-container-lowest rounded-xl shadow-card border border-border-light p-padding-card flex flex-col gap-stack-lg">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="font-headline-md text-body-lg text-on-surface font-semibold" htmlFor="user_name">이름</label>
              <input
                id="user_name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="block w-full px-4 py-3 text-body-lg font-body-lg bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-on-surface"
              />
            </div>

            {/* Age + Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter-grid">
              <div className="flex flex-col gap-2">
                <label className="font-headline-md text-body-lg text-on-surface font-semibold" htmlFor="age">연령</label>
                <div className="relative w-full">
                  <select
                    id="age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="block w-full px-4 py-3 text-body-lg font-body-lg bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-on-surface appearance-none"
                  >
                    <option value="" disabled>연령대를 선택하세요</option>
                    {AGES.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-outline">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-headline-md text-body-lg text-on-surface font-semibold">성별</label>
                <div className="flex gap-2 h-full">
                  {GENDERS.map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => setGender(g.v)}
                      className={
                        "flex-1 flex items-center justify-center py-3 border rounded-lg cursor-pointer transition-colors text-body-lg font-body-lg text-center " +
                        (gender === g.v ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-on-surface-variant")
                      }
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Occupation */}
            <div className="flex flex-col gap-2">
              <label className="font-headline-md text-body-lg text-on-surface font-semibold" htmlFor="occupation">직업</label>
              <div className="relative w-full">
                <select
                  id="occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="block w-full px-4 py-3 text-body-lg font-body-lg bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-on-surface appearance-none"
                >
                  <option value="" disabled>직업군을 선택하세요</option>
                  {ROLES.map(([label]) => <option key={label} value={label}>{label}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-outline">
                  <span className="material-symbols-outlined">expand_more</span>
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className="flex flex-col gap-2 border-t border-border-light pt-6">
              <label className="font-headline-md text-body-lg text-on-surface font-semibold">관심 분야 <span className="text-label-sm font-label-sm font-normal text-slate-muted ml-2">(다중 선택 가능)</span></label>
              <div className="flex flex-wrap gap-3 mt-2">
                {INTERESTS.map((it) => {
                  const on = interests.includes(it);
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => toggleInterest(it)}
                      className={
                        "px-4 py-2 rounded-full border font-body-md transition-colors " +
                        (on ? "border-primary bg-primary-fixed text-primary" : "border-outline-variant text-on-surface-variant")
                      }
                    >
                      {it}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center mt-2">
              <button
                onClick={save}
                className="w-full md:w-auto px-12 py-4 bg-primary text-on-primary rounded-lg font-headline-md flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-card"
              >
                <span>시작하기</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
