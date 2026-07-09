import { useState } from 'react';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Row, Button, WarningBanner, Slider } from '../../components';
import text from '../../styles/text.module.css';
import { formatHourValue } from '../../utils/time';

// TODO(동적 데이터, docs/디자인.md 9번): 초기값은 계산 엔진이 추천한 스케줄로 채워야 한다.
export function AdjustPage() {
  const [sleepAt, setSleepAt] = useState(23.5);
  const [wakeAt, setWakeAt] = useState(5.5);
  const [caffeineMg, setCaffeineMg] = useState(100);
  const [caffeineAt, setCaffeineAt] = useState(6);

  const nearLimit = caffeineMg >= 150; // TODO: 실제로는 오늘 총 섭취량 + 개인별 한도로 판단해야 함(6.3장)

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
          <Button to="/processing" variant="primary">
            재계산하기
          </Button>
        </>
      }
    >
      <h1 className={text.headline}>월요일 스케줄 조정</h1>
      <p className={text.subtext} style={{ marginBottom: 18 }}>
        직접 조정한 조건으로 다시 계산해요. 다른 날짜는 목록에서 선택하세요.
      </p>

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
            max={200}
            step={10}
            suffix="mg"
            bounds={['0mg', '200mg']}
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
          <Row icon="🌙" iconVariant="sleep" title="최소 수면시간" value="4시간" />
        </Card>
      </div>
    </AppShell>
  );
}
