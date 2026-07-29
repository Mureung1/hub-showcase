import { ScrollReveal } from "../ScrollReveal";

type LandingStat = {
  readonly value: string;
  readonly unit: string;
  readonly label: string;
  readonly accent?: boolean;
};

const stats: readonly LandingStat[] = [
  { value: "4", unit: "분", label: "포트폴리오 생성까지 걸리는 시간" },
  { value: "2", unit: "문장", label: "직접 써야 하는 분량" },
  { value: "300", unit: "개", label: "읽어 들이는 커밋", accent: true },
  { value: "0", unit: "줄", label: "저장되는 코드 원문" },
] as const;

export function LandingStatsSection() {
  return (
    <section className="bg-white" id="landing-content-start" aria-label="PtoP 사용 기준">
      <div className="ptop-landing-container grid grid-cols-2 gap-5 py-[72px] pb-[66px] text-center md:grid-cols-4">
        {stats.map((stat, index) => (
          <ScrollReveal key={stat.label} delay={index * 60}>
            <div>
              <div
                className={`font-brand text-[40px] font-extrabold leading-none tracking-[-0.045em] ${stat.accent ? "text-[#16A46A]" : "text-[#14231C]"}`}
              >
                {stat.value}
                <span className="ml-1 text-[22px]">{stat.unit}</span>
              </div>
              <div className="mt-[9px] text-[13.5px] font-semibold leading-[1.5] text-[#4A5A53]">
                {stat.label}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
