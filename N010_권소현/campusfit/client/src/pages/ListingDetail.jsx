import { Link, useOutletContext, useParams } from "react-router-dom";
import CardNewsThumb from "../components/CardNewsThumb";
import BookmarkStar from "../components/BookmarkStar";
import { formatDDay, isRolling } from "../utils/dday";

export default function ListingDetail() {
  const { listingId } = useParams();
  const { bookmarks, toggleBookmark, categories, listings } = useOutletContext();
  const listing = listings.find((l) => l.id === listingId);
  const category = categories.find((c) => c.id === listing.categoryId);

  return (
    <div className="detail">
      <p className="crumb">
        <Link to="/">홈</Link> / <Link to={`/category/${category.id}`}>{category.label}</Link>
      </p>
      <div className="detail-meta">
        <span className={listing.dDay <= 7 ? "pill-alert" : "pill-neutral"}>{formatDDay(listing.dDay)}</span>
        <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>{listing.desc}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{listing.title}</h1>
        <BookmarkStar
          active={bookmarks.includes(listing.id)}
          onClick={() => toggleBookmark(listing.id)}
          size={26}
        />
      </div>
      <CardNewsThumb
        categoryId={category.id}
        categoryLabel={category.label}
        interest={listing.interest}
        title={listing.title}
        dDay={listing.dDay}
      />
      <p className="body-txt">
        {listing.eligibleRegions || listing.eligibleGrades ? (
          <>
            {listing.desc} 조건에 해당하는 분들을 위한 {category.label} 정보예요. 지원 자격을 다시
            확인하고, 마감 전에 공식 페이지에서 신청을 완료해주세요.
          </>
        ) : (
          <>
            {category.label} 정보예요. 아래 내용을 보고 지원 자격에 해당하는지 직접 확인한 뒤,
            마감 전에 공식 페이지에서 신청을 완료해주세요.
          </>
        )}
      </p>
      <div className="info-box">
        <p className="info-title">한눈에 정리</p>
        <div className="info-row">
          <span className="k">대상</span>
          <span className="v">{listing.desc}</span>
        </div>
        <div className="info-row">
          <span className="k">지원내용</span>
          <span className="v">
            {category.label} · {listing.title}
          </span>
        </div>
        <div className="info-row">
          <span className="k">신청기간</span>
          <span className="v">{isRolling(listing.dDay) ? "마감일 미정" : `마감 D-${listing.dDay}`}</span>
        </div>
        <div className="info-row">
          <span className="k">신청방법</span>
          <span className="v">공식 페이지에서 온라인 접수</span>
        </div>
      </div>
      {listing.sourceUrl ? (
        <a className="btn-outline" href={listing.sourceUrl} target="_blank" rel="noopener noreferrer">
          공식 페이지에서 지원하기 ↗
        </a>
      ) : (
        <a className="btn-outline" href="#" onClick={(e) => e.preventDefault()}>
          공식 페이지에서 지원하기 ↗
        </a>
      )}
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)", margin: "10px 0 0" }}>
        마감일은 공공데이터 기준이라 기관 사정으로 조기 마감됐을 수 있어요. 지원 전에 공식
        페이지에서 한 번 더 확인해주세요.
      </p>
      {(listing.teamBoardCount > 0 || listing.categoryId === "activity") && (
        <Link className="btn-team" to={`/board/listing/${listing.id}`}>
          팀원 모집하기
        </Link>
      )}
    </div>
  );
}
