import { AnimatePresence, motion } from 'framer-motion';

// 로그인/회원가입/코스저장/자동추천 등 모든 모달이 공유하는 오버레이 래퍼. design.md: modal-wrap + modal 클래스 재사용.
// 등장/사라짐은 마운트·언마운트가 걸린 애니메이션이라 uianimation.md 기준대로 Framer Motion을 쓴다
// (idle/호버/클릭 즉시반응은 CSS, 요소가 생기고 없어지는 순간만 Framer Motion).
export default function Modal({ open, onClose, children, width, className }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-wrap"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={`modal${className ? ` ${className}` : ''}`}
            style={width ? { width } : undefined}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
