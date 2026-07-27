// 유튜브 워치 페이지 HTML의 og:video:width/height 메타 태그로 영상의 실제 가로세로 비율을 가져온다.
// 처음엔 oEmbed API(width/height 값)를 썼는데, 실측해보니 oEmbed는 영상 내용과 무관하게
// 요청 URL 형식(watch면 항상 200x113, shorts면 항상 113x200)만 보고 고정값을 돌려줘서
// 세로/가로 판별에 쓸 수 없었다 — og:video 메타 태그는 실제 영상 해상도를 반영해서 정확함.
export async function fetchYoutubeVideoDimensions(videoId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!res.ok) {
    const error = new Error('유튜브 페이지를 가져오지 못했습니다.')
    error.status = res.status
    throw error
  }

  const html = await res.text()
  const width = html.match(/property="og:video:width" content="(\d+)"/)?.[1]
  const height = html.match(/property="og:video:height" content="(\d+)"/)?.[1]

  if (!width || !height) {
    throw new Error('영상 크기 정보를 찾을 수 없습니다.')
  }

  return { width: Number(width), height: Number(height) }
}
