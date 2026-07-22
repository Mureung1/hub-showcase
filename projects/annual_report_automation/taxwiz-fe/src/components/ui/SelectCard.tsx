import React from 'react';
import styles from './SelectCard.module.css';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

interface SelectCardProps {
  option: SelectOption;
  selected: boolean;
  onClick: () => void;
}

export const SelectCard: React.FC<SelectCardProps> = ({ option, selected, onClick }) => {
  return (
    <button
      type="button"
      className={[styles.card, selected ? styles.selected : ''].join(' ')}
      onClick={onClick}
      aria-pressed={selected}
    >
      {option.icon && <span className={styles.icon}>{option.icon}</span>}
      <div className={styles.content}>
        <span className={styles.label}>{option.label}</span>
        {option.description && (
          <span className={styles.description}>{option.description}</span>
        )}
      </div>
      <span className={styles.indicator} aria-hidden="true" />
    </button>
  );
};
