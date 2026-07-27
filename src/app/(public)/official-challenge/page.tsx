import Image from 'next/image';
import Link from 'next/link';
import { getCoreAdapter } from '../../../web/adapters/core/registry';
import { EmptyState } from '../../../web/components/empty-state';
import { ErrorState } from '../../../web/components/error-state';
import { OfficialCountdown } from '../../../web/components/client/official-countdown';
import { OfficialCheckoutButton } from '../../../web/components/client/official-checkout-button';
import { OfficialFaqDisclosure } from '../../../web/components/client/official-faq-disclosure';
import { OfficialSectionNav } from '../../../web/components/client/official-section-nav';
import styles from './official-challenge.module.css';

export const metadata = {
  title: '30일 집중 생존 스터디',
  description: '매일 30분의 집중과 한 번의 인증으로 공부가 계속되는 구조를 만드는 공식 챌린지입니다.',
};

const protocolSteps = [
  {
    number: '01',
    label: 'SIGNAL',
    title: '오늘의 목표 한 줄',
    body: '지금 끝낼 수 있는 크기로 목표를 줄입니다. 계획보다 시작 신호를 먼저 만듭니다.',
    time: '1 MIN',
  },
  {
    number: '02',
    label: 'FOCUS',
    title: '타이머를 켜고 30분',
    body: '강의, 책, 자격증, 개인 프로젝트 무엇이든 좋습니다. 단 하나의 목표에만 머뭅니다.',
    time: '30 MIN',
  },
  {
    number: '03',
    label: 'PROOF',
    title: '짧은 회고와 인증',
    body: '오늘 한 일을 한 문장으로 남기고 증빙을 제출하면 오늘의 생존 기록이 완성됩니다.',
    time: '2 MIN',
  },
] as const;

const chapters = [
  { day: 'DAY 01—03', title: '점화', body: '완벽한 계획 대신 책상에 앉는 신호를 만듭니다.', state: 'complete' },
  { day: 'DAY 04—10', title: '흔들림', body: '의욕이 줄어드는 날에도 같은 루프로 돌아옵니다.', state: 'complete' },
  { day: 'DAY 11—20', title: '전환', body: '시작이 결심이 아니라 익숙한 행동으로 바뀝니다.', state: 'current' },
  { day: 'DAY 21—30', title: '기록', body: '쌓인 집중 시간과 회고가 다음 목표의 근거가 됩니다.', state: 'upcoming' },
] as const;

export default async function OfficialChallengePage() {
  const result = await getCoreAdapter().getFeaturedOfficialChallenge();

  if (!result.ok) {
    return <main><ErrorState message="공식 챌린지 구성을 확인하는 중입니다." traceId={result.error.traceId} /></main>;
  }

  const challenge = result.value;
  if (!challenge) {
    return <main><EmptyState title="다음 공식 챌린지를 준비 중이에요" body="모집 일정이 확정되면 이 페이지에서 안내합니다." /></main>;
  }

  const joined = challenge.viewerState === 'joined' && challenge.participation;
  const price = `${challenge.price.amountMinor.toLocaleString('ko-KR')}원`;
  const statusLabel = challenge.status === 'recruiting' ? '지금 모집 중' : challenge.status === 'in-progress' ? '진행 중' : '모집 마감';

  return (
    <main className={styles.page}>
      <OfficialSectionNav />

      <section id="overview" className={styles.hero} aria-labelledby="official-hero-title">
        <Image
          className={styles.heroImage}
          src="/images/official-challenge/focus-core-complete.webp"
          alt=""
          fill
          priority
          sizes="55vw"
        />
        <div className={styles.heroVeil} />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.missionLabel}><span /> MISSION 001 · {statusLabel}</p>
            <p className={styles.heroOverline}>{challenge.title}</p>
            <h1 id="official-hero-title">
              <span>30일 후,</span>
              <span>공부를 계속하는</span>
              <em>사람이 되어라.</em>
            </h1>
            <p className={styles.heroDescription}>
              매일 {challenge.dailyMinutes}분의 집중과 한 번의 인증. 의지가 흔들리는 날에도 공부가 계속되는 구조를 만듭니다.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryCta} href="#join">30일 미션 참가하기 <span aria-hidden="true">↗</span></a>
              <a className={styles.secondaryCta} href="#daily-routine">진행 방식 보기 <span aria-hidden="true">↓</span></a>
            </div>
          </div>

          <div className={styles.coreStatus} aria-label="챌린지 핵심 정보">
            <div><span>CORE STATUS</span><strong>READY</strong></div>
            <div className={styles.statusLine}><i /><i /><i /><i /><i /></div>
            <p>완주한 미래를 먼저 확인하세요.<br />그 변화는 오늘의 작은 점화에서 시작됩니다.</p>
          </div>
        </div>

        <div className={styles.heroMetrics}>
          <div><span>DURATION</span><strong>30 DAYS</strong></div>
          <div><span>DAILY MISSION</span><strong>{challenge.dailyMinutes} MIN</strong></div>
          <div><span>ENTRY</span><strong>{price}</strong></div>
          <div className={styles.deadline}><span>RECRUITMENT</span><strong><OfficialCountdown endsAt={challenge.recruitmentEndsAt} now={challenge.now} /></strong></div>
        </div>
      </section>

      <section id="outcomes" className={styles.manifesto} aria-labelledby="outcomes-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionIndex}>01 / WHY IT STOPS</p>
          <h2 id="outcomes-title">공부가 멈춘 건<br /><em>의지가 부족해서가 아닙니다.</em></h2>
          <p>시작을 매일 새로 결정해야 했기 때문입니다. 이번에는 결심 대신 반복 가능한 구조를 남깁니다.</p>
        </div>

        <div className={styles.comparisonGrid}>
          <article className={styles.beforeCard}>
            <p>BEFORE / 혼자 할 때</p>
            <ol>
              <li><span>01</span><strong>목표만 크게 세운다</strong><small>시작 조건이 무겁습니다.</small></li>
              <li><span>02</span><strong>시작 시간을 미룬다</strong><small>매번 의지와 협상합니다.</small></li>
              <li><span>03</span><strong>한 일을 잊어버린다</strong><small>변화를 확인할 기록이 없습니다.</small></li>
            </ol>
          </article>
          <article className={styles.afterCard}>
            <p>AFTER / 생존 루프</p>
            <ol>
              <li><span>01</span><strong>오늘의 목표 한 줄</strong><small>지금 할 수 있는 크기로 줄입니다.</small></li>
              <li><span>02</span><strong>바로 30분 집중</strong><small>정해진 루프가 시작을 대신합니다.</small></li>
              <li><span>03</span><strong>매일 생존 기록 축적</strong><small>공부한 시간이 눈에 보입니다.</small></li>
            </ol>
          </article>
        </div>

        <blockquote>
          “{challenge.sections.outcomes[0]?.body ?? '매일 작게 시작하고 기록하는 구조로 학습 리듬을 만듭니다.'}”
        </blockquote>
      </section>

      <section id="for-whom" className={styles.dayOne} aria-labelledby="day-one-title">
        <Image
          className={styles.storyImage}
          src="/images/official-challenge/focus-core-day-01.webp"
          alt=""
          fill
          sizes="100vw"
        />
        <div className={styles.dayOneVeil} />
        <div className={styles.storyCopyRight}>
          <p className={styles.darkIndex}>02 / INITIAL SIGNAL</p>
          <p className={styles.dayPill}>DAY 01 · 3 / 30 SIGNALS</p>
          <h2 id="day-one-title">모든 변화는<br />단 한 번의 <em>점화</em>에서<br />시작됩니다.</h2>
          <p>{challenge.sections.forWhom[0]?.body}</p>
          <ul className={styles.fitList}>
            {challenge.sections.forWhom[0]?.items?.map((item) => <li key={item}><span>✓</span>{item}</li>)}
          </ul>
        </div>
      </section>

      <section id="daily-routine" className={styles.protocol} aria-labelledby="protocol-title">
        <div className={styles.sectionHeadingCompact}>
          <p className={styles.sectionIndex}>03 / DAILY PROTOCOL</p>
          <h2 id="protocol-title">하루 33분,<br /><em>세 번의 분명한 행동.</em></h2>
          <p>무엇을 해야 할지 고민하는 시간을 없앴습니다. 같은 순서로 시작하고, 집중하고, 기록합니다.</p>
        </div>

        <div className={styles.protocolGrid}>
          {protocolSteps.map((step) => (
            <article key={step.number} className={styles.protocolCard}>
              <div className={styles.protocolCardTop}><span>{step.number}</span><small>{step.time}</small></div>
              <p>{step.label}</p>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <div className={styles.cardSignal} aria-hidden="true"><i /><i /><i /><i /></div>
            </article>
          ))}
        </div>

        <div className={styles.protocolSummary}>
          <span>01:00</span><i />
          <span>30:00</span><i />
          <span>02:00</span>
          <strong>하루 총 33분이면 완료</strong>
        </div>
      </section>

      <section id="how-it-works" className={styles.midpoint} aria-labelledby="midpoint-title">
        <Image
          className={styles.storyImage}
          src="/images/official-challenge/focus-core-day-14.webp"
          alt=""
          fill
          sizes="100vw"
        />
        <div className={styles.midpointVeil} />
        <div className={styles.storyCopyLeft}>
          <p className={styles.darkIndex}>04 / THE TURNING POINT</p>
          <p className={styles.dayPill}>DAY 14 · CORE STABILIZING</p>
          <h2 id="midpoint-title">흔들림이<br /><em>루틴으로 바뀌는</em><br />순간.</h2>
          <p>절반쯤 왔을 때 의욕은 조용해집니다. 대신 어제와 같은 시간, 같은 순서, 같은 기록이 당신을 움직입니다.</p>
        </div>
      </section>

      <section className={styles.journey} aria-label="30일 여정">
        <div className={styles.journeyHead}>
          <p className={styles.sectionIndex}>30-DAY JOURNEY</p>
          <p>한 번의 결심이 아니라 네 개의 구간을 통과하는 변화입니다.</p>
        </div>
        <div className={styles.journeyLine} aria-hidden="true"><span /></div>
        <div className={styles.chapterGrid}>
          {chapters.map((chapter, index) => (
            <article key={chapter.day} className={styles[`chapter_${chapter.state}`]}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{chapter.day}</p>
              <h3>{chapter.title}</h3>
              <p>{chapter.body}</p>
            </article>
          ))}
        </div>
        <div className={styles.applicationSteps}>
          {challenge.sections.howItWorks.map((step, index) => (
            <div key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong></div>
          ))}
        </div>
      </section>

      <section id="verification" className={styles.verification} aria-labelledby="verification-title">
        <div className={styles.verificationCopy}>
          <p className={styles.sectionIndex}>05 / PROOF, NOT PRESSURE</p>
          <h2 id="verification-title">인증은 감시가 아니라<br /><em>내가 계속했다는 증거.</em></h2>
          <p>{challenge.sections.verification[0]?.body}</p>
          <ul>
            <li><span>01</span>온라인 강의, 책, 자격증, 개인 프로젝트 모두 인정</li>
            <li><span>02</span>증빙 파일은 공개되지 않고 검증에만 사용</li>
            <li><span>03</span>목표와 회고는 짧고 명확하게 기록</li>
          </ul>
        </div>

        <div className={styles.productMockup} aria-label="오늘의 인증 화면 예시">
          <div className={styles.mockupTopbar}>
            <span>SURVIVE / DAY 14</span><strong>● ALIVE</strong>
          </div>
          <div className={styles.timerPanel}>
            <div className={styles.timerRing}>
              <span>FOCUS</span><strong>30:00</strong><small>SESSION COMPLETE</small>
            </div>
          </div>
          <div className={styles.goalPanel}>
            <span>TODAY’S GOAL</span>
            <strong>React 상태 관리 1강 완료하기</strong>
            <small>✓ 목표 달성</small>
          </div>
          <div className={styles.proofRows}>
            <div><span>회고</span><strong>핵심 개념을 예제에 직접 적용했다.</strong><small>작성 완료</small></div>
            <div><span>증빙</span><strong>study_day14.png</strong><small>비공개</small></div>
          </div>
          <div className={styles.completeBar}><span>오늘의 생존 기록 완료</span><strong>14 / 30</strong></div>
        </div>
      </section>

      <section id="rewards" className={styles.rewards} aria-labelledby="rewards-title">
        <div className={styles.rewardCopy}>
          <p className={styles.sectionIndex}>06 / WHAT REMAINS</p>
          <h2 id="rewards-title">완주 뒤에 남는 건<br />배지보다 선명한<br /><em>나의 학습 데이터.</em></h2>
          <p>{challenge.sections.rewards[0]?.body}</p>
          <div className={styles.rewardStats}>
            <div><strong>30</strong><span>생존 기록</span></div>
            <div><strong>18.7H</strong><span>누적 집중</span></div>
            <div><strong>100%</strong><span>완주율</span></div>
          </div>
        </div>

        <div className={styles.reportCard}>
          <div className={styles.reportHeader}><span>SURVIVAL REPORT</span><strong>SEASON 001</strong></div>
          <div className={styles.reportScore}>
            <span>FINAL RECORD</span><strong>30<small>/30</small></strong><p>MISSION COMPLETE</p>
          </div>
          <div className={styles.reportBars}>
            {[92, 78, 100, 86, 96, 88, 100, 82, 94, 100, 90, 97].map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className={styles.reportMeta}>
            <div><span>BEST STREAK</span><strong>30 DAYS</strong></div>
            <div><span>FOCUS TIME</span><strong>18H 42M</strong></div>
            <div><span>STATUS</span><strong>SURVIVOR</strong></div>
          </div>
          <div className={styles.badge}><span>S/S</span><strong>SURVIVOR<br />001</strong></div>
        </div>
      </section>

      <section id="schedule" className={styles.schedule} aria-labelledby="schedule-title">
        <div className={styles.scheduleIntro}>
          <p className={styles.sectionIndex}>07 / SCHEDULE & RULES</p>
          <h2 id="schedule-title">시작하기 전에<br />필요한 정보만.</h2>
          <p>모집부터 완주까지의 흐름과 매일 지켜야 할 기준을 한눈에 확인하세요.</p>
        </div>
        <dl className={styles.scheduleList}>
          {challenge.sections.schedule.map((item, index) => (
            <div key={item.label}><dt><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</dt><dd>{item.value}</dd></div>
          ))}
          <div><dt><span>04</span>인증 범위</dt><dd>강의 · 독서 · 자격증 · 프로젝트</dd></div>
          <div><dt><span>05</span>참가 비용</dt><dd>{price} · 최대 {challenge.price.maxPointDiscount.toLocaleString('ko-KR')}P 사용</dd></div>
        </dl>
      </section>

      <section id="faq" className={styles.faq} aria-labelledby="faq-title">
        <div>
          <p className={styles.sectionIndex}>08 / FAQ</p>
          <h2 id="faq-title">참가 전에<br />확인해 주세요.</h2>
        </div>
        <OfficialFaqDisclosure items={challenge.sections.faq} />
      </section>

      <section id="join" className={styles.join} aria-labelledby="join-title">
        <Image
          className={styles.joinImage}
          src="/images/official-challenge/focus-core-complete.webp"
          alt=""
          fill
          sizes="48vw"
        />
        <div className={styles.joinVeil} />
        <div className={styles.joinCopy}>
          <p className={styles.darkIndex}>09 / ENTER THE PROTOCOL</p>
          <h2 id="join-title">내일이 아니라,<br /><em>오늘 살아남기.</em></h2>
          <p>첫 목표를 정하는 데는 1분이면 충분합니다.<br />30일 뒤에는 계속해 온 기록이 남습니다.</p>
          <div className={styles.joinSpecs}>
            <div><span>기간</span><strong>30일</strong></div>
            <div><span>매일</span><strong>{challenge.dailyMinutes}분</strong></div>
            <div><span>방식</span><strong>당일 인증</strong></div>
          </div>
        </div>

        <aside className={styles.checkoutCard} aria-label="챌린지 참가 신청">
          <div className={styles.checkoutTop}><span>OFFICIAL / 001</span><span>{statusLabel}</span></div>
          <p>30일 집중 생존 스터디</p>
          <strong className={styles.checkoutPrice}>{price}</strong>
          <ul>
            <li>2026년 8월 1일 시작</li>
            <li>매일 {challenge.dailyMinutes}분 집중 및 인증</li>
            <li>30일 개인 완주 리포트</li>
          </ul>
          <div className={styles.checkoutDeadline}><span>모집 마감</span><OfficialCountdown endsAt={challenge.recruitmentEndsAt} now={challenge.now} /></div>
          {joined ? (
            <Link className={styles.checkoutAction} href={`/study/${challenge.participation?.participationId}`}>오늘 학습하러 가기 <span>↗</span></Link>
          ) : challenge.status === 'recruiting' ? (
            <OfficialCheckoutButton maxPointDiscount={challenge.price.maxPointDiscount} />
          ) : (
            <p className={styles.closedMessage}>현재 참가 신청이 마감되었습니다.</p>
          )}
          <small>결제 전 최종 금액과 포인트 사용 내역을 확인할 수 있습니다.</small>
        </aside>
      </section>
    </main>
  );
}
