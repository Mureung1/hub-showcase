import { CheckCircle2, Mic, MonitorPlay, RotateCcw, Sparkles, Telescope, Video, XCircle } from "lucide-react";
import type {
  ExpansionFeature,
  ManagerMemory,
  Quest,
  QuestStatus,
  RewardItem,
  SocialQuestShard,
  ThemeId,
  UserProfile,
  WorldState,
} from "../domain/types";
import { assetPrompts } from "../data/assets";
import { inputCapabilities } from "../layers/input/inputAdapters";
import { socialPolicySummary } from "../layers/social/socialPolicy";

interface ProfilePanelProps {
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
}

export function ProfilePanel({ profile, onProfileChange }: ProfilePanelProps) {
  return (
    <section className="panel profile-panel">
      <div className="panel-title">
        <span>Profile Layer</span>
        <em>local-first</em>
      </div>
      <div className="form-grid">
        <label>
          이름
          <input value={profile.name} onChange={(event) => onProfileChange({ ...profile, name: event.target.value })} />
        </label>
        <label>
          닉네임
          <input value={profile.nickname} onChange={(event) => onProfileChange({ ...profile, nickname: event.target.value })} />
        </label>
        <label className="wide">
          주요 목표
          <input value={profile.primaryGoal} onChange={(event) => onProfileChange({ ...profile, primaryGoal: event.target.value })} />
        </label>
        <label>
          하루 최소 시간
          <input
            type="number"
            min="5"
            max="180"
            value={profile.minimumMinutes}
            onChange={(event) => onProfileChange({ ...profile, minimumMinutes: Number(event.target.value) })}
          />
        </label>
        <label>
          진행 강도
          <select value={profile.questSize} onChange={(event) => onProfileChange({ ...profile, questSize: event.target.value as UserProfile["questSize"] })}>
            <option value="tiny">가볍게</option>
            <option value="balanced">보통</option>
            <option value="challenge">도전적으로</option>
          </select>
        </label>
      </div>
    </section>
  );
}

interface QuestPanelProps {
  quest: Quest;
  status: QuestStatus;
  onAccept: () => void;
  onComplete: () => void;
  onFail: (reason: string) => void;
  onReset: () => void;
}

export function QuestPanel({ quest, status, onAccept, onComplete, onFail, onReset }: QuestPanelProps) {
  return (
    <section className="panel quest-panel">
      <div className="panel-title">
        <span>Agent Layer</span>
        <em>rule-based now, LLM later</em>
      </div>
      <h2>{quest.title}</h2>
      <p>{quest.detail}</p>
      <div className="quest-meta">
        <span>{quest.type}</span>
        <span>EXP +{quest.rewardExp}</span>
        <span>{quest.deadlineLabel}</span>
      </div>
      <div className="quest-target">{quest.target}</div>
      <div className="action-row">
        {status === "draft" && <button type="button" onClick={onAccept}><Sparkles size={16} />수락</button>}
        {status === "accepted" && (
          <>
            <button type="button" onClick={onComplete}><CheckCircle2 size={16} />완료</button>
            <button className="danger" type="button" onClick={() => onFail("시간이 부족했다")}><XCircle size={16} />소멸</button>
          </>
        )}
        {(status === "done" || status === "failed") && <button type="button" onClick={onReset}><RotateCcw size={16} />다시 초안으로</button>}
      </div>
      {status === "failed" && (
        <div className="recovery-note">
          <strong>복구 퀘스트 생성됨</strong>
          <span>실패 이유를 앱 데이터로 남기고 다음 진행 강도를 낮춥니다.</span>
        </div>
      )}
    </section>
  );
}

export function ManagerPanel({ memory, world }: { memory: ManagerMemory; world: WorldState }) {
  return (
    <section className="panel manager-panel">
      <div className="panel-title">
        <span>Manager Memory</span>
        <em>{world.timeOfDay}</em>
      </div>
      <div className="manager-stats">
        <strong>Lv.{memory.level}</strong>
        <div><span style={{ width: `${memory.exp}%` }} /></div>
        <small>EXP {memory.exp} / 100</small>
      </div>
      <ul className="memory-list">
        {memory.preferredTimeBlocks.map((item) => <li key={item}>좋은 시간: {item}</li>)}
        {memory.avoidedTimeBlocks.map((item) => <li key={item}>피할 시간: {item}</li>)}
      </ul>
    </section>
  );
}

export function ThemeSwitcher({ activeTheme, onThemeChange }: { activeTheme: ThemeId; onThemeChange: (theme: ThemeId) => void }) {
  return (
    <div className="theme-switcher" aria-label="테마 선택">
      <button className={activeTheme === "xp" ? "active" : ""} type="button" onClick={() => onThemeChange("xp")}>Windows XP 셸</button>
      <button className={activeTheme === "lofi" ? "active" : ""} type="button" onClick={() => onThemeChange("lofi")}>픽셀 로파이 오두막</button>
    </div>
  );
}

export function ExpansionDock({ features }: { features: ExpansionFeature[] }) {
  const iconMap = [Sparkles, Mic, Video, MonitorPlay, Telescope];

  return (
    <section className="expansion-dock">
      <strong>확장 모듈</strong>
      {features.map((feature, index) => {
        const Icon = iconMap[index] ?? Sparkles;
        return (
          <article key={feature.id}>
            <Icon size={20} />
            <span>{feature.title}</span>
            <em>{feature.status}</em>
          </article>
        );
      })}
    </section>
  );
}

export function RewardShelf({ rewards }: { rewards: RewardItem[] }) {
  return (
    <section className="panel reward-panel">
      <div className="panel-title">
        <span>Reward Layer</span>
        <em>space remembers effort</em>
      </div>
      <div className="reward-grid">
        {rewards.map((reward) => (
          <article className={reward.unlocked ? "unlocked" : ""} key={reward.id}>
            <strong>{reward.name}</strong>
            <span>{reward.category}</span>
            <p>{reward.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SocialPanel({ shards, enabled }: { shards: SocialQuestShard[]; enabled: boolean }) {
  return (
    <section className="panel social-panel">
      <div className="panel-title">
        <span>Social Layer</span>
        <em>{enabled ? "탐색 가능" : "비공개"}</em>
      </div>
      <div className="policy-list">
        {socialPolicySummary.map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="shard-field">
        {enabled ? shards.map((shard) => <button className={shard.motif} key={shard.id} type="button">{shard.title}<small>{shard.ownerLabel}</small></button>) : <p>공개 퀘스트를 켜면 우주 조각 탐색이 열립니다.</p>}
      </div>
    </section>
  );
}

export function InputAndAssetPanel() {
  return (
    <section className="panel asset-panel">
      <div className="panel-title">
        <span>Input / Asset Pipeline</span>
        <em>future-safe slots</em>
      </div>
      <div className="capability-grid">
        {inputCapabilities.map((capability) => (
          <article key={capability.id}>
            <strong>{capability.label}</strong>
            <span>{capability.status}</span>
            <p>{capability.note}</p>
          </article>
        ))}
      </div>
      <div className="asset-prompts">
        {assetPrompts.map((asset) => (
          <details key={asset.id}>
            <summary>{asset.title}</summary>
            <p>{asset.prompt}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
