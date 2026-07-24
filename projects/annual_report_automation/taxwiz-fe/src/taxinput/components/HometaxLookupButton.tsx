import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { startHometaxGuide } from '../../lib/hometaxExtension';
import styles from './HometaxLookupButton.module.css';

interface HometaxLookupButtonProps {
  goal: string;
  status?: 'validated' | 'experimental';
}

/** 준비물 카드의 홈택스 관련 항목 옆에 붙는 버튼 — 클릭하면 hometax guide-extension이
 *  설치돼 있는지 확인하고, 있으면 해당 목표로 홈택스 가이드를 자동 실행한다. */
export const HometaxLookupButton: React.FC<HometaxLookupButtonProps> = ({ goal, status }) => {
  const [state, setState] = useState<'idle' | 'checking' | 'unavailable'>('idle');

  const handleClick = async () => {
    setState('checking');
    const result = await startHometaxGuide(goal);
    setState(result.ok ? 'idle' : 'unavailable');
  };

  return (
    <span className={styles.wrapper}>
      <Button type="button" variant="ghost" size="sm" onClick={handleClick} loading={state === 'checking'}>
        <ExternalLink size={14} /> 홈택스에서 찾기{status === 'experimental' && ' · 베타'}
      </Button>
      {state === 'unavailable' && (
        <>
          <div className={styles.backdrop} onClick={() => setState('idle')} />
          <div className={styles.bubble} role="tooltip">
            확장 프로그램이 필요해요 — 아직 배포되지 않은 개발자용 크롬 확장 프로그램이에요.
          </div>
        </>
      )}
    </span>
  );
};
