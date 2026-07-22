import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import styles from './Tooltip.module.css';

interface TooltipProps {
  content: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="용어 설명 보기"
        onClick={() => setVisible((v) => !v)}
      >
        <HelpCircle size={16} />
      </button>
      {visible && (
        <>
          <div className={styles.backdrop} onClick={() => setVisible(false)} />
          <div className={styles.bubble} role="tooltip">
            {content}
          </div>
        </>
      )}
    </span>
  );
};
