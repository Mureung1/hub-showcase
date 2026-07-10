import { BRAND } from "../config";
import { MountainIcon } from "./Icons";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <span className="brand">
            <span className="brand-logo" aria-hidden="true">
              <MountainIcon size={20} />
            </span>
            <span>
              <span className="brand-name">{BRAND.nameKo}</span>{" "}
              <span className="brand-en">{BRAND.nameEn}</span>
            </span>
          </span>
          <p>
            바코드 스캔 재고·유통기한 관리 프로젝트. 히말라야에서 짐을 대신
            짊어지고 길을 안내하는 셰르파처럼, 사장님의 재고 관리 부담을 대신
            짊어집니다.
          </p>
        </div>

        <div className="footer-meta">
          {/* 팀/발표 정보 자리 (플레이스홀더 — config.js에서 수정) */}
          <p className="tag">{BRAND.team}</p>
          <p>{BRAND.event}</p>
        </div>
      </div>

      <div className="container">
        <p className="footer-copy">
          © {BRAND.year} {BRAND.nameKo} ({BRAND.nameEn}) · 아이디어 소개용
          페이지입니다.
        </p>
      </div>
    </footer>
  );
}
