import type { ReactNode } from "react";
import { MonitorPlay } from "lucide-react";
import type { Quest, QuestStatus, ThemeId, UserProfile, WorldState } from "../domain/types";
import { timeLabels } from "../layers/world/worldState";
import { ElectronicPet } from "./ElectronicPet";

interface WorldThemeProps {
  activeTheme: ThemeId;
  world: WorldState;
  profile: UserProfile;
  quest: Quest;
  questStatus: QuestStatus;
  managerLine: string;
}

export function WorldPreview(props: WorldThemeProps) {
  if (props.activeTheme === "xp") return <XpDesktop {...props} />;
  return <LofiCabin {...props} />;
}

function XpDesktop({ world, profile, quest, questStatus, managerLine }: WorldThemeProps) {
  return (
    <section className={`theme-stage xp-stage ${world.timeOfDay}`}>
      <div className="xp-desktop-icons">
        <button type="button">내 프로필</button>
        <button type="button">오늘의 퀘스트</button>
        <button type="button">기록 노트</button>
        <button type="button">매니저</button>
      </div>

      <Window title="내 프로필" className="profile-window">
        <div className="xp-profile-grid">
          <ElectronicPet world={world} compact />
          <dl>
            <dt>닉네임</dt>
            <dd>{profile.nickname}</dd>
            <dt>목표</dt>
            <dd>{profile.primaryGoal}</dd>
            <dt>하루 가능 시간</dt>
            <dd>{profile.minimumMinutes}분</dd>
          </dl>
        </div>
      </Window>

      <Window title="오늘의 퀘스트" className="quest-window">
        <div className="window-quest-title">{quest.title}</div>
        <p>{quest.target}</p>
        <div className="xp-progress">
          <span style={{ width: questStatus === "done" ? "100%" : questStatus === "accepted" ? "55%" : "16%" }} />
        </div>
        <small>{questStatus === "draft" ? "수락 전 수정 가능" : questStatus === "failed" ? "복구 필요" : quest.deadlineLabel}</small>
      </Window>

      <Window title="매니저의 메모리" className="memory-window">
        <strong>lv.7 루미</strong>
        <p>{managerLine}</p>
      </Window>

      <div className="xp-pet-zone">
        <ElectronicPet world={world} />
      </div>

      <div className="xp-taskbar">
        <span className="xp-start">시작</span>
        <span>오늘의 퀘스트</span>
        <time>{timeLabels[world.timeOfDay]} PM 02:30</time>
      </div>
    </section>
  );
}

function LofiCabin({ world, quest, questStatus, managerLine }: WorldThemeProps) {
  return (
    <section className={`theme-stage cabin-stage ${world.timeOfDay}`}>
      <div className="cabin-shell">
        <div className="cabin-wall cabin-wall-left" />
        <div className="cabin-wall cabin-wall-right" />
        <div className="cabin-floor" />
        <div className="cabin-window"><span /></div>
        <div className="cabin-desk">
          <span className="desk-lamp" />
          <span className="desk-book" />
          <span className="desk-cup" />
        </div>
        <div className="quest-board">
          <strong>오늘의 퀘스트</strong>
          <span>{quest.title}</span>
          <em>{questStatus === "done" ? "완료" : questStatus === "failed" ? "복구" : "대기"}</em>
        </div>
        <div className={`pixel-tv ${world.tvMode}`}>
          <MonitorPlay size={22} />
          <span>{world.tvMode === "pixel-reality" ? "PIXEL LIVE" : world.tvMode === "quest-log" ? "LOG" : "IDLE"}</span>
        </div>
        <div className="cabin-bed" />
        <div className="cabin-rug" />
        <ElectronicPet world={world} />
        <div className="cabin-speech">
          <strong>루미</strong>
          <p>{managerLine}</p>
        </div>
      </div>
    </section>
  );
}

function Window({ title, className, children }: { title: string; className: string; children: ReactNode }) {
  return (
    <article className={`xp-window ${className}`}>
      <div className="xp-titlebar">
        <span>{title}</span>
        <div>
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="xp-window-body">{children}</div>
    </article>
  );
}
