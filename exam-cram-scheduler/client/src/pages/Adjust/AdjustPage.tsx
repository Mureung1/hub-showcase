import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Row, Button, WarningBanner, Slider, Segmented } from '../../components';
import text from '../../styles/text.module.css';
import { formatHourValue } from '../../utils/time';
import { useSchedule } from '../../context/ScheduleContext';
import type { NightOverrideInput } from '../../api/calculateSchedule';
import { formatKstDate } from '../Result/formatSchedule';

const MS_PER_HOUR = 60 * 60 * 1000;

/** ISO 시각 -> 한국 시간 기준 "몇 시 몇 분"을 소수 시간으로(예: "23:30" -> 23.5) */
function kstHourDecimal(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour + minute / 60;
}

/**
 * 슬라이더 값 스케일로 맞춘다. 취침 슬라이더(22~26)처럼 자정을 넘겨 "다음날 새벽"으로
 * 표현해야 하는 경우, 실제 시각이 wrapBelow보다 이르면(예: 00:30 -> 0.5) 24를 더해
 * 슬라이더 범위 안 값(24.5)으로 바꿔준다.
 */
function toSliderHour(iso: string, wrapBelow: number): number {
  const raw = kstHourDecimal(iso);
  return raw < wrapBelow ? raw + 24 : raw;
}

/** referenceIso를 슬라이더에서 사용자가 옮긴 만큼(시간 단위)만 밀어서 새 ISO 시각을 만든다 */
function shiftIso(referenceIso: string, deltaHours: number): string {
  return new Date(new Date(referenceIso).getTime() + deltaHours * MS_PER_HOUR).toISOString();
}

// #20 — 슬라이더 초기값은 조정 대상으로 고른 밤의 추천 스케줄로 채우고, "재계산하기"는
// 그 밤만 조정값으로 고정한 nightOverrides 1건을 담아 다시 계산을 요청한다.
export function AdjustPage() {
  const { request, response, setRequest } = useSchedule();
  const navigate = useNavigate();

  const nights = response?.recommendedSchedule.nights ?? [];
  const doses = response?.recommendedSchedule.caffeineDoses ?? [];

  const [nightIndex, setNightIndex] = useState(0);
  const [sleepAt, setSleepAt] = useState(23.5);
  const [wakeAt, setWakeAt] = useState(5.5);
  const [caffeineMg, setCaffeineMg] = useState(100);
  const [caffeineAt, setCaffeineAt] = useState(6);

  // 계산 없이 주소로 직접 들어온 경우 — 조정할 추천 스케줄이 없으므로 결과 화면으로 돌려보낸다.
  useEffect(() => {
    if (request === null || response === null) {
      navigate('/result', { replace: true });
    }
  }, [request, response, navigate]);

  // 조정 대상 밤이 바뀌면(처음 진입 포함) 슬라이더를 그 밤의 추천값으로 채운다.
  useEffect(() => {
    const night = nights[nightIndex];
    const dose = doses[nightIndex];
    if (!night) return;
    setSleepAt(toSliderHour(night.bedTime, 22));
    setWakeAt(toSliderHour(night.wakeTime, 0));
    if (dose) {
      setCaffeineMg(dose.amountMg);
      setCaffeineAt(toSliderHour(dose.time, 0));
    }
    // response가 바뀌어도(재계산 후 다시 조정) 최신 추천값으로 다시 채워야 하므로 함께 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightIndex, response]);

  if (request === null || response === null || nights.length === 0) {
    return null;
  }

  const night = nights[nightIndex];
  const dose = doses[nightIndex];
  const nearLimit = caffeineMg >= 150; // TODO: 실제로는 오늘 총 섭취량 + 개인별 한도로 판단해야 함(6.3장)

  function handleRecalculate() {
    if (request === null) return;

    const override: NightOverrideInput = {
      nightIndex,
      bedTime: shiftIso(night.bedTime, sleepAt - toSliderHour(night.bedTime, 22)),
      wakeTime: shiftIso(night.wakeTime, wakeAt - toSliderHour(night.wakeTime, 0)),
      caffeineAmountMg: caffeineMg,
      ...(dose ? { caffeineTime: shiftIso(dose.time, caffeineAt - toSliderHour(dose.time, 0)) } : {}),
    };

    setRequest({ ...request, nightOverrides: [override] });
    navigate('/processing');
  }

  return (
    <AppShell
      title="스케줄 조정"
      step={5}
      backTo="/result"
      footer={
        <>
          <Button to="/result" variant="secondary">
            취소
          </Button>
          <Button variant="primary" onClick={handleRecalculate}>
            재계산하기
          </Button>
        </>
      }
    >
      <h1 className={text.headline}>{formatKstDate(night.wakeTime)} 스케줄 조정</h1>
      <p className={text.subtext} style={{ marginBottom: 18 }}>
        직접 조정한 조건으로 다시 계산해요. 다른 날짜는 아래에서 선택하세요.
      </p>

      {nights.length > 1 && (
        <div style={{ marginBottom: 18 }}>
          <Segmented
            options={nights.map((n, i) => ({ label: formatKstDate(n.wakeTime), value: String(i) }))}
            value={String(nightIndex)}
            onChange={(value) => setNightIndex(Number(value))}
          />
        </div>
      )}

      <Card>
        <Slider
          name="취침 시각"
          value={sleepAt}
          min={22}
          max={26}
          step={0.5}
          bounds={['22:00', '02:00']}
          formatValue={formatHourValue}
          onChange={setSleepAt}
        />
        <div style={{ marginTop: 22 }}>
          <Slider
            name="기상 시각"
            value={wakeAt}
            min={4}
            max={8}
            step={0.5}
            bounds={['04:00', '08:00']}
            formatValue={formatHourValue}
            onChange={setWakeAt}
          />
        </div>
        <div style={{ marginTop: 22 }}>
          <Slider
            name="카페인 섭취량"
            value={caffeineMg}
            min={0}
            max={300}
            step={10}
            suffix="mg"
            bounds={['0mg', '300mg']}
            onChange={setCaffeineMg}
          />
        </div>
        <div style={{ marginTop: 22 }}>
          <Slider
            name="카페인 섭취 시각"
            value={caffeineAt}
            min={4}
            max={9}
            step={0.5}
            bounds={['04:00', '09:00']}
            formatValue={formatHourValue}
            onChange={setCaffeineAt}
          />
        </div>
      </Card>

      {nearLimit && <WarningBanner>조정한 카페인 용량이 오늘 안전 섭취 한도(400mg)에 가까워요.</WarningBanner>}

      <div className={`${text.sectionBlock} ${text.sectionBlockTight}`}>
        <div className={text.sectionHead}>
          <span className={text.label}>최소 수면시간</span>
          <span className={text.meta}>정보 입력에서 설정</span>
        </div>
        <Card>
          <Row
            icon="🌙"
            iconVariant="sleep"
            title="최소 수면시간"
            value={request.minSleepHours ? `${request.minSleepHours}시간` : '설정 안 함'}
          />
        </Card>
      </div>
    </AppShell>
  );
}
