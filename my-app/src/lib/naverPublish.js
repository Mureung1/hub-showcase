export const NAVER_BLOG_WRITE_URL = "https://blog.naver.com/GoBlogWrite.naver";

// 반자동 발행 공통 로직 — 제목+본문을 클립보드에 복사하고 네이버 블로그 글쓰기
// 페이지를 새 탭으로 연다. 실제 게시는 사용자가 그 탭에서 직접 한다.
// 홍보글(SchedulePublish)/공지사항(NoticeResult) 양쪽에서 동일하게 쓴다.
//
// 사진은 여기서 같이 넣지 않는다 — 처음엔 text/html에 base64 이미지를 심어
// 한 번에 붙여넣기를 시도했지만, 네이버 에디터가 "허용되지 않는 이미지 형식"으로
// 거부해서(base64 인라인 이미지 자체를 안 받아주는 것으로 보임) 실패했다.
// 대신 copyImageToClipboard로 실제 이미지 파일을 별도로 복사해서 두 번째
// 붙여넣기로 넣는 방식을 쓴다 — 사진 앱에서 이미지를 복사해 붙여넣는 것과
// 동일한 경로라 에디터가 인식할 가능성이 훨씬 높다.
export async function publishToNaver(text) {
  let clipboardFailed = false;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    clipboardFailed = true;
  }
  const newTab = window.open(NAVER_BLOG_WRITE_URL, "_blank", "noopener,noreferrer");
  return { clipboardFailed, popupBlocked: !newTab };
}

// 클립보드 이미지 쓰기(ClipboardItem)는 브라우저가 PNG만 허용하는 경우가 많아
// (jpg 등은 "Type image/jpeg not supported on write" 에러) 캔버스를 거쳐
// PNG로 변환한다.
function fileToPngBlob(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (blob) resolve(blob);
        else reject(new Error("이미지 변환에 실패했습니다."));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    img.src = objectUrl;
  });
}

// 사진을 실제 이미지 클립보드 항목으로 복사한다 — 붙여넣기(Ctrl+V)하면 파일
// 탐색기/사진 앱에서 이미지를 복사해 붙여넣는 것과 같은 방식으로 들어간다.
export async function copyImageToClipboard(file) {
  if (!window.ClipboardItem) {
    throw new Error("이 브라우저는 이미지 클립보드 복사를 지원하지 않습니다.");
  }
  const pngBlob = await fileToPngBlob(file);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
}
