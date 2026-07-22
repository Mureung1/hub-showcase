import React from 'react';
import { motion } from 'framer-motion';
import type { Cell } from '../engine';
import { fmtCellValue } from './formatters';
import styles from './AnsweredRow.module.css';

interface AnsweredRowProps {
  cell: Cell;
  onEdit: (id: string) => void;
}

export const AnsweredRow: React.FC<AnsweredRowProps> = ({ cell, onEdit }) => {
  const clickable = !cell.isGate;
  return (
    <motion.button
      type="button"
      layout
      layoutId={cell.id}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={[styles.row, cell.isGate ? styles.gate : ''].join(' ')}
      onClick={clickable ? () => onEdit(cell.id) : undefined}
      disabled={!clickable}
    >
      <span className={styles.label}>{cell.isGate ? cell.title : cell.label}</span>
      <span className={styles.value}>{fmtCellValue(cell)}</span>
      {clickable && <span className={styles.edit}>✎</span>}
    </motion.button>
  );
};
