import styles from "./LegacyDeploymentNotice.module.css";

const CANONICAL_URL = "https://modu-brain-demo.onrender.com";

function LegacyDeploymentNotice() {
  if (!window.location.hostname.endsWith(".chatgpt.site")) return null;
  return (
    <aside className={styles.notice} aria-label="서비스 주소 변경 안내">
      <span>이 Sites 주소는 이전 안내용이며 곧 종료됩니다.</span>
      <a href={CANONICAL_URL}>공식 Render 서비스로 이동</a>
    </aside>
  );
}

export default LegacyDeploymentNotice;
